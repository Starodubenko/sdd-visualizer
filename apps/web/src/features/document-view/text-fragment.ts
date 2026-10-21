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
