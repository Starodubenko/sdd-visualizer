export type TreeEntry = {
  name: string;
  kind: 'dir' | 'file';
  status?: 'in_progress' | 'ready' | 'done' | 'changes';
  hasOpenChange?: boolean;
  path?: string;
};

export type FeatureFile = {
  name: string;
  status: 'in_progress' | 'ready' | 'done';
  path?: string;
};

export type NodeDescription = {
  path: string;
  kind: 'docs' | 'project' | 'feature' | 'directory' | 'file';
  status?: 'in_progress' | 'ready' | 'done' | 'changes';
  files?: FeatureFile[];
  entries?: TreeEntry[];
};

export type PageData = {
  page: 'workspace';
  workspace: {
    projects: string[];
    featureEntries: TreeEntry[];
  };
};

const errorMessageFromBody = (text: string): string => {
  if (!text) {
    return 'Ошибка запроса';
  }
  try {
    const body = JSON.parse(text) as { message?: unknown };
    const { message } = body;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join('\n');
    }
  } catch {
    // not JSON — use raw text
  }
  return text;
};

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(errorMessageFromBody(text));
  }
  return response.json() as Promise<T>;
};

const writeJson = <T>(url: string, init: RequestInit): Promise<T> =>
  fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  }).then((response) => readJson<T>(response));

export const fetchTree = (path: string): Promise<TreeEntry[]> =>
  fetch(`/api/tree?path=${encodeURIComponent(path)}`).then((response) => readJson(response));

export const fetchNode = (path: string): Promise<NodeDescription> =>
  fetch(`/api/node?path=${encodeURIComponent(path)}`).then((response) => readJson(response));

export const fetchDocument = (path: string): Promise<{ path: string; content: string }> =>
  fetch(`/api/document?path=${encodeURIComponent(path)}`).then((response) => readJson(response));

export const createFeature = (
  project: string,
  featureId: string,
): Promise<{ path: string }> =>
  writeJson('/api/features', {
    method: 'POST',
    body: JSON.stringify({ project, featureId }),
  });

export const deleteFeature = (path: string): Promise<{ path: string }> =>
  writeJson(`/api/features?path=${encodeURIComponent(path)}`, { method: 'DELETE' });

export const renameFeature = (
  path: string,
  featureId: string,
): Promise<{ path: string }> =>
  writeJson('/api/features/rename', {
    method: 'POST',
    body: JSON.stringify({ path, featureId }),
  });

export const moveDocumentStatus = (
  path: string,
  status: 'in_progress' | 'ready' | 'done',
): Promise<{ path: string }> =>
  writeJson('/api/document/status', {
    method: 'POST',
    body: JSON.stringify({ path, status }),
  });

export const createUpdate = (
  path: string,
  section: string,
  body: string,
): Promise<{ path: string }> =>
  writeJson('/api/updates', {
    method: 'POST',
    body: JSON.stringify({ path, section, body }),
  });

export const publishProject = (): Promise<{ pushed: true }> =>
  writeJson('/api/publish', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const syncProject = (
  project: string,
): Promise<{ project: string; updated: boolean }> =>
  writeJson('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ project }),
  });

export type ChangeEntry = {
  path: string;
  status: 'added' | 'modified' | 'deleted';
};

export type ProjectChanges = {
  name: string;
  entries: ChangeEntry[];
};

export const fetchChanges = (): Promise<{ projects: ProjectChanges[]; message: string }> =>
  fetch('/api/changes').then((response) => readJson(response));
