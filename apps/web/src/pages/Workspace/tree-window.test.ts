import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  displayDocumentPath,
  featureMatchesFilter,
  resolveRelative,
  statusLabel,
  visibleRange,
} from './tree-window';

test('окно дерева включает все строки, пока их не больше 200', () => {
  assert.deepEqual(visibleRange(12, 0, 28, 480), { start: 0, end: 12 });
});

test('окно дерева рисует только видимый диапазон после 200 строк', () => {
  const range = visibleRange(400, 2800, 28, 280);
  assert.ok(range.end - range.start < 400);
  assert.ok(range.start > 0);
});

test('ссылка на скриншот остаётся внутри фичи', () => {
  const path = resolveRelative(
    'docs/payments/order-list/in-progress/analyst.md',
    '../assets/screen.png',
  );
  assert.equal(path, 'docs/payments/order-list/assets/screen.png');
});

test('подписи статусов', () => {
  assert.equal(statusLabel('in_progress'), 'В процессе');
  assert.equal(statusLabel('ready'), 'Готово к реализации');
  assert.equal(statusLabel('done'), 'Выполнено');
  assert.equal(statusLabel('changes'), 'Внесены изменения');
});

test('фильтр фичи по имени и статусу', () => {
  const all = { nameQuery: '', status: 'all' as const };
  assert.equal(featureMatchesFilter('invoices', 'ready', all), true);
  assert.equal(featureMatchesFilter('invoices', undefined, { nameQuery: 'inv', status: 'all' }), true);
  assert.equal(featureMatchesFilter('invoices', undefined, { nameQuery: 'INV', status: 'all' }), true);
  assert.equal(
    featureMatchesFilter('invoices', undefined, { nameQuery: 'order', status: 'all' }),
    false,
  );
  assert.equal(
    featureMatchesFilter('invoices', 'ready', { nameQuery: '', status: 'changes' }),
    false,
  );
  assert.equal(
    featureMatchesFilter('invoices', undefined, { nameQuery: '', status: 'ready' }),
    false,
  );
  assert.equal(featureMatchesFilter('invoices', 'ready', { nameQuery: '  inv  ', status: 'all' }), true);
});

test('displayDocumentPath убирает docs, in-progress, ready-to-implement и done', () => {
  assert.equal(
    displayDocumentPath('docs/payments/order-list/in-progress/analyst.md'),
    'payments/order-list/analyst.md',
  );
  assert.equal(
    displayDocumentPath('docs/payments/order-list/done/analyst.md'),
    'payments/order-list/analyst.md',
  );
});
