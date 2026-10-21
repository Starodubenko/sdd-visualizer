import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import { join } from 'path';
import type { Response } from 'express';
import { DocumentsService } from '../documents/documents.service';

export type PageData =
  | {
      page: 'workspace';
      workspace: {
        projects: string[];
        featureEntries: { name: string; kind: 'dir' | 'file' }[];
      };
    }
  | {
      page: 'settings';
      settings: {
        project: string;
        projects: string[];
        entries: { name: string; kind: 'dir' | 'file' }[];
      };
    };

type ServerEntry = {
  renderPage: (response: Response, data: PageData) => void;
};

@Injectable()
export class SsrService {
  constructor(private readonly documents: DocumentsService) {}

  async workspaceData(): Promise<PageData> {
    const docsEntries = await this.documents.list('docs').catch(() => []);
    const projects = docsEntries
      .filter(
        (entry) =>
          entry.kind === 'dir' && entry.name !== 'method' && entry.name !== 'settings',
      )
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

  async settingsData(project?: string): Promise<PageData> {
    const docsEntries = await this.documents.list('docs').catch(() => []);
    const projects = docsEntries
      .filter(
        (entry) =>
          entry.kind === 'dir' && entry.name !== 'method' && entry.name !== 'settings',
      )
      .map((entry) => entry.name);
    const selected = project && projects.includes(project) ? project : projects[0] ?? '';
    const entries = selected
      ? await this.documents.list(`docs/${selected}/settings`).catch(() => [])
      : [];
    return {
      page: 'settings',
      settings: { project: selected, projects, entries },
    };
  }

  async render(response: Response, data: PageData): Promise<void> {
    const entryPath = join(__dirname, '../../../web/dist/server/entry-server.cjs');
    const entry = createRequire(__filename)(entryPath) as ServerEntry;
    entry.renderPage(response, data);
  }
}
