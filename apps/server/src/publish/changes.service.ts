import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { buildCommitMessage } from './commit-message';
import { diffDocsProject, type DocsProjectChange } from './docs-tree-sync';

const exec = promisify(execFile);

const EXCLUDED_PROJECTS = new Set(['method', 'global']);

export type ChangeEntry = DocsProjectChange;

export type ProjectChanges = {
  name: string;
  entries: ChangeEntry[];
};

export type ChangesList = {
  projects: ProjectChanges[];
  message: string;
};

const listDocsProjectNames = (root: string): string[] => {
  const docsPath = join(root, 'docs');
  if (!existsSync(docsPath)) {
    return [];
  }
  return readdirSync(docsPath)
    .filter((name) => {
      if (name.startsWith('.') || EXCLUDED_PROJECTS.has(name)) {
        return false;
      }
      return statSync(join(docsPath, name)).isDirectory();
    })
    .sort();
};

const parseGitStatusLine = (line: string): { project: string; path: string; status: ChangeEntry['status'] } | null => {
  if (line.length < 4 || line[2] !== ' ') {
    return null;
  }
  const statusChars = line.slice(0, 2);
  if (!/^[ MADRCU?!]{2}$/.test(statusChars)) {
    return null;
  }
  const filePath = line.slice(3);
  if (!filePath.startsWith('docs/')) {
    return null;
  }
  const relative = filePath.slice('docs/'.length);
  const slash = relative.indexOf('/');
  if (slash === -1) {
    return null;
  }
  const project = relative.slice(0, slash);
  if (EXCLUDED_PROJECTS.has(project) || project.startsWith('.')) {
    return null;
  }
  const path = relative.slice(slash + 1);
  if (!path) {
    return null;
  }
  const indexStatus = statusChars[0];
  const workTreeStatus = statusChars[1];
  const combined = `${indexStatus}${workTreeStatus}`;
  let status: ChangeEntry['status'];
  if (combined === '??' || (combined.includes('A') && !combined.includes('D'))) {
    status = 'added';
  } else if (combined.includes('D') && !combined.includes('A')) {
    status = 'deleted';
  } else {
    status = 'modified';
  }
  return { project, path, status };
};

@Injectable()
export class ChangesService {
  constructor(
    private readonly workspaceRoot: string,
    private readonly gitRoot: string,
  ) {}

  async list(): Promise<ChangesList> {
    const workspace = resolve(this.workspaceRoot);
    const git = resolve(this.gitRoot);
    if (workspace !== git) {
      return this.listFromDiskDiff(workspace, git);
    }
    return this.listFromGitStatus(git);
  }

  private listFromDiskDiff(workspace: string, baseline: string): ChangesList {
    const names = [
      ...new Set([...listDocsProjectNames(workspace), ...listDocsProjectNames(baseline)]),
    ].sort();
    const projects: ProjectChanges[] = [];
    for (const name of names) {
      const entries = diffDocsProject(workspace, baseline, name);
      if (entries.length > 0) {
        projects.push({ name, entries });
      }
    }
    return this.withMessage(projects);
  }

  private async listFromGitStatus(gitRoot: string): Promise<ChangesList> {
    const { stdout } = await exec(
      'git',
      [
        '-c',
        'core.quotepath=false',
        '-c',
        'status.renames=false',
        'status',
        '--porcelain=v1',
        '--untracked-files=all',
        '--',
        'docs',
      ],
      { cwd: gitRoot },
    );
    const byProject = new Map<string, ChangeEntry[]>();
    for (const line of stdout.split('\n')) {
      if (!line) {
        continue;
      }
      const parsed = parseGitStatusLine(line);
      if (!parsed) {
        continue;
      }
      const list = byProject.get(parsed.project) ?? [];
      list.push({ path: parsed.path, status: parsed.status });
      byProject.set(parsed.project, list);
    }
    const projects: ProjectChanges[] = [...byProject.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, entries]) => ({
        name,
        entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
      }));
    return this.withMessage(projects);
  }

  private withMessage(projects: ProjectChanges[]): ChangesList {
    return {
      projects,
      message: projects.length > 0 ? buildCommitMessage(projects) : '',
    };
  }
}
