import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(desktopDir, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');

const runtimeKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'ADMIN_EMAILS',
  'APP_ORIGIN',
  'ENABLE_ADMIN_DIAGNOSTICS',
];

function parseEnvFile(contents) {
  const values = {};

  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (!match || match[1].startsWith('#')) continue;

    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[match[1]] = value;
  }

  return values;
}

async function readEnvFile(fileName) {
  const filePath = path.join(projectRoot, fileName);
  if (!existsSync(filePath)) return {};
  return parseEnvFile(await readFile(filePath, 'utf8'));
}

async function loadBuildEnvironment() {
  // Match Next.js' useful local-file precedence while still allowing CI/CD to
  // provide values through the process environment.
  const values = {
    ...(await readEnvFile('.env')),
    ...(await readEnvFile('.env.production')),
    ...(await readEnvFile('.env.local')),
    ...(await readEnvFile('.env.production.local')),
  };

  for (const key of runtimeKeys) {
    if (process.env[key] !== undefined) values[key] = process.env[key];
  }

  return Object.fromEntries(
    runtimeKeys
      .filter((key) => values[key] !== undefined && values[key] !== '')
      .map((key) => [key, values[key]])
  );
}

async function copyRuntimeAsset(source, target) {
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, force: true });
}

if (!existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error(
    'Missing .next/standalone/server.js. Run "npm run build" before preparing the desktop bundle.'
  );
}

const requiredKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'ADMIN_EMAILS'];
const runtimeEnvironment = await loadBuildEnvironment();
const missingKeys = requiredKeys.filter((key) => !runtimeEnvironment[key]);

if (missingKeys.length > 0) {
  throw new Error(
    `Desktop build is missing required environment variables: ${missingKeys.join(', ')}. ` +
      'Set them in the build environment or in .env.local (never commit that file).'
  );
}

await copyRuntimeAsset(
  path.join(projectRoot, 'public'),
  path.join(standaloneDir, 'public')
);
await copyRuntimeAsset(
  path.join(projectRoot, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static')
);
await copyRuntimeAsset(
  path.join(projectRoot, 'preview'),
  path.join(standaloneDir, 'preview')
);

await writeFile(
  path.join(standaloneDir, 'runtime-env.json'),
  `${JSON.stringify(runtimeEnvironment, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o600 }
);

console.log(
  `Prepared standalone desktop server in ${path.relative(projectRoot, standaloneDir)} ` +
    `(assets: public, .next/static, preview; env keys: ${Object.keys(runtimeEnvironment).join(', ')})`
);
