import {
  Injectable,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { watch, type FSWatcher } from 'fs';
import { isAbsolute, join, relative } from 'path';
import { Observable, Subject } from 'rxjs';
import { WorkspaceRoot } from '../workspace-root';
import { clearTreeCache } from './tree';
import { includeDocsWatchPath } from './watch-path-filter';

const COALESCE_MS = 300;

@Injectable()
export class DocumentsEventsService implements OnModuleInit, OnModuleDestroy {
  private watcher: FSWatcher | null = null;
  private readonly events$ = new Subject<MessageEvent>();
  private pending = new Set<string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly workspace: WorkspaceRoot) {}

  onModuleInit(): void {
    const docsDir = join(this.workspace.root, 'docs');
    this.watcher = watch(docsDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) {
        return;
      }
      const relativePath = this.toWorkspaceRelativePath(filename);
      if (!includeDocsWatchPath(relativePath)) {
        return;
      }
      this.pending.add(relativePath);
      this.scheduleFlush();
    });
  }

  onModuleDestroy(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.watcher?.close();
    this.watcher = null;
    this.events$.complete();
  }

  stream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  private toWorkspaceRelativePath(filename: string): string {
    const { root } = this.workspace;
    const absolute = isAbsolute(filename)
      ? filename
      : join(root, 'docs', filename);
    return relative(root, absolute).split('\\').join('/');
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, COALESCE_MS);
  }

  private flush(): void {
    if (this.pending.size === 0) {
      return;
    }
    const paths = [...this.pending].sort();
    this.pending.clear();
    clearTreeCache();
    this.events$.next({
      data: { paths },
    });
  }
}
