import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { SsrController } from './ssr.controller';
import { SsrService } from './ssr.service';

@Module({
  imports: [DocumentsModule],
  controllers: [SsrController],
  providers: [SsrService],
})
export class SsrModule {}
