export type TreeLocation = {
  project: string;
  path: string;
  open: string[];
};

export const isDocumentPath = (path: string): boolean => {
  const name = path.split('/').pop() ?? '';
  return name.includes('.');
};

export const directoryPrefixes = (path: string): string[] => {
  const parts = path.split('/').filter((part) => part !== '');
  if (parts.length === 0) {
    return [];
  }
  const last = parts[parts.length - 1] ?? '';
  const dirs = last.includes('.') ? parts.slice(0, -1) : parts;
  const prefixes: string[] = [];
  for (let index = 2; index <= dirs.length; index += 1) {
    prefixes.push(dirs.slice(0, index).join('/'));
  }
  return prefixes;
};

export const parseTreeUrl = (search: string): TreeLocation => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    project: params.get('project') ?? '',
    path: params.get('path') ?? '',
    open: params.getAll('open').filter((item) => item !== ''),
  };
};

export const buildTreeSearch = (location: TreeLocation): string => {
  const params = new URLSearchParams();
  if (location.project) {
    params.set('project', location.project);
  }
  if (location.path) {
    params.set('path', location.path);
  }
  const open = [...new Set(location.open.filter((item) => item !== ''))].sort();
  for (const item of open) {
    params.append('open', item);
  }
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

export const expandedPaths = (
  expanded: Record<string, boolean>,
  selected: string,
): string[] => {
  const paths = Object.entries(expanded)
    .filter(([, isOpen]) => isOpen)
    .map(([path]) => path);
  return [...new Set([...paths, ...directoryPrefixes(selected)])];
};
