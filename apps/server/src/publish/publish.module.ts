import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectsService } from '../projects/projects.service';
import { WorkspaceRoot } from '../workspace-root';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { SyncService } from './sync.service';

@Module({
  imports: [ProjectsModule],
  controllers: [PublishController],
  providers: [
    WorkspaceRoot,
    {
      provide: PublishService,
      useFactory: (workspace: WorkspaceRoot, projects: ProjectsService) =>
        new PublishService(workspace.root, projects),
      inject: [WorkspaceRoot, ProjectsService],
    },
    {
      provide: SyncService,
      useFactory: (workspace: WorkspaceRoot, projects: ProjectsService) =>
        new SyncService(workspace.root, projects),
      inject: [WorkspaceRoot, ProjectsService],
    },
  ],
})
export class PublishModule {}
