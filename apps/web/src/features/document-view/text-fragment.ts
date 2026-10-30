export const normalizeFragment = (text: string): string => text.replace(/\s+/g, ' ').trim();

const fragmentLabel = (normalized: string): string => {
  const raw = normalized.replace(/[[\]]/g, ' ');
  if (raw.length <= 80) {
    return raw;
  }
  return `${raw.slice(0, 80)}…`;
};

export const fragmentLink = (fileName: string, text: string): string => {
  const normalized = normalizeFragment(text);
  const label = fragmentLabel(normalized);
  return `[${label}](${fileName}#t=${encodeURIComponent(normalized)})`;
};

export const fragmentBrowserHref = (pageHref: string, text: string): string => {
  const url = new URL(pageHref);
  url.hash = `t=${normalizeFragment(text)}`;
  return url.toString();
};

export const textFromFragmentHash = (hash: string): string | null => {
  const raw = hash.replace(/^#/, '');
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (!decoded.startsWith('t=')) {
    return null;
  }
  const text = normalizeFragment(decoded.slice(2));
  return text === '' ? null : text;
};

export const parseFragmentBrowserUrl = (raw: string): { path: string; text: string } | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const text = textFromFragmentHash(url.hash);
  const path = url.searchParams.get('path') ?? '';
  if (!text || !path.startsWith('docs/') || !/\.adoc$/i.test(path)) {
    return null;
  }
  return { path, text };
};

export const adocFragmentLink = (relativePath: string, text: string): string => {
  const normalized = normalizeFragment(text);
  return `xref:${relativePath}#t=${encodeURIComponent(normalized)}[${fragmentLabel(normalized)}]`;
};

export const fragmentFromHref = (href: string): { path: string; text: string } | null => {
  const hashIndex = href.indexOf('#t=');
  if (hashIndex === -1) {
    return null;
  }
  const path = href.slice(0, hashIndex);
  const encoded = href.slice(hashIndex + 3);
  try {
    return { path, text: decodeURIComponent(encoded) };
  } catch {
    return null;
  }
};
