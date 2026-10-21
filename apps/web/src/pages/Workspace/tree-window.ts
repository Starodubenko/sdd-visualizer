export type FeatureStatus = 'in_progress' | 'ready' | 'done' | 'changes';

export type FeatureStatusFilter = 'all' | FeatureStatus;

export type FeatureFilterQuery = {
  nameQuery: string;
  status: FeatureStatusFilter;
};

export const isFeatureFilterActive = (query: FeatureFilterQuery): boolean =>
  query.nameQuery.trim() !== '' || query.status !== 'all';

export const featureMatchesFilter = (
  featureName: string,
  featureStatus: FeatureStatus | undefined,
  query: FeatureFilterQuery,
): boolean => {
  const needle = query.nameQuery.trim();
  if (needle !== '' && !featureName.toLowerCase().includes(needle.toLowerCase())) {
    return false;
  }
  if (query.status !== 'all' && featureStatus !== query.status) {
    return false;
  }
  return true;
};

export const KEY_FILE_NAMES = [
  'analyst.md',
  'designer.md',
  'backend.md',
  'tester.yaml',
  'frontend.md',
] as const;

export const isKeyFileName = (name: string): boolean =>
  (KEY_FILE_NAMES as readonly string[]).includes(name);

export const isFeatureId = (value: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const STATUS_DIR_NAMES = ['in-progress', 'ready-to-implement', 'done'] as const;

export const resolveFeaturePath = (
  selected: string,
  featureNodePath: string | null,
): string | null => {
  if (featureNodePath) {
    return featureNodePath;
  }
  const parts = selected.split('/').filter((part) => part !== '');
  if (parts.length === 0 || parts[0] !== 'docs') {
    return null;
  }
  const last = parts[parts.length - 1];
  if (last.includes('.')) {
    parts.pop();
  }
  const statusIndex = parts.findIndex((part) =>
    (STATUS_DIR_NAMES as readonly string[]).includes(part),
  );
  if (statusIndex >= 0) {
    parts.splice(statusIndex);
  }
  if (parts.length >= 3) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return null;
};

export const otherStatuses = (current: FeatureStatus): FeatureStatus[] => {
  const all: FeatureStatus[] = ['in_progress', 'ready', 'done'];
  return all.filter((status) => status !== current);
};

export const visibleRange = (
  count: number,
  scrollTop: number,
  rowHeight: number,
  viewport: number,
): { start: number; end: number } => {
  if (count <= 200) {
    return { start: 0, end: count };
  }
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const visible = Math.ceil(viewport / rowHeight) + 10;
  return { start, end: Math.min(count, start + visible) };
};

export const resolveRelative = (documentPath: string, src: string): string => {
  if (/^https?:\/\//.test(src) || src.startsWith('/')) {
    return src;
  }
  const stack = documentPath.split('/').slice(0, -1);
  src.split('/').forEach((part) => {
    if (part === '..') {
      stack.pop();
      return;
    }
    if (part !== '.' && part !== '') {
      stack.push(part);
    }
  });
  return stack.join('/');
};

export const statusLabel = (status: FeatureStatus): string => {
  if (status === 'changes') {
    return 'Внесены изменения';
  }
  if (status === 'done') {
    return 'Выполнено';
  }
  if (status === 'ready') {
    return 'Готово к реализации';
  }
  return 'В процессе';
};

export const statusTagClass = (status: FeatureStatus): string => {
  if (status === 'changes') {
    return 'status-tag status-tag-changes';
  }
  if (status === 'done') {
    return 'status-tag status-tag-done';
  }
  if (status === 'ready') {
    return 'status-tag status-tag-ready';
  }
  return 'status-tag status-tag-in-progress';
};

export const treeStatusClass = (status: FeatureStatus): string => {
  if (status === 'changes') {
    return 'tree-status tree-status-changes';
  }
  if (status === 'done') {
    return 'tree-status tree-status-done';
  }
  if (status === 'ready') {
    return 'tree-status tree-status-ready';
  }
  return 'tree-status tree-status-in-progress';
};

export const displayDocumentPath = (path: string): string =>
  path
    .split('/')
    .filter(
      (segment) =>
        segment !== 'docs' &&
        segment !== 'in-progress' &&
        segment !== 'ready-to-implement' &&
        segment !== 'done',
    )
    .join('/');
