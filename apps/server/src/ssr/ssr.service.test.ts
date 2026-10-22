import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DocumentsService } from '../documents/documents.service';
import { copyFixtures } from '../test-support/copy-fixtures';
import { SsrService } from './ssr.service';

test('methodData', async () => {
  const root = copyFixtures();
  const documents = new DocumentsService(root);
  const ssr = new SsrService(documents);

  const inside = await ssr.methodData('docs/method/readme.adoc', []);
  assert.equal(inside.page, 'method');
  assert.equal(inside.method.path, 'docs/method/readme.adoc');

  const foreign = await ssr.methodData('docs/payments', []);
  assert.equal(foreign.method.path, 'docs/method');

  assert.ok(inside.method.entries.some((entry) => entry.name === 'readme.adoc'));
});
