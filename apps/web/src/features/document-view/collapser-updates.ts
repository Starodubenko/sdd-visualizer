const STATUS_DIRS = ['in-progress', 'ready-to-implement', 'done'] as const;

const UPDATES_SEGMENT = '/updates/';

const METADATA_LINE = /^(\w+):\s*(.+)$/;

export type AppliedUpdateMeta = {
  path: string;
  fileName: string;
  timestampPrefix: string;
  source: string;
  section: string;
};

export const isUpdatesDocumentPath = (documentPath: string): boolean =>
  documentPath.includes(UPDATES_SEGMENT);

export const featureRootFromSpecPath = (documentPath: string): string | null => {
  if (isUpdatesDocumentPath(documentPath)) {
    return null;
  }
  const parts = documentPath.split('/').filter((part) => part !== '');
  if (parts.length < 2 || parts[0] !== 'docs') {
    return null;
  }
  const statusIndex = parts.findIndex((part) =>
    (STATUS_DIRS as readonly string[]).includes(part),
  );
  if (statusIndex < 0 || statusIndex < 3) {
    return null;
  }
  return parts.slice(0, statusIndex).join('/');
};

export const featureUpdatesDoneTreePath = (documentPath: string): string | null => {
  const featureRoot = featureRootFromSpecPath(documentPath);
  if (!featureRoot) {
    return null;
  }
  return `${featureRoot}/updates/done`;
};

export const featureUpdatesInProgressTreePath = (documentPath: string): string | null => {
  const featureRoot = featureRootFromSpecPath(documentPath);
  if (!featureRoot) {
    return null;
  }
  return `${featureRoot}/updates/in-progress`;
};

export const parseUpdateTimestampPrefix = (fileName: string): string | null => {
  const match = /^(\d{4}-\d{2}-\d{2}-\d{4})-.+\.md$/i.exec(fileName);
  return match ? match[1] : null;
};

export const formatUpdateDateDisplay = (timestampPrefix: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})-\d{4}$/.exec(timestampPrefix);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
};

export const formatAppliedUpdateLinkLabel = (timestampPrefix: string): string | null => {
  const dateLabel = formatUpdateDateDisplay(timestampPrefix);
  if (!dateLabel) {
    return null;
  }
  return `Последние изменения ${dateLabel}`;
};

export const compareUpdateTimestampPrefix = (left: string, right: string): number =>
  left.localeCompare(right);

export const parseUpdateFileMetadata = (
  content: string,
): { source: string | null; section: string | null } => {
  let source: string | null = null;
  let section: string | null = null;
  for (const line of content.split('\n')) {
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
  return { source, section };
};

export const sectionHasOpenChange = (
  openUpdates: AppliedUpdateMeta[],
  sourceFileName: string,
  sectionTitle: string,
): boolean =>
  openUpdates.some(
    (entry) => entry.source === sourceFileName && entry.section === sectionTitle,
  );

export const fileHasOpenChange = (
  openUpdates: AppliedUpdateMeta[],
  sourceFileName: string,
): boolean => openUpdates.some((entry) => entry.source === sourceFileName);

export const findLatestAppliedUpdate = (
  updates: AppliedUpdateMeta[],
  sourceFileName: string,
  sectionTitle: string,
): AppliedUpdateMeta | null => {
  const matches = updates.filter(
    (entry) => entry.source === sourceFileName && entry.section === sectionTitle,
  );
  if (matches.length === 0) {
    return null;
  }
  return matches.reduce((latest, entry) =>
    compareUpdateTimestampPrefix(entry.timestampPrefix, latest.timestampPrefix) > 0
      ? entry
      : latest,
  );
};

export const buildAppliedUpdateMeta = (
  path: string,
  content: string,
): AppliedUpdateMeta | null => {
  const fileName = path.split('/').pop() ?? '';
  const timestampPrefix = parseUpdateTimestampPrefix(fileName);
  if (!timestampPrefix) {
    return null;
  }
  const { source, section } = parseUpdateFileMetadata(content);
  if (!source || !section) {
    return null;
  }
  return {
    path,
    fileName,
    timestampPrefix,
    source,
    section,
  };
};
