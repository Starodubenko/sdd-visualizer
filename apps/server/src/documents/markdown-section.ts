const FENCES = ['----', '....', '____', '====', '|==='] as const;

const sectionEnd = (lines: string[], from: number): number => {
  let fence: string | null = null;
  for (let index = from; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (fence) {
      if (trimmed === fence) {
        fence = null;
      }
      continue;
    }
    if ((FENCES as readonly string[]).includes(trimmed)) {
      fence = trimmed;
      continue;
    }
    if (/^== [^=]/.test(line)) {
      return index;
    }
  }
  return lines.length;
};

const findHeading = (lines: string[], heading: string): number => {
  let fence: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (fence) {
      if (trimmed === fence) {
        fence = null;
      }
      continue;
    }
    if ((FENCES as readonly string[]).includes(trimmed)) {
      fence = trimmed;
      continue;
    }
    if (line === heading) {
      return index;
    }
  }
  return -1;
};

export const getMarkdownSectionBody = (
  content: string,
  sectionTitle: string,
): string | null => {
  const lines = content.split('\n');
  const start = findHeading(lines, `== ${sectionTitle}`);
  if (start === -1) {
    return null;
  }
  const end = sectionEnd(lines, start + 1);
  return lines.slice(start + 1, end).join('\n').trim();
};

export const replaceMarkdownSectionBody = (
  content: string,
  sectionTitle: string,
  newBody: string,
): string | null => {
  const lines = content.split('\n');
  const headingIndex = findHeading(lines, `== ${sectionTitle}`);
  if (headingIndex === -1) {
    return null;
  }
  const endIndex = sectionEnd(lines, headingIndex + 1);
  const before = lines.slice(0, headingIndex + 1);
  const after = lines.slice(endIndex);
  const nextLines = [...before, '', newBody];
  if (after.length > 0) {
    nextLines.push('');
  }
  nextLines.push(...after);
  return nextLines.join('\n');
};
