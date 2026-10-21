import { Body, Controller, Post } from '@nestjs/common';
import { PublishService } from './publish.service';
import { SyncService } from './sync.service';

class ProjectBody {
  project = '';
}

@Controller('api')
export class PublishController {
  constructor(
    private readonly publishService: PublishService,
    private readonly syncService: SyncService,
  ) {}

  @Post('publish')
  publish(@Body() body: ProjectBody) {
    return this.publishService.publish(body.project);
  }

  @Post('sync')
  sync(@Body() body: ProjectBody) {
    return this.syncService.sync(body.project);
  }
}
