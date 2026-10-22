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

export const sectionLineIndexes = (lines: string[]): number[] => {
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
    if (isAdocSectionLine(line)) {
      indexes.push(index);
    }
  });
  return indexes;
};

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
