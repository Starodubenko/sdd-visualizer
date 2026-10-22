import { sectionLineIndexes } from './adoc-sections';

export type BlockKind =
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'table'
  | 'code'
  | 'mermaid'
  | 'image'
  | 'heading'
  | 'admonition';

export type AdocBlock = {
  kind: BlockKind;
  source: string;
};

export type EditedRegion = { kind: 'prelude' } | { kind: 'section'; title: string };

const isBlank = (line: string): boolean => line.trim() === '';

const isHeadingLine = (line: string): boolean => /^=+\s+\S/.test(line.trim());

const isImageLine = (line: string): boolean => /^image:{1,2}\S/.test(line.trim());

const isListLine = (line: string): boolean => /^\s*(\*|-|\.)\s+\S/.test(line);

const isListContinuation = (line: string): boolean => /^( {2,}|\t)\S/.test(line) || line.trim() === '+';

const isAdmonitionLine = (line: string): boolean =>
  /^(NOTE|TIP|WARNING|CAUTION|IMPORTANT):\s/.test(line.trim());

export const blockKind = (source: string): BlockKind => {
  const line = source.split('\n').find((item) => item.trim() !== '') ?? '';
  const trimmed = line.trim();
  if (/^\[source,\s*mermaid\]/.test(trimmed)) {
    return 'mermaid';
  }
  if (/^\[source/.test(trimmed) || trimmed === '----' || trimmed === '....') {
    return 'code';
  }
  if (trimmed === '|===') {
    return 'table';
  }
  if (/^\[quote/.test(trimmed) || trimmed === '____') {
    return 'quote';
  }
  if (
    /^(NOTE|TIP|WARNING|CAUTION|IMPORTANT):/.test(trimmed) ||
    /^\[(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]/.test(trimmed) ||
    trimmed === '===='
  ) {
    return 'admonition';
  }
  if (isHeadingLine(line)) {
    return 'heading';
  }
  if (isImageLine(line)) {
    return 'image';
  }
  if (isListLine(line)) {
    return 'list';
  }
  return 'paragraph';
};

export const blockSnippets = {
  collapser: '== Название',
  diagram:
    '[source,mermaid]\n----\nsequenceDiagram\n  actor User as Пользователь\n  participant System as Система\n  User->>System: \n----',
  table: '|===\n| Колонка | Колонка\n\n|  | \n|===',
  list: '* пункт',
  ordered: '. пункт',
  quote: '[quote]\n____\nцитата\n____',
  code: '[source]\n----\n\n----',
  note: 'NOTE: заметка',
} as const;

const isBlockStart = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed === '|===' ||
    trimmed === '----' ||
    trimmed === '....' ||
    trimmed === '____' ||
    trimmed === '====' ||
    /^\[source/.test(trimmed) ||
    /^\[quote/.test(trimmed) ||
    /^\[(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*$/.test(trimmed) ||
    isAdmonitionLine(line) ||
    isHeadingLine(line) ||
    isImageLine(line) ||
    isListLine(line)
  );
};

const closeDelimited = (lines: string[], index: number, delimiter: string): number => {
  let cursor = index;
  while (cursor < lines.length && lines[cursor]?.trim() !== delimiter) {
    cursor += 1;
  }
  return cursor < lines.length ? cursor + 1 : cursor;
};

export const splitAdocBlocks = (body: string): AdocBlock[] => {
  const lines = body.split('\n');
  const blocks: AdocBlock[] = [];
  let index = 0;

  const push = (start: number) => {
    const source = lines.slice(start, index).join('\n').trimEnd();
    if (source !== '') {
      blocks.push({ kind: blockKind(source), source });
    }
  };

  while (index < lines.length) {
    if (isBlank(lines[index] ?? '')) {
      index += 1;
      continue;
    }
    const start = index;
    const trimmed = (lines[index] ?? '').trim();
    if (trimmed === '|===') {
      index = closeDelimited(lines, index + 1, '|===');
    } else if (/^\[source/.test(trimmed)) {
      index += 1;
      while (index < lines.length && isBlank(lines[index] ?? '')) {
        index += 1;
      }
      const delimiter = lines[index]?.trim();
      if (delimiter === '----' || delimiter === '....') {
        index = closeDelimited(lines, index + 1, delimiter);
      }
    } else if (trimmed === '----' || trimmed === '....' || trimmed === '____' || trimmed === '====') {
      index = closeDelimited(lines, index + 1, trimmed);
    } else if (/^\[quote/.test(trimmed)) {
      index += 1;
      while (index < lines.length && isBlank(lines[index] ?? '')) {
        index += 1;
      }
      if (lines[index]?.trim() === '____') {
        index = closeDelimited(lines, index + 1, '____');
      }
    } else if (/^\[(NOTE|TIP|WARNING|CAUTION|IMPORTANT)\]\s*$/.test(trimmed)) {
      index += 1;
      while (index < lines.length && isBlank(lines[index] ?? '')) {
        index += 1;
      }
      if (lines[index]?.trim() === '====') {
        index = closeDelimited(lines, index + 1, '====');
      } else {
        while (index < lines.length && !isBlank(lines[index] ?? '')) {
          index += 1;
        }
      }
    } else if (isAdmonitionLine(lines[index] ?? '') || isHeadingLine(lines[index] ?? '') || isImageLine(lines[index] ?? '')) {
      index += 1;
    } else if (isListLine(lines[index] ?? '')) {
      index += 1;
      while (
        index < lines.length &&
        (isListLine(lines[index] ?? '') || isListContinuation(lines[index] ?? ''))
      ) {
        index += 1;
      }
    } else {
      index += 1;
      while (index < lines.length && !isBlank(lines[index] ?? '') && !isBlockStart(lines[index] ?? '')) {
        index += 1;
      }
    }
    push(start);
  }
  return blocks;
};

export const joinAdocBlocks = (blocks: AdocBlock[]): string =>
  blocks
    .map((block) => block.source.trimEnd())
    .filter((source) => source !== '')
    .join('\n\n');

export const insertAtCursor = (
  source: string,
  snippet: string,
  cursor: number,
): { source: string; cursor: number } => {
  const at = Math.max(0, Math.min(source.length, cursor));
  const before = source.slice(0, at);
  const after = source.slice(at);
  let piece = snippet;
  if (before.length > 0 && !before.endsWith('\n')) {
    piece = `\n\n${piece}`;
  }
  if (after.length > 0 && !after.startsWith('\n')) {
    piece = `${piece}\n\n`;
  }
  return {
    source: `${before}${piece}${after}`,
    cursor: before.length + piece.length,
  };
};

export const insertBlockAfter = (
  blocks: AdocBlock[],
  index: number,
  source: string,
): AdocBlock[] => {
  const block = { kind: blockKind(source), source: source.trimEnd() };
  const at = index < 0 ? 0 : Math.min(blocks.length, index + 1);
  return [...blocks.slice(0, at), block, ...blocks.slice(at)];
};

export const applyEditedRegion = (
  content: string,
  region: EditedRegion,
  newBody: string,
): string => {
  const lines = content.split('\n');
  const headings = sectionLineIndexes(lines);
  const body = newBody.trim();
  if (region.kind === 'prelude') {
    const end = headings[0] ?? -1;
    const after = end === -1 ? [] : lines.slice(end);
    if (body === '') {
      return after.join('\n');
    }
    if (after.length === 0) {
      return body;
    }
    return `${body}\n\n${after.join('\n')}`;
  }
  const heading = `== ${region.title}`;
  const headingIndex = headings.find((index) => lines[index] === heading) ?? -1;
  if (headingIndex === -1) {
    return content;
  }
  const headingPosition = headings.indexOf(headingIndex);
  const endIndex = headings[headingPosition + 1] ?? lines.length;
  const before = lines.slice(0, headingIndex + 1);
  const after = lines.slice(endIndex);
  const next = [...before, '', body];
  if (after.length > 0) {
    next.push('');
  }
  next.push(...after);
  return next.join('\n');
};
