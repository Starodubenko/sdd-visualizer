export type LinkifyPart =
  | { kind: 'text'; value: string }
  | { kind: 'file'; value: string };

const FILE_EXT = /\.(adoc|md|yaml|yml)$/i;

const STATUS_DIRS = ['in-progress', 'ready-to-implement', 'done'] as const;

const stripHash = (href: string): string => {
  const index = href.indexOf('#');
  return index === -1 ? href : href.slice(0, index);
};

export const fileHref = (href: string): string | null => {
  if (!href || href.startsWith('http://') || href.startsWith('https://')) {
    return null;
  }
  const path = stripHash(href);
  if (!path || path.startsWith('#')) {
    return null;
  }
  return FILE_EXT.test(path) ? path : null;
};

export const alternateStatusPaths = (path: string): string[] => {
  const found = STATUS_DIRS.find((dir) => path.includes(`/${dir}/`));
  if (!found) {
    return [];
  }
  return STATUS_DIRS.filter((dir) => dir !== found).map((dir) =>
    path.replace(`/${found}/`, `/${dir}/`),
  );
};

const UPDATES_SEGMENT = '/updates/';

const linkedBaseName = (fileName: string): string => {
  const trimmed = fileName.trim().replace(/^\.\//, '');
  const parts = trimmed.split('/');
  return parts[parts.length - 1] ?? trimmed;
};

export const updateFeatureStatusCandidates = (
  documentPath: string,
  linkedFileName: string,
): string[] => {
  const updatesIndex = documentPath.indexOf(UPDATES_SEGMENT);
  if (updatesIndex === -1) {
    return [];
  }
  const featureRoot = documentPath.slice(0, updatesIndex + 1);
  const name = linkedBaseName(linkedFileName);
  return STATUS_DIRS.map((dir) => `${featureRoot}${dir}/${name}`);
};

const METADATA_LINE = /^(\w+):\s*(.+)$/;

export const updateLinkedSectionHighlight = (
  updateContent: string,
  linkedFileName: string,
): string | null => {
  let source: string | null = null;
  let section: string | null = null;
  for (const line of updateContent.split('\n')) {
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
  if (!source || !section) {
    return null;
  }
  return linkedBaseName(source) === linkedBaseName(linkedFileName) ? section : null;
};

const FILE_TOKEN =
  /(?:^|[\s(])([^\s/()]+\.(?:adoc|md|yaml|yml))(?=[\s.,;:)]|$)/gi;

export const linkifyText = (text: string): LinkifyPart[] => {
  const parts: LinkifyPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(FILE_TOKEN)) {
    const full = match[0];
    const name = match[1];
    const start = match.index ?? 0;
    const nameStart = start + full.length - name.length;
    if (nameStart > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, nameStart) });
    }
    parts.push({ kind: 'file', value: name });
    lastIndex = nameStart + name.length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  if (parts.length === 0) {
    return [{ kind: 'text', value: text }];
  }
  return parts;
};
