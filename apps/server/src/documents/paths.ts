import { BadRequestException, NotFoundException } from '@nestjs/common';
import { relative, resolve, sep } from 'path';

export const IN_PROGRESS_DIR = 'in-progress';
export const READY_DIR = 'ready-to-implement';
export const DONE_DIR = 'done';

export const KEY_FILES = [
  'analyst.adoc',
  'designer.adoc',
  'backend.adoc',
  'tester.yaml',
  'frontend.adoc',
] as const;

export type KeyFileName = (typeof KEY_FILES)[number];

export type FileStatus = 'in_progress' | 'ready' | 'done';

export type FeatureStatus = FileStatus | 'changes';

export const statusDir = (status: FileStatus): string => {
  if (status === 'ready') {
    return READY_DIR;
  }
  if (status === 'done') {
    return DONE_DIR;
  }
  return IN_PROGRESS_DIR;
};

export const isKeyFile = (name: string): name is KeyFileName =>
  (KEY_FILES as readonly string[]).includes(name);

const insideRoot = (root: string, target: string): string => {
  const rootResolved = resolve(root);
  const targetResolved = resolve(target);
  const rel = relative(rootResolved, targetResolved);
  if (rel.startsWith('..') || rel.split(sep).includes('..')) {
    throw new BadRequestException('Путь вне корня документации');
  }
  return targetResolved;
};

export const resolveDocsPath = (root: string, relativePath: string): string => {
  const cleaned = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = cleaned.split('/').filter((part) => part !== '' && part !== '.');
  if (parts.some((part) => part === '..')) {
    throw new BadRequestException('Некорректный путь');
  }
  if (parts[0] !== 'docs') {
    throw new NotFoundException('Каталог скрыт');
  }
  return insideRoot(root, resolve(root, ...parts));
};

export const toRelative = (root: string, absolutePath: string): string =>
  relative(resolve(root), absolutePath).split(sep).join('/');

export const isFeatureId = (value: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
