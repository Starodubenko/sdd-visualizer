import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAppliedUpdateMeta,
  compareUpdateTimestampPrefix,
  featureRootFromSpecPath,
  featureUpdatesDoneTreePath,
  featureUpdatesInProgressTreePath,
  fileHasOpenChange,
  findLatestAppliedUpdate,
  sectionHasOpenChange,
  formatUpdateDateDisplay,
  formatAppliedUpdateLinkLabel,
  isUpdatesDocumentPath,
  parseUpdateTimestampPrefix,
} from './collapser-updates';

test('parseUpdateTimestampPrefix читает префикс из имени файла', () => {
  assert.equal(
    parseUpdateTimestampPrefix('2026-10-20-0910-analyst-vne-zadachi.md'),
    '2026-10-20-0910',
  );
  assert.equal(parseUpdateTimestampPrefix('notes.md'), null);
});

test('formatUpdateDateDisplay показывает DD.MM.YYYY без времени', () => {
  assert.equal(formatUpdateDateDisplay('2026-10-20-0910'), '20.10.2026');
  assert.equal(formatUpdateDateDisplay('bad'), null);
});

test('formatAppliedUpdateLinkLabel добавляет префикс «Последние изменения»', () => {
  assert.equal(formatAppliedUpdateLinkLabel('2026-10-21-1405'), 'Последние изменения 21.10.2026');
  assert.equal(formatAppliedUpdateLinkLabel('bad'), null);
});

test('compareUpdateTimestampPrefix сортирует по дате-времени', () => {
  assert.equal(
    compareUpdateTimestampPrefix('2026-10-21-1405', '2026-10-20-0910') > 0,
    true,
  );
});

test('findLatestAppliedUpdate выбирает последний по префиксу', () => {
  const updates = [
    {
      path: 'docs/p/f/updates/done/2026-10-20-0910-analyst-a.md',
      fileName: '2026-10-20-0910-analyst-a.md',
      timestampPrefix: '2026-10-20-0910',
      source: 'analyst.md',
      section: 'Результат',
    },
    {
      path: 'docs/p/f/updates/done/2026-10-21-1405-analyst-a.md',
      fileName: '2026-10-21-1405-analyst-a.md',
      timestampPrefix: '2026-10-21-1405',
      source: 'analyst.md',
      section: 'Результат',
    },
  ];
  const latest = findLatestAppliedUpdate(updates, 'analyst.md', 'Результат');
  assert.equal(latest?.timestampPrefix, '2026-10-21-1405');
  assert.equal(findLatestAppliedUpdate(updates, 'analyst.md', 'Контекст'), null);
});

test('featureRootFromSpecPath и updates/done для спеки', () => {
  const spec = 'docs/billing/invoices/ready-to-implement/analyst.md';
  assert.equal(featureRootFromSpecPath(spec), 'docs/billing/invoices');
  assert.equal(
    featureUpdatesDoneTreePath(spec),
    'docs/billing/invoices/updates/done',
  );
  assert.equal(
    featureUpdatesInProgressTreePath(spec),
    'docs/billing/invoices/updates/in-progress',
  );
  assert.equal(isUpdatesDocumentPath(spec), false);
});

test('fileHasOpenChange совпадает только по source', () => {
  const openUpdates = [
    {
      path: 'docs/p/f/updates/in-progress/2026-10-21-1405-analyst-a.md',
      fileName: '2026-10-21-1405-analyst-a.md',
      timestampPrefix: '2026-10-21-1405',
      source: 'analyst.md',
      section: 'Результат',
    },
    {
      path: 'docs/p/f/updates/in-progress/2026-10-21-1500-analyst-b.md',
      fileName: '2026-10-21-1500-analyst-b.md',
      timestampPrefix: '2026-10-21-1500',
      source: 'designer.md',
      section: 'Контекст',
    },
  ];
  assert.equal(fileHasOpenChange(openUpdates, 'analyst.md'), true);
  assert.equal(fileHasOpenChange(openUpdates, 'designer.md'), true);
  assert.equal(fileHasOpenChange(openUpdates, 'backend.md'), false);
  assert.equal(fileHasOpenChange([], 'analyst.md'), false);
});

test('sectionHasOpenChange совпадает по source и section', () => {
  const openUpdates = [
    {
      path: 'docs/p/f/updates/in-progress/2026-10-21-1405-analyst-a.md',
      fileName: '2026-10-21-1405-analyst-a.md',
      timestampPrefix: '2026-10-21-1405',
      source: 'analyst.md',
      section: 'Результат',
    },
  ];
  assert.equal(sectionHasOpenChange(openUpdates, 'analyst.md', 'Результат'), true);
  assert.equal(sectionHasOpenChange(openUpdates, 'analyst.md', 'Контекст'), false);
  assert.equal(sectionHasOpenChange(openUpdates, 'designer.md', 'Результат'), false);
  assert.equal(sectionHasOpenChange([], 'analyst.md', 'Результат'), false);
});

test('файлы внутри updates не получают корень спеки', () => {
  const update =
    'docs/billing/invoices/updates/done/2026-10-20-0910-analyst-vne-zadachi.md';
  assert.equal(isUpdatesDocumentPath(update), true);
  assert.equal(featureRootFromSpecPath(update), null);
  assert.equal(featureUpdatesDoneTreePath(update), null);
});

test('buildAppliedUpdateMeta собирает метаданные', () => {
  const content = `source: analyst.md
section: Вне задачи

## Оригинал
`;
  const meta = buildAppliedUpdateMeta(
    'docs/billing/invoices/updates/done/2026-10-20-0910-analyst-vne-zadachi.md',
    content,
  );
  assert.equal(meta?.source, 'analyst.md');
  assert.equal(meta?.section, 'Вне задачи');
  assert.equal(meta?.timestampPrefix, '2026-10-20-0910');
  assert.equal(formatUpdateDateDisplay(meta!.timestampPrefix), '20.10.2026');
});
