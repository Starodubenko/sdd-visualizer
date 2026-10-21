import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ChangesService, type ProjectChanges } from './changes.service';
import { copyDocsProject } from './docs-tree-sync';

const exec = promisify(execFile);

const buildCommitMessage = (projects: ProjectChanges[]): string => {
  const lines = ['Изменена документация'];

  for (const project of projects) {
    lines.push(` - ${project.name}`);

    const rootDocs: string[] = [];
    const featureDocs = new Map<string, string[]>();

    for (const entry of project.entries) {
      const slash = entry.path.indexOf('/');
      if (slash === -1) {
        rootDocs.push(entry.path);
      } else {
        const feature = entry.path.slice(0, slash);
        const doc = entry.path.slice(slash + 1);
        const docs = featureDocs.get(feature) ?? [];
        docs.push(doc);
        featureDocs.set(feature, docs);
      }
    }

    rootDocs.sort();
    for (const doc of rootDocs) {
      lines.push(`    - ${doc}`);
    }

    const features = [...featureDocs.keys()].sort();
    for (const feature of features) {
      lines.push(`    - ${feature}`);
      const docs = [...new Set(featureDocs.get(feature)!)].sort();
      for (const doc of docs) {
        lines.push(`       - ${doc}`);
      }
    }
  }

  return lines.join('\n');
};

const gitFailureMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = String((error as { stderr?: Buffer | string }).stderr ?? '');
    const line = stderr
      .split('\n')
      .map((part) => part.trim())
      .find((part) => part.length > 0);
    if (line) {
      return line;
    }
  }
  if (error instanceof Error) {
    const fromMessage = error.message
      .split('\n')
      .map((part) => part.trim())
      .find((part) => part.length > 0 && !part.startsWith('Command failed'));
    if (fromMessage) {
      return fromMessage;
    }
  }
  return 'Не удалось опубликовать';
};

@Injectable()
export class PublishService {
  constructor(
    private readonly workspaceRoot: string,
    private readonly gitRoot: string,
    private readonly changesService: ChangesService,
  ) {}

  async publish(): Promise<{ pushed: true }> {
    if (!(await this.hasOrigin())) {
      throw new BadRequestException('У репозитория нет origin');
    }
    const { projects } = await this.changesService.list();
    if (projects.length === 0) {
      throw new BadRequestException('Нет изменений для публикации');
    }
    if (this.workspaceRoot !== this.gitRoot) {
      for (const project of projects) {
        copyDocsProject(this.workspaceRoot, this.gitRoot, project.name);
      }
    }
    for (const project of projects) {
      await this.git(['add', '-A', '--', `docs/${project.name}`]);
    }
    const porcelainParts = await Promise.all(
      projects.map((project) =>
        this.git(['status', '--porcelain', '--', `docs/${project.name}`]).then(
          (result) => result.stdout,
        ),
      ),
    );
    const porcelain = porcelainParts.join('\n').trim();
    if (porcelain) {
      const message = buildCommitMessage(projects);
      try {
        await this.git([
          '-c',
          'user.name=sdd-visualizer',
          '-c',
          'user.email=sdd@localhost',
          'commit',
          '-m',
          message,
        ]);
      } catch (error) {
        throw new BadRequestException(gitFailureMessage(error));
      }
    }
    try {
      await this.git(['push', 'origin', 'HEAD']);
    } catch (error) {
      throw new BadRequestException(gitFailureMessage(error));
    }
    return { pushed: true };
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
    return exec('git', args, { cwd: this.gitRoot, maxBuffer: 10 * 1024 * 1024 });
  }
}
