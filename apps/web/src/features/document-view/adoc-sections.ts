export type AdocSection = {
  title: string;
  body: string;
};

export type SplitAdoc = {
  prelude: string;
  sections: AdocSection[];
};

export const fenceDelimiter = (line: string): string | null => {
  const trimmed = line.trim();
  if (trimmed === '|===') {
    return '|===';
  }
  if (/^-{4,}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\.{4,}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^_{4,}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^={4,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

export const isAdocSectionLine = (line: string): boolean => /^== [^=]/.test(line);

export const isNestedCollapserLine = (line: string): boolean => /^=== [^=]/.test(line);

export const highlightForAnchor = (content: string, anchor: string): string | null => {
  const needle = `[[${anchor}]]`;
  const lines = content.split('\n');
  let fence: string | null = null;
  let section = '';
  let sectionStart = -1;
  let anchorLine = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const delimiter = fenceDelimiter(line);
    if (fence) {
      if (delimiter === fence) {
        fence = null;
      }
      continue;
    }
    if (delimiter) {
      fence = delimiter;
      continue;
    }
    if (isAdocSectionLine(line)) {
      section = line.replace(/^==\s+/, '').trim();
      sectionStart = index;
    }
    if (line.trim() === needle) {
      anchorLine = index;
      break;
    }
  }
  if (anchorLine === -1) {
    return null;
  }
  if (section !== '' && anchorLine - sectionStart <= 4) {
    return section;
  }
  for (let index = anchorLine + 1; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('[[') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('=') ||
      trimmed === '----' ||
      trimmed === '....'
    ) {
      continue;
    }
    const text = trimmed.replace(/^\*\s+/, '');
    return text.length > 160 ? text.slice(0, 160) : text;
  }
  return section === '' ? null : section;
};

const lineIndexes = (lines: string[], isHeading: (line: string) => boolean): number[] => {
  const indexes: number[] = [];
  let fence: string | null = null;
  lines.forEach((line, index) => {
    const delimiter = fenceDelimiter(line);
    if (fence) {
      if (delimiter === fence) {
        fence = null;
      }
      return;
    }
    if (delimiter) {
      fence = delimiter;
      return;
    }
    if (isHeading(line)) {
      indexes.push(index);
    }
  });
  return indexes;
};

export const sectionLineIndexes = (lines: string[]): number[] => lineIndexes(lines, isAdocSectionLine);

export const splitAdocSections = (content: string): SplitAdoc => {
  const lines = content.split('\n');
  const indexes = sectionLineIndexes(lines);
  if (indexes.length === 0) {
    return { prelude: content, sections: [] };
  }
  const prelude = lines.slice(0, indexes[0]).join('\n');
  const sections = indexes.map((start, position) => {
    const heading = lines[start] ?? '';
    const end = indexes[position + 1] ?? lines.length;
    return {
      title: heading.replace(/^==\s+/, ''),
      body: lines.slice(start + 1, end).join('\n'),
    };
  });
  return { prelude, sections };
};

export const splitNestedCollapsers = (body: string): SplitAdoc => {
  const lines = body.split('\n');
  const indexes = lineIndexes(lines, isNestedCollapserLine);
  if (indexes.length === 0) {
    return { prelude: body, sections: [] };
  }
  const prelude = lines.slice(0, indexes[0]).join('\n');
  const sections = indexes.map((start, position) => {
    const heading = lines[start] ?? '';
    const end = indexes[position + 1] ?? lines.length;
    return {
      title: heading.replace(/^===\s+/, ''),
      body: lines.slice(start + 1, end).join('\n'),
    };
  });
  return { prelude, sections };
};
