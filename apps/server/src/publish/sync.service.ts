import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { clearTreeCache } from '../documents/tree';
import { copyDocsProject, docsProjectTreesEqual } from './docs-tree-sync';

const exec = promisify(execFile);

@Injectable()
export class SyncService {
  constructor(
    private readonly workspaceRoot: string,
    private readonly gitRoot: string,
  ) {}

  async sync(project: string): Promise<{ project: string; updated: boolean }> {
    if (!(await this.hasOrigin())) {
      throw new BadRequestException('У репозитория нет origin');
    }
    const docsPath = `docs/${project}`;
    if (await this.isDocsDirty(project, docsPath)) {
      throw new BadRequestException('Сначала опубликуйте локальные изменения');
    }
    try {
      await this.git(['fetch', 'origin', 'main']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка синхронизации';
      throw new BadRequestException(message);
    }
    const mergeBase = await this.git(['merge-base', 'HEAD', 'FETCH_HEAD']).catch(() => null);
    if (!mergeBase?.stdout.trim()) {
      throw new BadRequestException('Изменения разошлись с репозиторием');
    }
    const base = mergeBase.stdout.trim();
    const localUserChanged = await this.localUserChangedSince(base, docsPath, project);
    const remoteChanged = await this.pathChangedSince(base, 'FETCH_HEAD', docsPath);
    if (localUserChanged && remoteChanged) {
      throw new BadRequestException('Изменения разошлись с репозиторием');
    }
    if (!remoteChanged) {
      return { project, updated: false };
    }
    await this.git(['restore', '--source=FETCH_HEAD', '--staged', '--worktree', '--', docsPath]);
    await this.git(['checkout', 'FETCH_HEAD', '--', docsPath]);
    if (this.workspaceRoot !== this.gitRoot) {
      copyDocsProject(this.gitRoot, this.workspaceRoot, project);
    }
    const afterRestore = await this.git(['status', '--porcelain', '--', docsPath]);
    if (afterRestore.stdout.trim()) {
      await this.git([
        '-c',
        'user.name=sdd-visualizer',
        '-c',
        'user.email=sdd@localhost',
        'commit',
        '-m',
        `Sync ${project}`,
        '--',
        docsPath,
      ]);
    }
    clearTreeCache();
    return { project, updated: true };
  }

  private async isDocsDirty(project: string, docsPath: string): Promise<boolean> {
    const porcelain = await this.git(['status', '--porcelain', '--', docsPath]);
    if (porcelain.stdout.trim()) {
      return true;
    }
    if (this.workspaceRoot === this.gitRoot) {
      return false;
    }
    return !docsProjectTreesEqual(this.workspaceRoot, this.gitRoot, project);
  }

  private async hasOrigin(): Promise<boolean> {
    try {
      await this.git(['remote', 'get-url', 'origin']);
      return true;
    } catch {
      return false;
    }
  }

  private async localUserChangedSince(
    base: string,
    docsPath: string,
    project: string,
  ): Promise<boolean> {
    const syncSubject = `Sync ${project}`;
    const log = await this.git(['log', '--format=%s', `${base}..HEAD`, '--', docsPath]);
    const subjects = log.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (subjects.some((subject) => subject !== syncSubject)) {
      return true;
    }
    if (subjects.length > 0) {
      return false;
    }
    return this.pathChangedSince(base, 'HEAD', docsPath);
  }

  private async pathChangedSince(fromRef: string, toRef: string, docsPath: string): Promise<boolean> {
    const diff = await this.git(['diff', '--name-only', fromRef, toRef, '--', docsPath]);
    return Boolean(diff.stdout.trim());
  }

  private git(args: string[]) {
    return exec('git', args, { cwd: this.gitRoot, maxBuffer: 10 * 1024 * 1024 });
  }
}
