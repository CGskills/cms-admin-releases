#!/usr/bin/env node

/**
 * Test Electron Launch
 * Запускает Electron с подробным логированием для диагностики проблем с UI
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Electron with detailed logging...');
console.log('📂 Working directory:', process.cwd());
console.log('⏰ Time:', new Date().toISOString());
console.log('');

// Проверка что .next/standalone существует
import { existsSync } from 'fs';
const standalonePath = path.join(process.cwd(), '.next', 'standalone', 'server.js');
if (!existsSync(standalonePath)) {
  console.error('❌ ERROR: .next/standalone/server.js not found!');
  console.error('   Run: npm run build && npm run desktop:prepare');
  process.exit(1);
}
console.log('✅ Found standalone server at:', standalonePath);
console.log('');

// Запуск Electron с включенными DevTools
const env = {
  ...process.env,
  ENABLE_DEVTOOLS: '1',
  ELECTRON_ENABLE_LOGGING: '1',
};

console.log('🔧 Environment:');
console.log('   ENABLE_DEVTOOLS=1');
console.log('   ELECTRON_ENABLE_LOGGING=1');
console.log('');

const electronPath = path.join(process.cwd(), 'node_modules', '.bin', 'electron.cmd');
const mainPath = path.join(process.cwd(), 'desktop', 'main.cjs');

console.log('📝 Launching:');
console.log('   Electron:', electronPath);
console.log('   Main:', mainPath);
console.log('');

const child = spawn(electronPath, ['.'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (error) => {
  console.error('❌ Process error:', error);
});

child.on('exit', (code, signal) => {
  console.log('');
  console.log('🛑 Electron exited');
  console.log('   Code:', code);
  console.log('   Signal:', signal);
  console.log('   Time:', new Date().toISOString());
});

console.log('✅ Electron process started (PID:', child.pid, ')');
console.log('⏳ Waiting for window to open...');
console.log('');
console.log('📖 Once the window opens:');
console.log('   1. Press F12 to open DevTools');
console.log('   2. Go to Console tab');
console.log('   3. Navigate to /admin/pricing');
console.log('   4. Check for any errors');
console.log('');
