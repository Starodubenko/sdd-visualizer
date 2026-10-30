export type AdocTable = {
  header: string[];
  rows: string[][];
};

const cellSeparator = (line: string, index: number): boolean => {
  if (line[index] !== '|') {
    return false;
  }
  if (index === 0) {
    return true;
  }
  return /\s/.test(line[index - 1] ?? '') && line[index - 1] !== '\\';
};

const splitCells = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let started = false;
  for (let index = 0; index < line.length; index += 1) {
    if (cellSeparator(line, index)) {
      if (started) {
        cells.push(current.trim());
      }
      started = true;
      current = '';
      continue;
    }
    if (!started) {
      continue;
    }
    if (line[index] === '\\' && line[index + 1] === '|') {
      current += '|';
      index += 1;
      continue;
    }
    current += line[index];
  }
  if (started) {
    cells.push(current.trim());
  }
  return cells;
};

const chunkRows = (cells: string[], columns: number): string[][] => {
  const rows: string[][] = [];
  for (let index = 0; index < cells.length; index += columns) {
    const row = cells.slice(index, index + columns);
    while (row.length < columns) {
      row.push('');
    }
    rows.push(row);
  }
  return rows;
};

export const parseAdocTable = (source: string): AdocTable | null => {
  const trimmed = source.trim();
  if (!trimmed.startsWith('|===')) {
    return null;
  }
  const close = trimmed.lastIndexOf('|===');
  if (close <= 0) {
    return null;
  }
  const inner = trimmed.slice('|==='.length, close);
  const header: string[] = [];
  const body: string[] = [];
  let headerDone = false;
  inner.split('\n').forEach((line) => {
    if (line.trim() === '') {
      if (header.length > 0) {
        headerDone = true;
      }
      return;
    }
    const cells = splitCells(line);
    if (!headerDone) {
      header.push(...cells);
      return;
    }
    body.push(...cells);
  });
  if (header.length === 0) {
    return null;
  }
  return {
    header,
    rows: chunkRows(body, header.length),
  };
};

const escapeCell = (value: string): string => value.replace(/\|/g, '\\|');

export const serializeAdocTable = (table: AdocTable): string => {
  const line = (cells: string[]): string => `| ${cells.map(escapeCell).join(' | ')}`;
  const rows = table.rows.map((row) => line(row));
  return ['|===', line(table.header), '', ...rows, '|==='].join('\n');
};

export const noteLinkMarkup = (imagePath: string, number: number): string =>
  `note:${imagePath.trim()}[${number}]`;

export const appendNoteLink = (cell: string, imagePath: string, number: number): string => {
  const link = noteLinkMarkup(imagePath, number);
  const trimmed = cell.trim();
  return trimmed === '' ? link : `${trimmed} ${link}`;
};

const blankRow = (columns: number): string[] => Array.from({ length: columns }, () => '');

export const addTableRow = (table: AdocTable): AdocTable => ({
  header: table.header,
  rows: [...table.rows, blankRow(table.header.length)],
});

export const addTableColumn = (table: AdocTable): AdocTable => ({
  header: [...table.header, ''],
  rows: table.rows.map((row) => [...row, '']),
});

export const removeTableRow = (table: AdocTable, index: number): AdocTable => ({
  header: table.header,
  rows: table.rows.filter((_, rowIndex) => rowIndex !== index),
});

export const removeTableColumn = (table: AdocTable, index: number): AdocTable | null => {
  if (table.header.length < 2 || index < 0 || index >= table.header.length) {
    return null;
  }
  return {
    header: table.header.filter((_, column) => column !== index),
    rows: table.rows.map((row) => row.filter((_, column) => column !== index)),
  };
};

export const writeTableCell = (
  table: AdocTable,
  place: { section: 'header' | 'body'; row: number; column: number },
  value: string,
): AdocTable => {
  if (place.section === 'header') {
    return {
      header: table.header.map((cell, column) => (column === place.column ? value : cell)),
      rows: table.rows,
    };
  }
  return {
    header: table.header,
    rows: table.rows.map((row, rowIndex) => (
      rowIndex === place.row
        ? row.map((cell, column) => (column === place.column ? value : cell))
        : row
    )),
  };
};
