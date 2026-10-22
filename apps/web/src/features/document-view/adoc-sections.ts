export type AdocSection = {
  title: string;
  body: string;
};

export type SplitAdoc = {
  prelude: string;
  sections: AdocSection[];
};

const FENCES = ['----', '....', '____', '====', '|==='] as const;

export const isAdocSectionLine = (line: string): boolean => /^== [^=]/.test(line);

export const sectionLineIndexes = (lines: string[]): number[] => {
  const indexes: number[] = [];
  let fence: string | null = null;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (fence) {
      if (trimmed === fence) {
        fence = null;
      }
      return;
    }
    if ((FENCES as readonly string[]).includes(trimmed)) {
      fence = trimmed;
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
