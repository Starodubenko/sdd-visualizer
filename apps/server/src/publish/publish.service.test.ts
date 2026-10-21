import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { mkdir, mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { ChangesService } from './changes.service';
import { PublishService } from './publish.service';
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

test('публикация кладёт шаблоны в bare-репозиторий и не кладёт configs.yaml', async () => {
  const root = copyFixtures();
  const bare = await mkdtemp(join(tmpdir(), 'sdd-bare-'));
  await exec('git', ['init', '--bare', '-b', 'main', bare]);
  await git(['init', '-b', 'main'], root);
  await git(['remote', 'add', 'origin', bare], root);
  await git(['commit', '--allow-empty', '-m', 'seed'], root);
  await mkdir(join(root, 'global'), { recursive: true });
  await writeFile(join(root, 'global/configs.yaml'), 'payments:\n  token: test-token\n', 'utf8');
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'main', 'new-card');
  const changes = new ChangesService(root, root);
  const publish = new PublishService(root, root, changes);
  await publish.publish();
  const commitMessage = await git(['log', '-1', '--format=%B'], root);
  assert.match(commitMessage.stdout, /^Изменена документация/);
  assert.match(commitMessage.stdout, /\n - payments\n/);
  assert.match(commitMessage.stdout, /\n    - main\n/);
  assert.match(commitMessage.stdout, /\n       - new-card\/in-progress\/analyst\.md/);
  const listed = await exec('git', [
    '-c',
    'core.quotepath=false',
    '--git-dir',
    bare,
    'ls-tree',
    '-r',
    '--name-only',
    'HEAD',
  ]);
  const names = listed.stdout;
  assert.match(names, /docs\/payments\/main\/new-card\/in-progress\/analyst.md/);
  assert.doesNotMatch(names, /configs\.yaml/);
  const analyst = await exec('git', [
    '--git-dir',
    bare,
    'show',
    'HEAD:docs/payments/main/new-card/in-progress/analyst.md',
  ]);
  assert.match(analyst.stdout, /\| Номер \| Скриншот и ссылка на Pixo \| Описание \|/);
});

test('publish без изменений не двигает HEAD', async () => {
  const root = copyFixtures();
  const bare = await mkdtemp(join(tmpdir(), 'sdd-bare-'));
  await exec('git', ['init', '--bare', '-b', 'main', bare]);
  await git(['init', '-b', 'main'], root);
  await git(['remote', 'add', 'origin', bare], root);
  await git(['add', 'docs'], root);
  await git(['commit', '-m', 'docs'], root);
  const headBefore = await git(['rev-parse', 'HEAD'], root);
  const changes = new ChangesService(root, root);
  const publish = new PublishService(root, root, changes);
  await assert.rejects(
    () => publish.publish(),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, 'Нет изменений для публикации');
      return true;
    },
  );
  const headAfter = await git(['rev-parse', 'HEAD'], root);
  assert.equal(headBefore.stdout.trim(), headAfter.stdout.trim());
});
