import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { test } from 'node:test';
import { writeFile } from 'fs/promises';
import { DocumentsService } from '../documents/documents.service';
import { ProjectsService } from '../projects/projects.service';
import { PublishService } from './publish.service';
import { copyFixtures } from '../test-support/copy-fixtures';

const exec = promisify(execFile);

test('публикация кладёт шаблоны в bare-репозиторий и не кладёт configs.yaml', async () => {
  const root = copyFixtures();
  const bare = await mkdtemp(join(tmpdir(), 'sdd-bare-'));
  await exec('git', ['init', '--bare', '-b', 'main', bare]);
  await exec('git', ['init', '-b', 'main'], { cwd: root });
  const projects = new ProjectsService(root);
  await projects.save('payments', bare, 'test-token');
  const documents = new DocumentsService(root);
  await documents.createFeature('payments', 'new-card');
  const publish = new PublishService(root, projects);
  await publish.publish('payments');
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
  assert.match(names, /docs\/payments\/new-card\/in-progress\/analyst.md/);
  assert.doesNotMatch(names, /configs\.yaml/);
  const analyst = await exec('git', [
    '--git-dir',
    bare,
    'show',
    'HEAD:docs/payments/new-card/in-progress/analyst.md',
  ]);
  assert.match(analyst.stdout, /\| Номер \| Скриншот и ссылка на Pixo \| Описание \|/);
  const config = await readFile(join(root, 'global/configs.yaml'), 'utf8');
  assert.match(config, /test-token/);
  await writeFile(join(root, 'global/configs.yaml'), config);
});
