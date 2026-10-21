import { Module } from '@nestjs/common';
import { GitRoot } from '../git-root';
import { WorkspaceRoot } from '../workspace-root';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { SyncService } from './sync.service';

@Module({
  controllers: [PublishController],
  providers: [
    WorkspaceRoot,
    GitRoot,
    {
      provide: PublishService,
      useFactory: (workspace: WorkspaceRoot, gitRoot: GitRoot) => {
        if (!gitRoot.root) {
          throw new Error('Git root not found');
        }
        return new PublishService(workspace.root, gitRoot.root);
      },
      inject: [WorkspaceRoot, GitRoot],
    },
    {
      provide: SyncService,
      useFactory: (workspace: WorkspaceRoot, gitRoot: GitRoot) => {
        if (!gitRoot.root) {
          throw new Error('Git root not found');
        }
        return new SyncService(workspace.root, gitRoot.root);
      },
      inject: [WorkspaceRoot, GitRoot],
    },
  ],
})
export class PublishModule {}
