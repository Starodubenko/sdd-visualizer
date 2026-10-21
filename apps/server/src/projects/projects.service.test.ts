import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ProjectsService } from './projects.service';
import { copyFixtures } from '../test-support/copy-fixtures';

test('публичный ответ не содержит токен', async () => {
  const root = copyFixtures();
  const projects = new ProjectsService(root);
  const listed = await projects.listPublic();
  const one = await projects.getPublic('payments');
  const payload = JSON.stringify({ listed, one });
  assert.doesNotMatch(payload, /test-token/);
  assert.equal(one.hasToken, true);
  assert.equal(one.remote, 'https://example.invalid/payments.git');
});

test('пустой токен в форме не затирает сохранённый', async () => {
  const root = copyFixtures();
  const projects = new ProjectsService(root);
  const saved = await projects.save('payments', 'https://example.invalid/payments.git', '');
  assert.equal(saved.hasToken, true);
  assert.equal(JSON.stringify(saved).includes('test-token'), false);
  const raw = await readFile(join(root, 'global/configs.yaml'), 'utf8');
  assert.match(raw, /test-token/);
});
