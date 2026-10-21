import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { access, mkdtemp, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { copyFixtures } from '../test-support/copy-fixtures';

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

const initBare = async (bare: string) => {
  await exec('git', ['init', '--bare', '-b', 'main', bare]);
};

const pushMain = async (cwd: string, bare: string) => {
  await git(['push', bare, 'HEAD:main', '--force'], cwd);
};

const initLocalFromBare = async (root: string, bare: string) => {
  await git(['init', '-b', 'main'], root);
  await git(['fetch', bare, 'main'], root);
  await git(['reset', '--hard', 'FETCH_HEAD'], root);
};

const commitAll = async (cwd: string, message: string) => {
  await git(['add', '-A'], cwd);
  await git(['commit', '-m', message], cwd);
};

const addOrigin = async (root: string, bare: string) => {
  await git(['remote', 'add', 'origin', bare], root);
};

test('синхронизация подтягивает новый файл с remote main', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  const remoteWork = await mkdtemp(join(tmpdir(), 'sdd-sync-remote-'));
  await initLocalFromBare(remoteWork, bare);
  const remoteFile = join(remoteWork, 'docs/payments/from-remote.txt');
  await writeFile(remoteFile, 'remote content', 'utf8');
  await commitAll(remoteWork, 'remote ahead');
  await pushMain(remoteWork, bare);
  const sync = new SyncService(root, root);
  const result = await sync.sync('payments');
  assert.equal(result.updated, true);
  const local = await readFile(join(root, 'docs/payments/from-remote.txt'), 'utf8');
  assert.equal(local, 'remote content');
});

test('грязное дерево docs проекта отклоняется и файл не меняется', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  const remoteWork = await mkdtemp(join(tmpdir(), 'sdd-sync-remote-'));
  await initLocalFromBare(remoteWork, bare);
  await writeFile(join(remoteWork, 'docs/payments/from-remote.txt'), 'remote content', 'utf8');
  await commitAll(remoteWork, 'remote ahead');
  await pushMain(remoteWork, bare);
  const dirtyPath = join(root, 'docs/payments/main/payment-card/in-progress/analyst.md');
  const dirtyText = 'локальная правка без коммита';
  await writeFile(dirtyPath, dirtyText, 'utf8');
  const sync = new SyncService(root, root);
  await assert.rejects(
    () => sync.sync('payments'),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /Сначала опубликуйте локальные изменения/);
      return true;
    },
  );
  const stillDirty = await readFile(dirtyPath, 'utf8');
  assert.equal(stillDirty, dirtyText);
  await assert.rejects(() => access(join(root, 'docs/payments/from-remote.txt')));
});

test('расхождение локальных коммитов и main не меняет локальный файл', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  await initLocalFromBare(root, bare);
  const localOnly = join(root, 'docs/payments/only-local.txt');
  const localText = 'локальный коммит';
  await writeFile(localOnly, localText, 'utf8');
  await commitAll(root, 'local change');
  const remoteWork = await mkdtemp(join(tmpdir(), 'sdd-sync-remote-'));
  await initLocalFromBare(remoteWork, bare);
  await writeFile(join(remoteWork, 'docs/payments/only-remote.txt'), 'remote', 'utf8');
  await commitAll(remoteWork, 'remote change');
  await pushMain(remoteWork, bare);
  const sync = new SyncService(root, root);
  await assert.rejects(
    () => sync.sync('payments'),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /Изменения разошлись с репозиторием/);
      return true;
    },
  );
  const stillLocal = await readFile(localOnly, 'utf8');
  assert.equal(stillLocal, localText);
  await assert.rejects(() => access(join(root, 'docs/payments/only-remote.txt')));
});

test('локальный коммит при неизменённом remote не затирает docs', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  const localOnly = join(root, 'docs/payments/only-local.txt');
  const localText = 'локальный коммит без remote';
  await writeFile(localOnly, localText, 'utf8');
  await commitAll(root, 'local only');
  const sync = new SyncService(root, root);
  const result = await sync.sync('payments');
  assert.equal(result.updated, false);
  const stillLocal = await readFile(localOnly, 'utf8');
  assert.equal(stillLocal, localText);
});

test('повторная синхронизация подтягивает следующие изменения main', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  const remoteWork = await mkdtemp(join(tmpdir(), 'sdd-sync-remote-'));
  await initLocalFromBare(remoteWork, bare);
  await writeFile(join(remoteWork, 'docs/payments/file-a.txt'), 'A', 'utf8');
  await commitAll(remoteWork, 'add A');
  await pushMain(remoteWork, bare);
  const sync = new SyncService(root, root);
  const first = await sync.sync('payments');
  assert.equal(first.updated, true);
  assert.equal(await readFile(join(root, 'docs/payments/file-a.txt'), 'utf8'), 'A');
  await writeFile(join(remoteWork, 'docs/payments/file-b.txt'), 'B', 'utf8');
  await commitAll(remoteWork, 'add B');
  await pushMain(remoteWork, bare);
  const second = await sync.sync('payments');
  assert.equal(second.updated, true);
  assert.equal(await readFile(join(root, 'docs/payments/file-a.txt'), 'utf8'), 'A');
  assert.equal(await readFile(join(root, 'docs/payments/file-b.txt'), 'utf8'), 'B');
});

test('удаление файла на remote убирает его локально', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'sdd-sync-bare-'));
  await initBare(bare);
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  const tracked = join(root, 'docs/payments/to-delete.txt');
  await writeFile(tracked, 'will go', 'utf8');
  await commitAll(root, 'seed with tracked');
  await pushMain(root, bare);
  await addOrigin(root, bare);
  const remoteWork = await mkdtemp(join(tmpdir(), 'sdd-sync-remote-'));
  await initLocalFromBare(remoteWork, bare);
  await git(['rm', 'docs/payments/to-delete.txt'], remoteWork);
  await commitAll(remoteWork, 'delete on remote');
  await pushMain(remoteWork, bare);
  const sync = new SyncService(root, root);
  const result = await sync.sync('payments');
  assert.equal(result.updated, true);
  await assert.rejects(() => access(tracked));
});

test('без origin синхронизация отклоняется', async () => {
  const root = copyFixtures();
  await git(['init', '-b', 'main'], root);
  await commitAll(root, 'seed');
  const sync = new SyncService(root, root);
  await assert.rejects(
    () => sync.sync('payments'),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match(error.message, /У репозитория нет origin/);
      return true;
    },
  );
});
