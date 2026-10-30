import { useEffect, useState, type FC } from 'react';
import { normalizePastedNoteLinks, parseBlockLinkUrl, relativeDocsPath } from './asset-notes/note-link';
import {
  addTableColumn,
  addTableRow,
  appendNoteLink,
  parseAdocTable,
  removeTableColumn,
  removeTableRow,
  serializeAdocTable,
  writeTableCell,
  type AdocTable,
} from './adoc-table';

type Place = {
  section: 'header' | 'body';
  row: number;
  column: number;
};

type Props = {
  source: string;
  documentPath: string;
  onChange: (source: string) => void;
  preview: FC<{ content: string }>;
};

const samePlace = (left: Place, right: Place): boolean =>
  left.section === right.section && left.row === right.row && left.column === right.column;

export const TableEditor: FC<Props> = ({ source, documentPath, onChange, preview: Preview }) => {
  const table = parseAdocTable(source);
  const [place, setPlace] = useState<Place>({ section: 'body', row: 0, column: 0 });
  const [imagePath, setImagePath] = useState('../assets/create-empty.png');
  const [noteNumber, setNoteNumber] = useState('1');
  const number = Number(noteNumber);
  const linkReady = imagePath.trim() !== '' && Number.isInteger(number) && number >= 1;

  useEffect(() => {
    const normalized = normalizePastedNoteLinks(source, documentPath);
    if (normalized !== source) {
      onChange(normalized);
    }
  }, [documentPath, onChange, source]);

  if (!table) {
    return <p className="editor-empty">Эту таблицу можно править кнопкой «Текст».</p>;
  }

  const apply = (next: AdocTable | null) => {
    if (next) {
      onChange(serializeAdocTable(next));
    }
  };

  const focused = table.rows.length === 0 && place.section === 'body'
    ? { section: 'header' as const, row: 0, column: 0 }
    : place;

  const write = (value: string) => {
    apply(writeTableCell(table, focused, value));
  };

  const insertLink = () => {
    if (!linkReady) {
      return;
    }
    const cell = focused.section === 'header'
      ? table.header[focused.column] ?? ''
      : table.rows[focused.row]?.[focused.column] ?? '';
    const direct = normalizePastedNoteLinks(imagePath.trim(), documentPath);
    const macro = direct.startsWith('note:') && !direct.includes('http') ? direct : '';
    const next = macro === ''
      ? appendNoteLink(cell, imagePath, number)
      : cell.trim() === ''
        ? macro
        : `${cell.trim()} ${macro}`;
    write(next);
  };

  const commitCell = (nextPlace: Place, value: string) => {
    setPlace(nextPlace);
    apply(writeTableCell(table, nextPlace, normalizePastedNoteLinks(value, documentPath)));
  };

  const acceptImage = (value: string) => {
    const candidate = value.trim().replace(/^note:\s*/, '');
    const parsed = parseBlockLinkUrl(candidate.replace(/[.,;]+$/, ''), documentPath);
    if (!parsed) {
      setImagePath(value);
      return;
    }
    setImagePath(
      parsed.imagePath.startsWith('docs/')
        ? relativeDocsPath(documentPath, parsed.imagePath)
        : parsed.imagePath,
    );
    setNoteNumber(String(parsed.number));
  };

  const cellClass = (candidate: Place): string =>
    samePlace(candidate, focused) ? 'is-focused' : '';

  return (
    <div className="table-editor">
      <div className="table-editor-tools">
        <button type="button" onClick={() => apply(addTableRow(table))}>Строка</button>
        <button type="button" onClick={() => apply(addTableColumn(table))}>Колонка</button>
        <button
          type="button"
          disabled={focused.section !== 'body'}
          onClick={() => apply(removeTableRow(table, focused.row))}
        >
          Удалить строку
        </button>
        <button
          type="button"
          disabled={table.header.length < 2}
          onClick={() => apply(removeTableColumn(table, focused.column))}
        >
          Удалить колонку
        </button>
        <input
          className="table-editor-image"
          value={imagePath}
          placeholder="../assets/file.png"
          aria-label="Картинка блока"
          onChange={(event) => acceptImage(event.target.value)}
        />
        <input
          className="table-editor-number"
          value={noteNumber}
          inputMode="numeric"
          aria-label="Номер блока"
          onChange={(event) => setNoteNumber(event.target.value)}
        />
        <button type="button" disabled={!linkReady} onClick={insertLink}>
          Ссылка на блок
        </button>
      </div>
      <table className="table-editor-grid">
        <thead>
          <tr>
            {table.header.map((cell, column) => (
              <th key={`header-${column}`} className={cellClass({ section: 'header', row: 0, column })}>
                <textarea
                  aria-label={`Шапка ${column + 1}`}
                  value={cell}
                  onFocus={() => setPlace({ section: 'header', row: 0, column })}
                  onChange={(event) => commitCell({ section: 'header', row: 0, column }, event.target.value)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, column) => (
                <td key={`cell-${rowIndex}-${column}`} className={cellClass({ section: 'body', row: rowIndex, column })}>
                  <textarea
                    aria-label={`Строка ${rowIndex + 1}, колонка ${column + 1}`}
                    value={cell}
                    onFocus={() => setPlace({ section: 'body', row: rowIndex, column })}
                    onChange={(event) => commitCell({ section: 'body', row: rowIndex, column }, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-editor-preview">
        <Preview content={source} />
      </div>
    </div>
  );
};
