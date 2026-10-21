import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';

export const docsProjectPath = (root: string, project: string): string =>
  join(root, 'docs', project);

export const copyDocsProject = (fromRoot: string, toRoot: string, project: string): void => {
  const src = docsProjectPath(fromRoot, project);
  const dest = docsProjectPath(toRoot, project);
  if (!existsSync(src)) {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }
    return;
  }
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
};

const toPosixPath = (rel: string): string => rel.split('\\').join('/');

const listFiles = (dir: string, base = dir): string[] => {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    const rel = toPosixPath(full.slice(base.length + 1));
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full, base));
    } else {
      files.push(rel);
    }
  }
  return files.sort();
};

export type DocsProjectChangeStatus = 'added' | 'modified' | 'deleted';

export type DocsProjectChange = {
  path: string;
  status: DocsProjectChangeStatus;
};

export const diffDocsProject = (
  workspaceRoot: string,
  baselineRoot: string,
  project: string,
): DocsProjectChange[] => {
  const workspaceBase = docsProjectPath(workspaceRoot, project);
  const baselineBase = docsProjectPath(baselineRoot, project);
  const workspaceFiles = listFiles(workspaceBase);
  const baselineFiles = listFiles(baselineBase);
  const workspaceSet = new Set(workspaceFiles);
  const baselineSet = new Set(baselineFiles);
  const allPaths = [...new Set([...workspaceFiles, ...baselineFiles])].sort();
  const changes: DocsProjectChange[] = [];
  for (const path of allPaths) {
    const inWorkspace = workspaceSet.has(path);
    const inBaseline = baselineSet.has(path);
    if (inWorkspace && !inBaseline) {
      changes.push({ path, status: 'added' });
    } else if (!inWorkspace && inBaseline) {
      changes.push({ path, status: 'deleted' });
    } else if (inWorkspace && inBaseline) {
      const workspaceText = readFileSync(join(workspaceBase, path));
      const baselineText = readFileSync(join(baselineBase, path));
      if (!workspaceText.equals(baselineText)) {
        changes.push({ path, status: 'modified' });
      }
    }
  }
  return changes;
};

export const docsProjectTreesEqual = (aRoot: string, bRoot: string, project: string): boolean => {
  const aBase = docsProjectPath(aRoot, project);
  const bBase = docsProjectPath(bRoot, project);
  const aFiles = listFiles(aBase);
  const bFiles = listFiles(bBase);
  if (aFiles.length !== bFiles.length) {
    return false;
  }
  for (let i = 0; i < aFiles.length; i += 1) {
    if (aFiles[i] !== bFiles[i]) {
      return false;
    }
    const aText = readFileSync(join(aBase, aFiles[i]));
    const bText = readFileSync(join(bBase, bFiles[i]));
    if (!aText.equals(bText)) {
      return false;
    }
  }
  return true;
};
