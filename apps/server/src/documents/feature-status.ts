import {
  KEY_FILES,
  type FeatureStatus,
  type FileStatus,
  type KeyFileName,
} from './paths';

export type FeatureFile = {
  name: KeyFileName;
  status: FileStatus;
};

const rank: Record<FileStatus, number> = {
  in_progress: 0,
  ready: 1,
  done: 2,
};

const fileStatus = (
  name: string,
  inProgressNames: readonly string[],
  readyNames: readonly string[],
  doneNames: readonly string[],
): FileStatus => {
  if (inProgressNames.includes(name)) {
    return 'in_progress';
  }
  if (readyNames.includes(name)) {
    return 'ready';
  }
  if (doneNames.includes(name)) {
    return 'done';
  }
  return 'in_progress';
};

export const featureStatus = (
  inProgressNames: readonly string[],
  readyNames: readonly string[],
  doneNames: readonly string[],
  hasOpenUpdates = false,
): { status: FeatureStatus; files: FeatureFile[] } => {
  const files = KEY_FILES.map((name) => ({
    name,
    status: fileStatus(name, inProgressNames, readyNames, doneNames),
  }));
  const allNames = new Set<string>([
    ...KEY_FILES,
    ...inProgressNames,
    ...readyNames,
    ...doneNames,
  ]);
  const status = [...allNames].reduce<FileStatus>(
    (min, name) => {
      const next = fileStatus(name, inProgressNames, readyNames, doneNames);
      return rank[next] < rank[min] ? next : min;
    },
    'done',
  );
  if (hasOpenUpdates) {
    return { status: 'changes', files };
  }
  return { status, files };
};
