import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ProjectsService } from './projects.service';

class ProjectBody {
  remote = '';
  token?: string;
}

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.listPublic();
  }

  @Get(':name')
  get(@Param('name') name: string) {
    return this.projects.getPublic(name);
  }

  @Put(':name')
  save(@Param('name') name: string, @Body() body: ProjectBody) {
    return this.projects.save(name, body.remote ?? '', body.token);
  }
}
