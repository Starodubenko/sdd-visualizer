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
        path: string;
        open: string[];
      };
    }
  | {
      page: 'settings';
      settings: {
        project: string;
        projects: string[];
        entries: { name: string; kind: 'dir' | 'file' }[];
        path: string;
        open: string[];
      };
    };

type ServerEntry = {
  renderPage: (response: Response, data: PageData) => void;
};

@Injectable()
export class SsrService {
  constructor(private readonly documents: DocumentsService) {}

  async workspaceData(path = '', open: string[] = []): Promise<PageData> {
    const projects = await this.projectNames();
    const selected = this.projectFromPath(path, projects) || projects[0] || '';
    const root = selected ? `docs/${selected}` : '';
    const safePath = root && (path === root || path.startsWith(`${root}/`)) ? path : root;
    const featureEntries = root ? await this.documents.list(root).catch(() => []) : [];
    return {
      page: 'workspace',
      workspace: {
        projects,
        featureEntries,
        path: safePath,
        open: this.safeOpen(open, root),
      },
    };
  }

  async settingsData(project = '', path = '', open: string[] = []): Promise<PageData> {
    const projects = await this.projectNames();
    const fromPath = this.projectFromPath(path, projects);
    const selected =
      fromPath || (project && projects.includes(project) ? project : projects[0] ?? '');
    const root = selected ? `docs/${selected}/settings` : '';
    const safePath = root && (path === root || path.startsWith(`${root}/`)) ? path : root;
    const entries = root ? await this.documents.list(root).catch(() => []) : [];
    return {
      page: 'settings',
      settings: {
        project: selected,
        projects,
        entries,
        path: safePath,
        open: this.safeOpen(open, root),
      },
    };
  }

  private async projectNames(): Promise<string[]> {
    const docsEntries = await this.documents.list('docs').catch(() => []);
    return docsEntries
      .filter(
        (entry) =>
          entry.kind === 'dir' && entry.name !== 'method' && entry.name !== 'settings',
      )
      .map((entry) => entry.name);
  }

  private projectFromPath(path: string, projects: string[]): string {
    const parts = path.split('/').filter((part) => part !== '');
    const name = parts[0] === 'docs' ? parts[1] ?? '' : '';
    return projects.includes(name) ? name : '';
  }

  private safeOpen(open: string[], root: string): string[] {
    if (!root) {
      return [];
    }
    return open.filter((item) => item === root || item.startsWith(`${root}/`));
  }

  async render(response: Response, data: PageData): Promise<void> {
    const entryPath = join(__dirname, '../../../web/dist/server/entry-server.cjs');
    const entry = createRequire(__filename)(entryPath) as ServerEntry;
    entry.renderPage(response, data);
  }
}
