import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectsModule } from '../projects/projects.module';
import { SsrController } from './ssr.controller';
import { SsrService } from './ssr.service';

@Module({
  imports: [DocumentsModule, ProjectsModule],
  controllers: [SsrController],
  providers: [SsrService],
})
export class SsrModule {}
