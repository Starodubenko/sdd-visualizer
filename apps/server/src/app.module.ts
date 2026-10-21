import { Module } from '@nestjs/common';
import { DocumentsModule } from './documents/documents.module';
import { PublishModule } from './publish/publish.module';
import { SsrModule } from './ssr/ssr.module';

@Module({
  imports: [DocumentsModule, PublishModule, SsrModule],
})
export class AppModule {}
