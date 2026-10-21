import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import { join } from 'path';
import type { Response } from 'express';
import { DocumentsService } from '../documents/documents.service';
import { ProjectsService } from '../projects/projects.service';

export type PageData =
  | {
      page: 'workspace';
      workspace: {
        projects: string[];
        featureEntries: { name: string; kind: 'dir' | 'file' }[];
      };
    }
  | {
      page: 'admin';
      admin: { projects: { name: string; remote: string; hasToken: boolean }[] };
    };

type ServerEntry = {
  renderPage: (response: Response, data: PageData) => void;
};

@Injectable()
export class SsrService {
  constructor(
    private readonly documents: DocumentsService,
    private readonly projects: ProjectsService,
  ) {}

  async workspaceData(): Promise<PageData> {
    const docsEntries = await this.documents.list('docs').catch(() => []);
    const projects = docsEntries
      .filter((entry) => entry.kind === 'dir' && entry.name !== 'method')
      .map((entry) => entry.name);
    const firstProject = projects[0];
    const featureEntries = firstProject
      ? await this.documents.list(`docs/${firstProject}`).catch(() => [])
      : [];
    return {
      page: 'workspace',
      workspace: {
        projects,
        featureEntries,
      },
    };
  }

  async adminData(): Promise<PageData> {
    const projects = await this.projects.listPublic();
    return { page: 'admin', admin: { projects } };
  }

  async render(response: Response, data: PageData): Promise<void> {
    const entryPath = join(__dirname, '../../../web/dist/server/entry-server.cjs');
    const entry = createRequire(__filename)(entryPath) as ServerEntry;
    entry.renderPage(response, data);
  }
}
