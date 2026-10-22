import { useEffect, useRef, useState, type FC } from 'react';
import {
  blockKind,
  blockSnippets,
  insertAtCursor,
  joinMarkdownBlocks,
  splitMarkdownBlocks,
  type BlockKind,
  type MarkdownBlock,
} from './markdown-blocks';

type EditorBlock = MarkdownBlock & {
  id: string;
  textMode: boolean;
};

type Props = {
  body: string;
  canUploadImage: boolean;
  onSave: (body: string) => Promise<void>;
  onCancel: () => void;
  onUploadImage: (file: File, pixoUrl: string) => Promise<string>;
  preview: FC<{ content: string }>;
};

const kindLabel: Record<BlockKind, string> = {
  paragraph: 'Абзац',
  list: 'Список',
  quote: 'Цитата',
  table: 'Таблица',
  code: 'Код',
  mermaid: 'Схема',
  image: 'Картинка',
  heading: 'Коллапсер',
};

let blockSeq = 0;

const nextBlockId = (): string => {
  blockSeq += 1;
  return `block-${blockSeq}`;
};

const toEditorBlocks = (body: string): EditorBlock[] =>
  splitMarkdownBlocks(body).map((block) => ({
    ...block,
    id: nextBlockId(),
    textMode: false,
  }));

export const SectionEditor: FC<Props> = (props) => {
  const { body, canUploadImage, onSave, onCancel, onUploadImage, preview: Preview } = props;
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditorBlocks(body));
  const [focusId, setFocusId] = useState<string | null>(blocks[0]?.id ?? null);
  const [pixo, setPixo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  const cursors = useRef<Record<string, number>>({});
  const areas = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingSelection = useRef<{ id: string; cursor: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) {
      return;
    }
    const node = areas.current[pending.id];
    if (!node) {
      return;
    }
    node.focus();
    node.setSelectionRange(pending.cursor, pending.cursor);
    pendingSelection.current = null;
  });

  const insertSnippet = (snippet: string) => {
    const items = blocksRef.current;
    const index = items.findIndex((block) => block.id === focusRef.current);
    const current = index >= 0 ? items[index] : null;
    if (current && current.textMode) {
      const cursor =
        areas.current[current.id]?.selectionStart ??
        cursors.current[current.id] ??
        current.source.length;
      const next = insertAtCursor(current.source, snippet, cursor);
      cursors.current[current.id] = next.cursor;
      pendingSelection.current = { id: current.id, cursor: next.cursor };
      const updated = items.map((item) =>
        item.id === current.id
          ? { ...item, source: next.source, kind: blockKind(next.source) }
          : item,
      );
      blocksRef.current = updated;
      setBlocks(updated);
      return;
    }
    const created: EditorBlock = {
      id: nextBlockId(),
      kind: blockKind(snippet),
      source: snippet,
      textMode: true,
    };
    pendingSelection.current = { id: created.id, cursor: snippet.length };
    cursors.current[created.id] = snippet.length;
    const at = index < 0 ? items.length : index + 1;
    const updated = [...items.slice(0, at), created, ...items.slice(at)];
    blocksRef.current = updated;
    setBlocks(updated);
    setFocusId(created.id);
  };

  const save = () => {
    setBusy(true);
    setError('');
    void onSave(joinMarkdownBlocks(blocks))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить');
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const upload = (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBusy(true);
    setError('');
    void onUploadImage(file, pixo)
      .then((markdown) => {
        insertSnippet(markdown.trim());
        setPixo('');
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить картинку');
      })
      .finally(() => {
        setBusy(false);
        if (fileInput.current) {
          fileInput.current.value = '';
        }
      });
  };

  return (
    <div className="section-editor">
      <div className="section-editor-bar">
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.collapser)}>
          Коллапсер
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.diagram)}>
          Схема
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.table)}>
          Таблица
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.list)}>
          Список
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.ordered)}>
          Нумерация
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.quote)}>
          Цитата
        </button>
        <button type="button" disabled={busy} onClick={() => insertSnippet(blockSnippets.code)}>
          Код
        </button>
        {canUploadImage && (
          <>
            <input
              className="editor-pixo"
              value={pixo}
              placeholder="Адрес Pixo"
              onChange={(event) => setPixo(event.target.value)}
            />
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
              Картинка
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </>
        )}
        <span className="section-editor-save">
          <button type="button" className="primary" disabled={busy} onClick={save}>
            Сохранить
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            Отмена
          </button>
        </span>
      </div>
      {blocks.length === 0 && <p className="editor-empty">Раздел пуст. Вставьте блок из шапки.</p>}
      {blocks.map((block) => (
        <div
          key={block.id}
          className={block.id === focusId ? 'editor-block is-focused' : 'editor-block'}
          onMouseDown={() => setFocusId(block.id)}
        >
          <div className="editor-block-bar">
            <span>{kindLabel[block.kind]}</span>
            <button
              type="button"
              onClick={() => {
                setFocusId(block.id);
                setBlocks((items) =>
                  items.map((item) =>
                    item.id === block.id ? { ...item, textMode: !item.textMode } : item,
                  ),
                );
              }}
            >
              {block.textMode ? 'Просмотр' : 'Текст'}
            </button>
          </div>
          {block.textMode ? (
            <textarea
              ref={(node) => {
                areas.current[block.id] = node;
              }}
              className="editor-block-source"
              value={block.source}
              onChange={(event) => {
                const source = event.target.value;
                cursors.current[block.id] = event.target.selectionStart;
                setBlocks((items) =>
                  items.map((item) =>
                    item.id === block.id ? { ...item, source, kind: blockKind(source) } : item,
                  ),
                );
              }}
              onSelect={(event) => {
                cursors.current[block.id] = event.currentTarget.selectionStart;
              }}
            />
          ) : (
            <Preview content={block.source} />
          )}
        </div>
      ))}
      {error !== '' && <p className="error">{error}</p>}
    </div>
  );
};
