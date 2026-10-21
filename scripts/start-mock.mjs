import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mock = resolve(root, 'data/mock');
rmSync(mock, { recursive: true, force: true });
mkdirSync(mock, { recursive: true });
cpSync(resolve(root, 'apps/server/test/fixtures'), mock, { recursive: true });

const child = spawn(process.execPath, ['apps/server/dist/main.js'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DOCS_ROOT: mock, PORT: process.env.PORT ?? '3000' },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
