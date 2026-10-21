import assert from 'node:assert/strict';
import { test } from 'node:test';
import { includeDocsWatchPath } from './watch-path-filter';

test('путь внутри .git не уходит клиенту', () => {
  assert.equal(includeDocsWatchPath('.git/objects/pack'), false);
});

test('путь внутри global не уходит клиенту', () => {
  assert.equal(includeDocsWatchPath('global/configs.yaml'), false);
});

test('файл в docs/<проект> остаётся', () => {
  assert.equal(
    includeDocsWatchPath('docs/billing/invoices/done/analyst.md'),
    true,
  );
});
