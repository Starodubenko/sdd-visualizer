import { Injectable } from '@nestjs/common';
import { resolve } from 'path';

@Injectable()
export class WorkspaceRoot {
  readonly root = resolve(process.env.DOCS_ROOT ?? process.cwd());
}
