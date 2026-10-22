const fenceOpen = /^```(\w*)\s*$/;

const isTableLine = (line: string): boolean => /^\s*\|/.test(line);

const isSeparatorLine = (line: string): boolean =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

const convertInline = (text: string): string => {
  let next = text;
  next = next.replace(
    /\[!\[([^\]]*)\]\(([^)\s]+)\)\]\(([^)\s]+)\)/g,
    (_match, alt: string, src: string, href: string) =>
      alt === '' ? `image:${src}[link=${href}]` : `image:${src}[${alt},link=${href}]`,
  );
  next = next.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, src: string) => `image:${src}[${alt}]`);
  next = next.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    if (/^https?:\/\//.test(href)) {
      return `${href}[${label}]`;
    }
    return `link:${href}[${label}]`;
  });
  next = next.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  return next;
};

const tableCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => convertInline(cell.trim()));

const convertTable = (lines: string[]): string[] => {
  const rows = lines.filter((line) => !isSeparatorLine(line));
  if (rows.length === 0) {
    return [];
  }
  const [header, ...body] = rows;
  const out = ['|===', `| ${tableCells(header ?? '').join(' | ')}`, ''];
  body.forEach((row) => {
    out.push(`| ${tableCells(row).join(' | ')}`);
  });
  out.push('|===');
  return out;
};

export const markdownToAdoc = (markdown: string): string => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const fence = fenceOpen.exec(line);
    if (fence) {
      const lang = fence[1] ?? '';
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        body.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      if (lang === 'mermaid') {
        out.push('[source,mermaid]', '----', ...body, '----', '');
        continue;
      }
      if (lang === 'markdown' || lang === 'md') {
        const converted = markdownToAdoc(body.join('\n')).replace(/\n$/, '');
        out.push('[source,asciidoc]', '----', ...converted.split('\n'), '----', '');
        continue;
      }
      const attr = lang === '' ? '[source]' : `[source,${lang}]`;
      out.push(attr, '----', ...body, '----', '');
      continue;
    }
    if (isTableLine(line)) {
      const table: string[] = [];
      while (index < lines.length && isTableLine(lines[index] ?? '')) {
        table.push(lines[index] ?? '');
        index += 1;
      }
      out.push(...convertTable(table), '');
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quote.push(convertInline((lines[index] ?? '').replace(/^>\s?/, '')));
        index += 1;
      }
      out.push('[quote]', '____', ...quote, '____', '');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      out.push(`${'='.repeat(heading[1].length)} ${convertInline(heading[2] ?? '')}`);
      index += 1;
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[index] ?? '')) {
        const current = lines[index] ?? '';
        if (/^\s*\d+\.\s+/.test(current)) {
          out.push(convertInline(current.replace(/^(\s*)\d+\.\s+/, '$1. ')));
        } else {
          out.push(convertInline(current.replace(/^(\s*)[-*+]\s+/, '$1* ')));
        }
        index += 1;
      }
      continue;
    }
    if (line.trim() === '---' || line.trim() === '***') {
      out.push("'''");
      index += 1;
      continue;
    }
    out.push(convertInline(line));
    index += 1;
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\.md\b/g, '.adoc').trimEnd()}\n`;
};
