/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createWriteStream } = require('node:fs');
const { existsSync } = require('node:fs');
const { readFile } = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const START_PATH = '/admin';
const STARTUP_TIMEOUT_MS = 30_000;

let nextServerProcess = null;
let nextServerLog = null;
let serverUrl = null;
let mainWindow = null;
let isQuitting = false;

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Configure update logger
if (!app.isPackaged) {
  autoUpdater.logger = console;
  autoUpdater.logger.transports = {
    file: { level: 'info' }
  };
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  }
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloading', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version,
    });
  }
});

autoUpdater.on('error', (error) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', {
      message: error.message,
    });
  }
});

// IPC handlers for auto-update
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { error: 'Updates are only available in production builds' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  if (!app.isPackaged) {
    return { error: 'Updates are only available in production builds' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

function getServerRoot() {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), '.next', 'standalone');
  }

  // The standalone server is deliberately unpacked: Next's generated
  // server.js calls process.chdir(), which cannot target an asar directory.
  const unpackedRoot = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    '.next',
    'standalone',
  );
  if (existsSync(path.join(unpackedRoot, 'server.js'))) return unpackedRoot;

  // Useful for package-manager smoke tests where asar is disabled.
  return path.join(app.getAppPath(), '.next', 'standalone');
}

async function readJson(filePath) {
  if (!existsSync(filePath)) return {};

  try {
    const value = JSON.parse(await readFile(filePath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    throw new Error(`Не удалось прочитать ${filePath}: ${error.message}`);
  }
}

async function loadRuntimeEnvironment(serverRoot) {
  const packagedEnvironment = await readJson(path.join(serverRoot, 'runtime-env.json'));
  const userConfigPath = path.join(app.getPath('userData'), 'config.json');
  const userEnvironment = await readJson(userConfigPath);

  const allowedKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'ADMIN_EMAILS',
    'APP_ORIGIN',
    'ENABLE_ADMIN_DIAGNOSTICS',
  ];

  const environment = {};
  for (const key of allowedKeys) {
    const value = userEnvironment[key] ?? packagedEnvironment[key];
    if (typeof value === 'string' && value.length > 0) environment[key] = value;
  }

  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'ADMIN_EMAILS',
  ];
  const missingKeys = requiredKeys.filter((key) => !environment[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Не заданы обязательные параметры: ${missingKeys.join(', ')}. ` +
        `Их можно указать в файле ${userConfigPath}.`,
    );
  }

  return { environment, userConfigPath };
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, HOST, () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : null;
      probe.close((closeError) => {
        if (closeError) reject(closeError);
        else if (!port) reject(new Error('Не удалось выбрать локальный порт.'));
        else resolve(port);
      });
    });
  });
}

function waitForPort(port, child) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let activeSocket = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (activeSocket) activeSocket.destroy();
      child.removeListener('exit', onExit);
      if (error) reject(error);
      else resolve();
    };

    const onExit = (code, signal) => {
      finish(new Error(`Встроенный сервер завершился до запуска (код ${code ?? '—'}, сигнал ${signal ?? '—'}).`));
    };

    const check = () => {
      if (settled) return;
      if (Date.now() - startedAt > STARTUP_TIMEOUT_MS) {
        finish(new Error(`Встроенный сервер не запустился за ${STARTUP_TIMEOUT_MS / 1000} секунд.`));
        return;
      }

      const socket = net.createConnection({ host: HOST, port });
      activeSocket = socket;
      let retryScheduled = false;
      const retry = () => {
        if (retryScheduled || settled) return;
        retryScheduled = true;
        socket.destroy();
        timer = setTimeout(check, 100);
      };
      socket.once('connect', () => {
        activeSocket = null;
        socket.destroy();
        finish();
      });
      socket.once('error', retry);
      socket.setTimeout(500, retry);
    };

    child.once('exit', onExit);
    check();
  });
}

function openServerLog() {
  try {
    const logDirectory = app.getPath('logs');
    nextServerLog = createWriteStream(path.join(logDirectory, 'next-server.log'), { flags: 'a' });
    nextServerLog.write(`\n--- CMS Admin server ${new Date().toISOString()} ---\n`);
  } catch {
    nextServerLog = null;
  }
}

async function startNextServer() {
  const serverRoot = getServerRoot();
  const serverPath = path.join(serverRoot, 'server.js');
  if (!existsSync(serverPath)) {
    throw new Error(`Не найден production-сервер: ${serverPath}. Сначала выполните desktop:prepare.`);
  }

  const { environment, userConfigPath } = await loadRuntimeEnvironment(serverRoot);
  const port = await findFreePort();
  const origin = `http://${HOST}:${port}`;

  // APP_ORIGIN is used by the mutation-origin guard. A packaged app always
  // talks to its private loopback server, so a cloud/web origin (or a stale
  // local port from a previous launch) would reject valid Server Actions.
  const appOrigin = origin;

  const childEnvironment = {
    ...process.env,
    ...environment,
    NODE_ENV: 'production',
    HOSTNAME: HOST,
    PORT: String(port),
    APP_ORIGIN: appOrigin,
    NEXT_TELEMETRY_DISABLED: '1',
    ELECTRON_RUN_AS_NODE: '1',
  };

  openServerLog();
  nextServerProcess = spawn(process.execPath, [serverPath], {
    cwd: serverRoot,
    env: childEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  if (nextServerLog) {
    nextServerProcess.stdout.pipe(nextServerLog, { end: false });
    nextServerProcess.stderr.pipe(nextServerLog, { end: false });
  }

  nextServerProcess.once('error', (error) => {
    if (!isQuitting) console.error('Next.js server process error:', error);
  });

  await waitForPort(port, nextServerProcess);
  serverUrl = origin;

  return { origin, userConfigPath };
}

function stopNextServer() {
  const child = nextServerProcess;
  nextServerProcess = null;

  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    setTimeout(() => {
      // ChildProcess#killed only means that a signal was sent successfully;
      // use exitCode/signalCode to detect a server that is still alive.
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }, 2_000).unref();
  }

  if (nextServerLog) {
    nextServerLog.end();
    nextServerLog = null;
  }
}

function isLocalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && parsed.hostname === HOST && parsed.origin === serverUrl;
  } catch {
    return false;
  }
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      void shell.openExternal(parsed.toString());
    }
  } catch {
    // Ignore malformed or non-web URLs instead of handing them to the OS.
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // The renderer only loads the Next.js UI and does not need Node or a
      // preload bridge. Keep Chromium's renderer sandbox enabled so a page
      // compromise cannot escape into the local desktop process.
      sandbox: true,
      devTools: true, // TEMPORARY: Always enable DevTools for diagnostic
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isLocalUrl(url)) openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isLocalUrl(url)) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // TEMPORARY: Auto-open DevTools for diagnostic
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function boot() {
  const { origin } = await startNextServer();
  const window = createMainWindow();
  await window.loadURL(`${origin}${START_PATH}`);

  // Check for updates after app is ready (only in production)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        console.error('Auto-update check failed:', error);
      });
    }, 3000); // Delay to let the app fully load first
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => boot()).catch((error) => {
    console.error(error);
    dialog.showErrorBox('CMS Admin', error instanceof Error ? error.message : String(error));
    app.quit();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopNextServer();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null && serverUrl) {
      void createMainWindow().loadURL(`${serverUrl}${START_PATH}`);
    }
  });
}
