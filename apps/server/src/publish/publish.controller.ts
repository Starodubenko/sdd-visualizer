import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChangesService } from './changes.service';
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
    private readonly changesService: ChangesService,
  ) {}

  @Get('changes')
  changes() {
    return this.changesService.list();
  }

  @Post('publish')
  publish(@Body() body: ProjectBody) {
    return this.publishService.publish(body.project);
  }

  @Post('sync')
  sync(@Body() body: ProjectBody) {
    return this.syncService.sync(body.project);
  }
}
