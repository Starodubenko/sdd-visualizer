import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { clearTreeCache } from '../documents/tree';
import { ProjectsService } from '../projects/projects.service';

const exec = promisify(execFile);

const withToken = (remote: string, token: string): string => {
  if (!token || !/^https?:\/\//.test(remote)) {
    return remote;
  }
  const url = new URL(remote);
  url.username = 'x-access-token';
  url.password = token;
  return url.toString();
};

@Injectable()
export class SyncService {
  constructor(
    private readonly root: string,
    private readonly projects: ProjectsService,
  ) {}

  async sync(project: string): Promise<{ project: string; updated: boolean }> {
    const secret = await this.projects.getSecret(project);
    if (!secret?.remote) {
      throw new BadRequestException('У проекта нет адреса репозитория');
    }
    const docsPath = `docs/${project}`;
    const porcelain = await this.git(['status', '--porcelain', '--', docsPath]);
    if (porcelain.stdout.trim()) {
      throw new BadRequestException('Сначала опубликуйте локальные изменения');
    }
    const remote = withToken(secret.remote, secret.token);
    try {
      await this.git(['fetch', remote, 'main']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка синхронизации';
      const safe = secret.token ? message.replaceAll(secret.token, '***') : message;
      throw new BadRequestException(safe);
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
    return exec('git', args, { cwd: this.root, maxBuffer: 10 * 1024 * 1024 });
  }
}
