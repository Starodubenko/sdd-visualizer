import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsEventsService } from './documents-events.service';
import { DocumentsService } from './documents.service';
import { WorkspaceRoot } from '../workspace-root';

@Module({
  controllers: [DocumentsController],
  providers: [
    WorkspaceRoot,
    DocumentsEventsService,
    {
      provide: DocumentsService,
      useFactory: (workspace: WorkspaceRoot) => new DocumentsService(workspace.root),
      inject: [WorkspaceRoot],
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
