/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods for auto-update
contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-update methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('update-not-available', subscription);
    return () => ipcRenderer.removeListener('update-not-available', subscription);
  },
  onUpdateDownloading: (callback) => {
    const subscription = (_event, progress) => callback(progress);
    ipcRenderer.on('update-downloading', subscription);
    return () => ipcRenderer.removeListener('update-downloading', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  onUpdateError: (callback) => {
    const subscription = (_event, error) => callback(error);
    ipcRenderer.on('update-error', subscription);
    return () => ipcRenderer.removeListener('update-error', subscription);
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
