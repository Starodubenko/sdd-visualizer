export const getMarkdownSectionBody = (
  content: string,
  sectionTitle: string,
): string | null => {
  const heading = `## ${sectionTitle}`;
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
    if (lines[index].startsWith('## ')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
};

export const replaceMarkdownSectionBody = (
  content: string,
  sectionTitle: string,
  newBody: string,
): string | null => {
  const heading = `## ${sectionTitle}`;
  const lines = content.split('\n');
  let headingIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === heading) {
      headingIndex = index;
      break;
    }
  }
  if (headingIndex === -1) {
    return null;
  }
  let endIndex = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      endIndex = index;
      break;
    }
  }
  const before = lines.slice(0, headingIndex + 1);
  const after = lines.slice(endIndex);
  const nextLines = [...before, '', newBody];
  if (after.length > 0) {
    nextLines.push('');
  }
  nextLines.push(...after);
  return nextLines.join('\n');
};
