import { cpSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const copyFixtures = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sdd-mock-'));
  cpSync(join(__dirname, '../../test/fixtures'), dir, { recursive: true });
  return dir;
};
