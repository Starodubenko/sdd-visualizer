import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyEditedRegion,
  blockSnippets,
  insertAtCursor,
  insertBlockAfter,
  joinAdocBlocks,
  splitAdocBlocks,
} from './adoc-blocks';

const sample = [
  'Оператор открывает список.',
  '',
  '* AC-1. Видна таблица',
  '* AC-2. Пустой день',
  '',
  '|===',
  '| Номер | Скриншот',
  '',
  '| 1 | image:../assets/screen.png[Список заказов,link=https://pixo.example/order-list]',
  '|===',
  '',
  '[quote]',
  '____',
  'граница',
  '____',
  '',
  '[source,mermaid]',
  '----',
  'sequenceDiagram',
  '  User->>System: шаг',
  '----',
  '',
  '[source]',
  '----',
  '{ "ok": true }',
  '----',
  '',
  'NOTE: заметка',
  '',
  '== Схема',
].join('\n');

test('разбор сохраняет исходный текст блоков', () => {
  const blocks = splitAdocBlocks(sample);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ['paragraph', 'list', 'table', 'quote', 'mermaid', 'code', 'admonition', 'heading'],
  );
  assert.equal(blocks[0]?.source, 'Оператор открывает список.');
  assert.equal(blocks[2]?.source.split('\n')[0], '|===');
  assert.equal(blocks[4]?.source.startsWith('[source,mermaid]'), true);
  assert.equal(joinAdocBlocks(blocks), sample.trimEnd());
});

test('вставка в курсор не переписывает соседний текст', () => {
  const next = insertAtCursor('абзац', blockSnippets.table, 5);
  assert.equal(next.source, `абзац\n\n${blockSnippets.table}`);
  assert.equal(next.cursor, next.source.length);
  const middle = insertAtCursor('абзац конец', 'X', 6);
  assert.equal(middle.source, 'абзац \n\nX\n\nконец');
  assert.equal(middle.cursor, 'абзац \n\nX\n\n'.length);
});

test('новый блок встаёт после выбранного', () => {
  const blocks = splitAdocBlocks('первый\n\nвторой');
  const next = insertBlockAfter(blocks, 0, blockSnippets.list);
  assert.deepEqual(
    next.map((block) => block.source),
    ['первый', blockSnippets.list, 'второй'],
  );
});

test('новый коллапсер внутри раздела становится соседним разделом', () => {
  const content = ['= Список', '', '== Контекст', '', 'было', '', '== Результат', '', 'текст'].join(
    '\n',
  );
  const next = applyEditedRegion(
    content,
    { kind: 'section', title: 'Контекст' },
    `стало\n\n${blockSnippets.collapser}\n\nдиаграмма`,
  );
  assert.equal(
    next,
    [
      '= Список',
      '',
      '== Контекст',
      '',
      'стало',
      '',
      '== Название',
      '',
      'диаграмма',
      '',
      '== Результат',
      '',
      'текст',
    ].join('\n'),
  );
});
