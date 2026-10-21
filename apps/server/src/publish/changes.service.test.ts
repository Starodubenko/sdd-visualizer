import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { test } from 'node:test';
import { ChangesService } from './changes.service';

const exec = promisify(execFile);

const git = (args: string[], cwd: string) =>
  exec('git', args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  });

test('изменения при разных workspace и git root — diff по дереву docs', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'sdd-ws-'));
  const gitRoot = await mkdtemp(join(tmpdir(), 'sdd-git-'));
  const content = 'same\n';
  await mkdir(join(workspace, 'docs/billing/invoices'), { recursive: true });
  await mkdir(join(gitRoot, 'docs/billing/invoices'), { recursive: true });
  await mkdir(join(workspace, 'docs/method'), { recursive: true });
  await mkdir(join(gitRoot, 'docs/method'), { recursive: true });
  await writeFile(join(workspace, 'docs/billing/invoices/a.md'), 'changed in workspace\n', 'utf8');
  await writeFile(join(gitRoot, 'docs/billing/invoices/a.md'), content, 'utf8');
  await writeFile(join(workspace, 'docs/billing/invoices/b.md'), 'new\n', 'utf8');
  await writeFile(join(gitRoot, 'docs/billing/invoices/c.md'), 'gone from workspace\n', 'utf8');
  await writeFile(join(workspace, 'docs/method/readme.md'), 'ws method\n', 'utf8');
  await writeFile(join(gitRoot, 'docs/method/readme.md'), 'git method\n', 'utf8');

  const service = new ChangesService(workspace, gitRoot);
  const result = await service.list();

  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0]?.name, 'billing');
  const paths = result.projects[0]?.entries.map((entry) => `${entry.path}:${entry.status}`).sort();
  assert.deepEqual(paths, [
    'invoices/a.md:modified',
    'invoices/b.md:added',
    'invoices/c.md:deleted',
  ]);

  await rm(workspace, { recursive: true, force: true });
  await rm(gitRoot, { recursive: true, force: true });
});

test('изменения при одном корне — git status по docs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdd-one-'));
  await git(['init', '-b', 'main'], root);
  await mkdir(join(root, 'docs/payments/order-list'), { recursive: true });
  await mkdir(join(root, 'docs/method'), { recursive: true });
  await writeFile(join(root, 'docs/payments/order-list/a.md'), 'initial a\n', 'utf8');
  await writeFile(join(root, 'docs/payments/order-list/gone.md'), 'gone\n', 'utf8');
  await writeFile(join(root, 'docs/method/readme.md'), 'method initial\n', 'utf8');
  await git(['add', 'docs'], root);
  await git(['commit', '-m', 'seed'], root);
  await writeFile(join(root, 'docs/payments/order-list/a.md'), 'modified a\n', 'utf8');
  await rm(join(root, 'docs/payments/order-list/gone.md'));
  await writeFile(join(root, 'docs/payments/order-list/new.md'), 'new file\n', 'utf8');
  await writeFile(join(root, 'docs/method/readme.md'), 'method changed\n', 'utf8');

  const service = new ChangesService(root, root);
  const result = await service.list();

  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0]?.name, 'payments');
  const paths = result.projects[0]?.entries.map((entry) => `${entry.path}:${entry.status}`).sort();
  assert.deepEqual(paths, [
    'order-list/a.md:modified',
    'order-list/gone.md:deleted',
    'order-list/new.md:added',
  ]);

  await rm(root, { recursive: true, force: true });
});
