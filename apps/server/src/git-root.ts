import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

export const findGitRoot = (start: string): string | null => {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(`${dir}/.git`)) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

@Injectable()
export class GitRoot {
  readonly root = findGitRoot(process.cwd());
}
