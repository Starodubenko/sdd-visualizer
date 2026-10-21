import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
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
export class PublishService {
  constructor(
    private readonly root: string,
    private readonly projects: ProjectsService,
  ) {}

  async publish(project: string): Promise<{ project: string }> {
    const secret = await this.projects.getSecret(project);
    if (!secret?.remote) {
      throw new BadRequestException('У проекта нет адреса репозитория');
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
    const remote = withToken(secret.remote, secret.token);
    try {
      await this.git(['push', remote, 'HEAD:main']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка публикации';
      const safe = secret.token ? message.replaceAll(secret.token, '***') : message;
      throw new BadRequestException(safe);
    }
    return { project };
  }

  private git(args: string[]) {
    return exec('git', args, { cwd: this.root });
  }
}
