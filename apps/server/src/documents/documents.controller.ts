import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { DocumentsEventsService } from './documents-events.service';
import { DocumentsService } from './documents.service';
import type { FileStatus } from './paths';

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
};

const imageMediaType = (relativePath: string): string | null => {
  const name = relativePath.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) {
    return null;
  }
  return IMAGE_MEDIA_TYPES[name.slice(dot + 1).toLowerCase()] ?? null;
};

class DocumentBody {
  path = '';
  content = '';
}

class StatusBody {
  path = '';
  status: FileStatus = 'in_progress';
}

class FeatureBody {
  project = '';
  epic = '';
  featureId = '';
}

class EpicBody {
  project = '';
  epicId = '';
}

class RenameEpicBody {
  path = '';
  epicId = '';
}

class RenameFeatureBody {
  path = '';
  featureId = '';
}

class UpdateBody {
  path = '';
  section = '';
  body = '';
}

class SettingsAgentBody {
  project = '';
  name = '';
}

class CopySettingsAgentsBody {
  target = '';
  source = '';
  names: string[] = [];
}

class SettingsSubagentBody {
  project = '';
  parent = '';
  name = '';
}

class SettingsAgentRenameBody {
  project = '';
  name = '';
  nextName = '';
}

class SettingsSubagentRenameBody {
  project = '';
  parent = '';
  name = '';
  nextName = '';
}

class DocLinkBody {
  project = '';
  directory = '';
}

@Controller('api')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly documentEvents: DocumentsEventsService,
  ) {}

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.documentEvents.stream();
  }

  @Get('tree')
  list(@Query('path') path = 'docs') {
    return this.documents.list(path);
  }

  @Get('node')
  describe(@Query('path') path: string) {
    return this.documents.describe(path);
  }

  @Get('document')
  read(@Query('path') path: string) {
    return this.documents.readDocument(path);
  }

  @Put('document')
  async write(@Body() body: DocumentBody) {
    await this.documents.writeDocument(body.path, body.content);
    return { path: body.path };
  }

  @Post('document/status')
  move(@Body() body: StatusBody) {
    return this.documents.moveStatus(body.path, body.status);
  }

  @Post('epics')
  createEpic(@Body() body: EpicBody) {
    return this.documents.createEpic(body.project, body.epicId);
  }

  @Post('epics/rename')
  renameEpic(@Body() body: RenameEpicBody) {
    return this.documents.renameEpic(body.path, body.epicId);
  }

  @Delete('epics')
  async removeEpic(@Query('path') path: string) {
    await this.documents.deleteEpic(path);
    return { path };
  }

  @Get('doc-links/directories')
  listDocLinkDirectory(@Query('project') project: string, @Query('path') path = '') {
    return this.documents.listDocLinkDirectory(project, path);
  }

  @Post('doc-links')
  createDocLink(@Body() body: DocLinkBody) {
    return this.documents.createDocLink(body.project, body.directory);
  }

  @Post('features')
  create(@Body() body: FeatureBody) {
    return this.documents.createFeature(body.project, body.epic, body.featureId);
  }

  @Post('features/rename')
  rename(@Body() body: RenameFeatureBody) {
    return this.documents.renameFeature(body.path, body.featureId);
  }

  @Post('updates')
  createUpdate(@Body() body: UpdateBody) {
    return this.documents.createUpdate(body.path, body.section, body.body, new Date());
  }

  @Delete('features')
  async remove(@Query('path') path: string) {
    await this.documents.deleteFeature(path);
    return { path };
  }

  @Post('settings/agents')
  createSettingsAgent(@Body() body: SettingsAgentBody) {
    return this.documents.createSettingsAgent(body.project, body.name);
  }

  @Post('settings/agents/copy')
  copySettingsAgents(@Body() body: CopySettingsAgentsBody) {
    return this.documents.copySettingsAgents(body.target, body.source, body.names);
  }

  @Delete('settings/agents')
  async removeSettingsAgent(@Query('project') project: string, @Query('name') name: string) {
    await this.documents.deleteSettingsAgent(project, name);
    return { project, name };
  }

  @Post('settings/agents/rename')
  renameSettingsAgent(@Body() body: SettingsAgentRenameBody) {
    return this.documents.renameSettingsAgent(body.project, body.name, body.nextName);
  }

  @Post('settings/agents/subagents')
  createSettingsSubagent(@Body() body: SettingsSubagentBody) {
    return this.documents.createSettingsSubagent(body.project, body.parent, body.name);
  }

  @Delete('settings/agents/subagents')
  async removeSettingsSubagent(
    @Query('project') project: string,
    @Query('parent') parent: string,
    @Query('name') name: string,
  ) {
    await this.documents.deleteSettingsSubagent(project, parent, name);
    return { project, parent, name };
  }

  @Post('settings/agents/subagents/rename')
  renameSettingsSubagent(@Body() body: SettingsSubagentRenameBody) {
    return this.documents.renameSettingsSubagent(
      body.project,
      body.parent,
      body.name,
      body.nextName,
    );
  }

  @Post('assets')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
    @Body('featurePath') featurePath: string,
    @Body('pixo') pixo: string | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }
    return this.documents.saveAsset(featurePath, file.originalname, file.buffer, pixo ?? '');
  }

  @Get('raw')
  async raw(@Query('path') path: string, @Res() response: Response) {
    const file = await this.documents.readRaw(path);
    const mediaType = imageMediaType(path);
    if (mediaType) {
      response.type(mediaType);
    }
    createReadStream(file.absolute).pipe(response);
  }
}
