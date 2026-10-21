export type JsonToken = {
  kind: 'key' | 'string' | 'number' | 'literal' | 'punct' | 'space';
  text: string;
};

export const formatJson = (source: string): string | null => {
  try {
    const value = JSON.parse(source) as unknown;
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
};

const readQuotedString = (pretty: string, start: number): { text: string; end: number } => {
  let index = start + 1;
  while (index < pretty.length) {
    const ch = pretty[index];
    if (ch === '\\') {
      index += 2;
      continue;
    }
    if (ch === '"') {
      return { text: pretty.slice(start, index + 1), end: index + 1 };
    }
    index += 1;
  }
  return { text: pretty.slice(start), end: pretty.length };
};

const isKeyAt = (pretty: string, end: number): boolean => {
  let index = end;
  while (index < pretty.length && /\s/.test(pretty[index] ?? '')) {
    index += 1;
  }
  return pretty[index] === ':';
};

const readNumber = (pretty: string, start: number): { text: string; end: number } => {
  let index = start;
  if (pretty[index] === '-') {
    index += 1;
  }
  while (index < pretty.length && /[0-9]/.test(pretty[index] ?? '')) {
    index += 1;
  }
  if (pretty[index] === '.') {
    index += 1;
    while (index < pretty.length && /[0-9]/.test(pretty[index] ?? '')) {
      index += 1;
    }
  }
  if (pretty[index] === 'e' || pretty[index] === 'E') {
    index += 1;
    if (pretty[index] === '+' || pretty[index] === '-') {
      index += 1;
    }
    while (index < pretty.length && /[0-9]/.test(pretty[index] ?? '')) {
      index += 1;
    }
  }
  return { text: pretty.slice(start, index), end: index };
};

const readLiteral = (
  pretty: string,
  start: number,
): { text: string; end: number; kind: 'literal' } | null => {
  const rest = pretty.slice(start);
  if (rest.startsWith('true')) {
    return { text: 'true', end: start + 4, kind: 'literal' };
  }
  if (rest.startsWith('false')) {
    return { text: 'false', end: start + 5, kind: 'literal' };
  }
  if (rest.startsWith('null')) {
    return { text: 'null', end: start + 4, kind: 'literal' };
  }
  return null;
};

const punctChars = new Set(['{', '}', '[', ']', ',', ':']);

export const tokenizeJson = (pretty: string): JsonToken[] => {
  const tokens: JsonToken[] = [];
  let index = 0;

  while (index < pretty.length) {
    const ch = pretty[index];

    if (ch === '"') {
      const { text, end } = readQuotedString(pretty, index);
      tokens.push({ kind: isKeyAt(pretty, end) ? 'key' : 'string', text });
      index = end;
      continue;
    }

    if (/\s/.test(ch)) {
      let end = index + 1;
      while (end < pretty.length && /\s/.test(pretty[end] ?? '')) {
        end += 1;
      }
      tokens.push({ kind: 'space', text: pretty.slice(index, end) });
      index = end;
      continue;
    }

    if (ch === '-' || /[0-9]/.test(ch)) {
      const { text, end } = readNumber(pretty, index);
      if (text.length > 0 && text !== '-') {
        tokens.push({ kind: 'number', text });
        index = end;
        continue;
      }
    }

    const literal = readLiteral(pretty, index);
    if (literal) {
      tokens.push({ kind: literal.kind, text: literal.text });
      index = literal.end;
      continue;
    }

    if (punctChars.has(ch)) {
      tokens.push({ kind: 'punct', text: ch });
      index += 1;
      continue;
    }

    tokens.push({ kind: 'punct', text: ch });
    index += 1;
  }

  return tokens;
};
