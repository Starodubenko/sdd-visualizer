import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addTableColumn,
  addTableRow,
  appendNoteLink,
  parseAdocTable,
  removeTableColumn,
  removeTableRow,
  serializeAdocTable,
  writeTableCell,
} from './adoc-table';

const validation = [
  '|===',
  '| Поле | Правило | Текст',
  '',
  '| Наименование note:../assets/create-empty.png[3] | максимум 25 символов | в описании нет',
  '|===',
].join('\n');

test('таблица читает шапку, строку и ссылку на блок', () => {
  const table = parseAdocTable(validation);
  assert.ok(table);
  assert.deepEqual(table.header, ['Поле', 'Правило', 'Текст']);
  assert.deepEqual(table.rows, [[
    'Наименование note:../assets/create-empty.png[3]',
    'максимум 25 символов',
    'в описании нет',
  ]]);
});

test('ссылка на блок дописывается в ячейку', () => {
  assert.equal(
    appendNoteLink('Наименование', '../assets/create-empty.png', 3),
    'Наименование note:../assets/create-empty.png[3]',
  );
  assert.equal(appendNoteLink('', '../assets/a.png', 1), 'note:../assets/a.png[1]');
});

test('правка ячейки, строка и колонка собираются обратно в таблицу', () => {
  const table = parseAdocTable('|===\n| A | B\n\n| 1 | 2\n|===');
  assert.ok(table);
  const edited = writeTableCell(table, { section: 'body', row: 0, column: 0 }, '1 note:../assets/a.png[4]');
  const grown = addTableColumn(addTableRow(edited));
  assert.equal(
    serializeAdocTable(grown),
    [
      '|===',
      '| A | B | ',
      '',
      '| 1 note:../assets/a.png[4] | 2 | ',
      '|  |  | ',
      '|===',
    ].join('\n'),
  );
  const withoutColumn = removeTableColumn(grown, 2);
  const withoutRow = withoutColumn ? removeTableRow(withoutColumn, 1) : null;
  assert.deepEqual(withoutRow?.header, ['A', 'B']);
  assert.deepEqual(withoutRow?.rows, [['1 note:../assets/a.png[4]', '2']]);
  assert.equal(removeTableColumn({ header: ['A'], rows: [] }, 0), null);
});

test('вертикальная черта в ячейке не режет колонку', () => {
  const table = parseAdocTable('|===\n| A | B\n\n| лево \\| право | 2\n|===');
  assert.deepEqual(table?.rows, [['лево | право', '2']]);
});
