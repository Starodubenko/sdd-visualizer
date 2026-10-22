import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SsrService } from './ssr.service';

const queryList = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

@Controller()
export class SsrController {
  constructor(private readonly ssr: SsrService) {}

  @Get()
  async workspace(
    @Query('path') path: string | undefined,
    @Query('open') open: string | string[] | undefined,
    @Res() response: Response,
  ) {
    const data = await this.ssr.workspaceData(path ?? '', queryList(open));
    await this.ssr.render(response, data);
  }

  @Get('method')
  async method(
    @Query('path') path: string | undefined,
    @Query('open') open: string | string[] | undefined,
    @Res() response: Response,
  ) {
    const data = await this.ssr.methodData(path ?? '', queryList(open));
    await this.ssr.render(response, data);
  }

  @Get('settings')
  async settings(
    @Query('project') project: string | undefined,
    @Query('path') path: string | undefined,
    @Query('open') open: string | string[] | undefined,
    @Res() response: Response,
  ) {
    const data = await this.ssr.settingsData(project ?? '', path ?? '', queryList(open));
    await this.ssr.render(response, data);
  }
}
