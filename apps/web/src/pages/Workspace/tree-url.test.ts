import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildTreeSearch,
  directoryPrefixes,
  expandedPaths,
  isDocumentPath,
  parseTreeUrl,
} from './tree-url';

test('префиксы каталогов ведут к файлу и не включают сам файл', () => {
  assert.deepEqual(
    directoryPrefixes('docs/payments/main/order-list/in-progress/analyst.md'),
    [
      'docs/payments',
      'docs/payments/main',
      'docs/payments/main/order-list',
      'docs/payments/main/order-list/in-progress',
    ],
  );
});

test('префиксы каталога включают выбранный каталог', () => {
  assert.deepEqual(directoryPrefixes('docs/payments/main'), [
    'docs/payments',
    'docs/payments/main',
  ]);
  assert.equal(isDocumentPath('docs/payments/main'), false);
  assert.equal(isDocumentPath('docs/payments/settings/analyst/agent.md'), true);
});

test('адрес хранит проект, выбранный путь и открытые каталоги', () => {
  const search = buildTreeSearch({
    project: 'payments',
    path: 'docs/payments/main/order-list/in-progress/analyst.md',
    open: [
      'docs/payments/main/order-list',
      'docs/payments/main',
      'docs/payments/main',
    ],
  });
  assert.deepEqual(parseTreeUrl(search), {
    project: 'payments',
    path: 'docs/payments/main/order-list/in-progress/analyst.md',
    open: ['docs/payments/main', 'docs/payments/main/order-list'],
  });
});

test('открытые каталоги включают предков выбранного файла', () => {
  assert.deepEqual(
    expandedPaths(
      { 'docs/payments/main/payment-card': true, 'docs/payments/main': false },
      'docs/payments/main/order-list/in-progress/analyst.md',
    ).sort(),
    [
      'docs/payments',
      'docs/payments/main',
      'docs/payments/main/order-list',
      'docs/payments/main/order-list/in-progress',
      'docs/payments/main/payment-card',
    ],
  );
});
