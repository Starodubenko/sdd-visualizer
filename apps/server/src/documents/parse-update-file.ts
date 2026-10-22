const METADATA_LINE = /^(\w+):\s*(.+)$/;

const parseMetadata = (
  content: string,
): { source: string | null; section: string | null } => {
  let source: string | null = null;
  let section: string | null = null;
  for (const line of content.split('\n')) {
    const match = METADATA_LINE.exec(line.trim());
    if (!match) {
      continue;
    }
    const [, key, value] = match;
    if (key === 'source') {
      source = value.trim();
    } else if (key === 'section') {
      section = value.trim();
    }
  }
  return { source, section };
};

const extractFixedSection = (content: string, heading: string): string | null => {
  const lines = content.split('\n');
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === heading) {
      start = index + 1;
      break;
    }
  }
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].startsWith('== ') && !lines[index].startsWith('===')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
};

export type ParsedUpdateFile = {
  source: string;
  section: string;
  original: string;
  pravka: string;
};

export const parseUpdateFileForApply = (content: string): ParsedUpdateFile | null => {
  const { source, section } = parseMetadata(content);
  if (!source || !section) {
    return null;
  }
  const original = extractFixedSection(content, '== Оригинал');
  const pravka = extractFixedSection(content, '== Правка');
  if (original === null || pravka === null) {
    return null;
  }
  return { source, section, original, pravka };
};
