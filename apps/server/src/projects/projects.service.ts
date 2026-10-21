import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { parse, stringify } from 'yaml';
import { isFeatureId } from '../documents/paths';

export type ProjectConfig = {
  remote: string;
  token: string;
};

export type PublicProject = {
  name: string;
  remote: string;
  hasToken: boolean;
};

type ConfigFile = Record<string, ProjectConfig>;

const toPublic = (name: string, config: ProjectConfig): PublicProject => ({
  name,
  remote: config.remote ?? '',
  hasToken: Boolean(config.token),
});

@Injectable()
export class ProjectsService {
  constructor(private readonly root: string) {}

  private configPath(): string {
    return join(this.root, 'global', 'configs.yaml');
  }

  async readAll(): Promise<ConfigFile> {
    const raw = await readFile(this.configPath(), 'utf8').catch(() => '');
    if (!raw.trim()) {
      return {};
    }
    const parsed = parse(raw) as ConfigFile | null;
    return parsed ?? {};
  }

  async listPublic(): Promise<PublicProject[]> {
    const all = await this.readAll();
    return Object.entries(all).map(([name, config]) => toPublic(name, config));
  }

  async getPublic(name: string): Promise<PublicProject> {
    const all = await this.readAll();
    const config = all[name] ?? { remote: '', token: '' };
    return toPublic(name, config);
  }

  async save(name: string, remote: string, token: string | undefined): Promise<PublicProject> {
    if (!isFeatureId(name) || name === 'method') {
      throw new BadRequestException('Некорректное имя проекта');
    }
    await mkdir(join(this.root, 'docs', name), { recursive: true });
    const all = await this.readAll();
    const previous = all[name]?.token ?? '';
    const nextToken = token && token.trim() ? token : previous;
    all[name] = { remote, token: nextToken };
    await mkdir(dirname(this.configPath()), { recursive: true });
    await writeFile(this.configPath(), stringify(all), 'utf8');
    return toPublic(name, all[name]);
  }

  async getSecret(name: string): Promise<ProjectConfig | undefined> {
    const all = await this.readAll();
    return all[name];
  }
}
