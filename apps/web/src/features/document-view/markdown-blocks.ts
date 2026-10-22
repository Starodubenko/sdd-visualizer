export type BlockKind =
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'table'
  | 'code'
  | 'mermaid'
  | 'image'
  | 'heading';

export type MarkdownBlock = {
  kind: BlockKind;
  source: string;
};

export type EditedRegion = { kind: 'prelude' } | { kind: 'section'; title: string };

const fenceOpen = (line: string): boolean => line.trimStart().startsWith('```');

const isTableLine = (line: string): boolean => /^\s*\|/.test(line);

const isListLine = (line: string): boolean => /^(\s*)([-*+]|\d+\.)\s+/.test(line);

const isListContinuation = (line: string): boolean => /^( {2,}|\t)\S/.test(line);

const isQuoteLine = (line: string): boolean => /^\s*>/.test(line);

const isHeadingLine = (line: string): boolean => /^#{1,6}\s+\S/.test(line);

const isImageLine = (line: string): boolean => {
  const text = line.trim();
  return (
    /^!\[[^\]]*\]\([^)]*\)$/.test(text) || /^\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)$/.test(text)
  );
};

const isBlank = (line: string): boolean => line.trim() === '';

export const blockKind = (source: string): BlockKind => {
  const line = source.split('\n').find((item) => item.trim() !== '') ?? '';
  if (fenceOpen(line)) {
    return /^\s*```mermaid\b/.test(line) ? 'mermaid' : 'code';
  }
  if (isTableLine(line)) {
    return 'table';
  }
  if (isListLine(line)) {
    return 'list';
  }
  if (isQuoteLine(line)) {
    return 'quote';
  }
  if (isHeadingLine(line)) {
    return 'heading';
  }
  if (isImageLine(line)) {
    return 'image';
  }
  return 'paragraph';
};

export const blockSnippets = {
  collapser: '## Название',
  diagram:
    '```mermaid\nsequenceDiagram\n  actor User as Пользователь\n  participant System as Система\n  User->>System: \n```',
  table: '| Колонка | Колонка |\n|---------|----------|\n|  |  |',
  list: '- пункт',
  ordered: '1. пункт',
  quote: '> цитата',
  code: '```\n\n```',
} as const;

export const splitMarkdownBlocks = (body: string): MarkdownBlock[] => {
  const lines = body.split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  const takeUntil = (done: (line: string, position: number) => boolean): string[] => {
    const chunk: string[] = [];
    while (index < lines.length && !done(lines[index] ?? '', index)) {
      chunk.push(lines[index] ?? '');
      index += 1;
    }
    return chunk;
  };

  while (index < lines.length) {
    if (isBlank(lines[index] ?? '')) {
      index += 1;
      continue;
    }
    const start = index;
    const line = lines[index] ?? '';
    if (fenceOpen(line)) {
      index += 1;
      while (index < lines.length && !fenceOpen(lines[index] ?? '')) {
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
    } else if (isTableLine(line)) {
      takeUntil((item) => !isTableLine(item));
    } else if (isListLine(line)) {
      takeUntil((item) => isBlank(item) || (!isListLine(item) && !isListContinuation(item)));
    } else if (isQuoteLine(line)) {
      takeUntil((item) => !isQuoteLine(item));
    } else if (isHeadingLine(line) || isImageLine(line)) {
      index += 1;
    } else {
      index += 1;
      takeUntil(
        (item) =>
          isBlank(item) ||
          fenceOpen(item) ||
          isTableLine(item) ||
          isListLine(item) ||
          isQuoteLine(item) ||
          isHeadingLine(item) ||
          isImageLine(item),
      );
    }
    const source = lines.slice(start, index).join('\n').trimEnd();
    if (source !== '') {
      blocks.push({ kind: blockKind(source), source });
    }
  }
  return blocks;
};

export const joinMarkdownBlocks = (blocks: MarkdownBlock[]): string =>
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
  blocks: MarkdownBlock[],
  index: number,
  source: string,
): MarkdownBlock[] => {
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
  const body = newBody.trim();
  if (region.kind === 'prelude') {
    const end = lines.findIndex((line) => line.startsWith('## '));
    const after = end === -1 ? [] : lines.slice(end);
    if (body === '') {
      return after.join('\n');
    }
    if (after.length === 0) {
      return body;
    }
    return `${body}\n\n${after.join('\n')}`;
  }
  const heading = `## ${region.title}`;
  const headingIndex = lines.findIndex((line) => line === heading);
  if (headingIndex === -1) {
    return content;
  }
  let endIndex = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (lines[index]?.startsWith('## ')) {
      endIndex = index;
      break;
    }
  }
  const before = lines.slice(0, headingIndex + 1);
  const after = lines.slice(endIndex);
  const next = [...before, '', body];
  if (after.length > 0) {
    next.push('');
  }
  next.push(...after);
  return next.join('\n');
};
