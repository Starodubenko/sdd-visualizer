import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { copyDocsProject } from './docs-tree-sync';

const exec = promisify(execFile);

@Injectable()
export class PublishService {
  constructor(
    private readonly workspaceRoot: string,
    private readonly gitRoot: string,
  ) {}

  async publish(project: string): Promise<{ project: string }> {
    if (!(await this.hasOrigin())) {
      throw new BadRequestException('У репозитория нет origin');
    }
    if (this.workspaceRoot !== this.gitRoot) {
      copyDocsProject(this.workspaceRoot, this.gitRoot, project);
    }
    const docsPath = `docs/${project}`;
    await this.git(['add', '--', docsPath]);
    const status = await this.git(['status', '--porcelain', '--', docsPath]);
    if (status.stdout.trim()) {
      await this.git([
        '-c',
        'user.name=sdd-visualizer',
        '-c',
        'user.email=sdd@localhost',
        'commit',
        '-m',
        `Publish ${project}`,
      ]);
    }
    try {
      await this.git(['push', 'origin', 'HEAD']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка публикации';
      throw new BadRequestException(message);
    }
    return { project };
  }

  private async hasOrigin(): Promise<boolean> {
    try {
      await this.git(['remote', 'get-url', 'origin']);
      return true;
    } catch {
      return false;
    }
  }

  private git(args: string[]) {
    return exec('git', args, { cwd: this.gitRoot });
  }
}
