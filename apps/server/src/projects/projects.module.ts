import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { WorkspaceRoot } from '../workspace-root';

@Module({
  controllers: [ProjectsController],
  providers: [
    WorkspaceRoot,
    {
      provide: ProjectsService,
      useFactory: (workspace: WorkspaceRoot) => new ProjectsService(workspace.root),
      inject: [WorkspaceRoot],
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
