import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SsrService } from './ssr.service';

@Controller()
export class SsrController {
  constructor(private readonly ssr: SsrService) {}

  @Get()
  async workspace(@Res() response: Response) {
    const data = await this.ssr.workspaceData();
    await this.ssr.render(response, data);
  }

  @Get('settings')
  async settings(@Query('project') project: string | undefined, @Res() response: Response) {
    const data = await this.ssr.settingsData(project);
    await this.ssr.render(response, data);
  }
}
