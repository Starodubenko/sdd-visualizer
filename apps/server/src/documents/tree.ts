import { readdir, stat } from 'fs/promises';

export type TreeEntry = {
  name: string;
  kind: 'dir' | 'file';
  status?: 'in_progress' | 'ready' | 'done' | 'changes';
  path?: string;
  hasOpenChange?: boolean;
};

type CacheEntry = {
  mtimeMs: number;
  entries: TreeEntry[];
};

const cache = new Map<string, CacheEntry>();

export const clearTreeCache = (): void => {
  cache.clear();
};

export const listDirectory = async (absoluteDir: string): Promise<TreeEntry[]> => {
  const info = await stat(absoluteDir);
  const cached = cache.get(absoluteDir);
  if (cached && cached.mtimeMs === info.mtimeMs) {
    return cached.entries;
  }
  const dirents = await readdir(absoluteDir, { withFileTypes: true });
  const entries = dirents
    .filter((dirent) => dirent.name !== '.gitkeep')
    .map((dirent) => ({
      name: dirent.name,
      kind: dirent.isDirectory() ? ('dir' as const) : ('file' as const),
    }))
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'dir' ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  cache.set(absoluteDir, { mtimeMs: info.mtimeMs, entries });
  return entries;
};
