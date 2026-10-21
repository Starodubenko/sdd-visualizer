import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  alternateStatusPaths,
  fileHref,
  linkifyText,
  updateFeatureStatusCandidates,
  updateLinkedSectionHighlight,
} from './doc-links';

test('fileHref принимает относительные файлы и отсекает hash', () => {
  assert.equal(fileHref('analyst.md'), 'analyst.md');
  assert.equal(fileHref('./designer.md#section'), './designer.md');
  assert.equal(fileHref('tester.yaml'), 'tester.yaml');
  assert.equal(fileHref('notes.yml'), 'notes.yml');
});

test('fileHref отклоняет внешние, пустые и якорные ссылки', () => {
  assert.equal(fileHref(''), null);
  assert.equal(fileHref('https://example.com/a.md'), null);
  assert.equal(fileHref('http://example.com/a.md'), null);
  assert.equal(fileHref('#section'), null);
});

test('alternateStatusPaths возвращает два других каталога статуса', () => {
  const inProgress = 'docs/p/o/in-progress/analyst.md';
  const ready = 'docs/p/o/ready-to-implement/analyst.md';
  const done = 'docs/p/o/done/analyst.md';
  assert.deepEqual(alternateStatusPaths(inProgress), [ready, done]);
  assert.deepEqual(alternateStatusPaths(ready), [inProgress, done]);
  assert.deepEqual(alternateStatusPaths(done), [inProgress, ready]);
  assert.deepEqual(alternateStatusPaths('docs/p/analyst.md'), []);
});

test('linkifyText находит имена файлов в тексте', () => {
  assert.deepEqual(linkifyText('см. analyst.md и обзор.md.'), [
    { kind: 'text', value: 'см. ' },
    { kind: 'file', value: 'analyst.md' },
    { kind: 'text', value: ' и ' },
    { kind: 'file', value: 'обзор.md' },
    { kind: 'text', value: '.' },
  ]);
});

test('linkifyText не линкует url с путём', () => {
  assert.deepEqual(linkifyText('https://example.com/a.md'), [
    { kind: 'text', value: 'https://example.com/a.md' },
  ]);
});

test('linkifyText учитывает скобку перед именем', () => {
  assert.deepEqual(linkifyText('(backend.md)'), [
    { kind: 'text', value: '(' },
    { kind: 'file', value: 'backend.md' },
    { kind: 'text', value: ')' },
  ]);
});

test('updateFeatureStatusCandidates ищет спеку фичи из файла изменения', () => {
  const updatePath =
    'docs/billing/invoices/updates/in-progress/2026-10-21-1405-analyst-rezultat.md';
  const featureRoot = 'docs/billing/invoices/';
  assert.deepEqual(updateFeatureStatusCandidates(updatePath, 'analyst.md'), [
    `${featureRoot}in-progress/analyst.md`,
    `${featureRoot}ready-to-implement/analyst.md`,
    `${featureRoot}done/analyst.md`,
  ]);
});

test('updateFeatureStatusCandidates не добавляет пути вне updates', () => {
  assert.deepEqual(
    updateFeatureStatusCandidates('docs/billing/invoices/in-progress/analyst.md', 'analyst.md'),
    [],
  );
});

test('updateLinkedSectionHighlight возвращает section для source', () => {
  const updateContent = `source: analyst.md
section: Результат

## Оригинал
`;
  assert.equal(updateLinkedSectionHighlight(updateContent, 'analyst.md'), 'Результат');
  assert.equal(updateLinkedSectionHighlight(updateContent, 'designer.md'), null);
});
