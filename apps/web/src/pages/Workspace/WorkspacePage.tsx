import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { DocumentView } from '../../features/document-view/DocumentView';
import { ChangesMenu } from '../../features/changes-menu/ChangesMenu';
import { ThemeSwitch } from '../../features/theme/ThemeSwitch';
import { ActionsMenu } from '../../shared/ActionsMenu';
import {
  createAgent,
  copyAgents,
  createDocLink,
  createEpic,
  createFeature,
  createSubagent,
  deleteAgent,
  deleteEpic,
  deleteSubagent,
  deleteFeature,
  fetchDocLinkDirectory,
  renameAgent,
  renameEpic,
  renameFeature,
  renameSubagent,
  fetchDocument,
  fetchNode,
  fetchTree,
  publishProject,
  syncProject,
  type DocLinkDirectory,
  type NodeDescription,
  type TreeEntry,
} from '../../shared/api';
import { ConfirmModal } from '../../shared/ConfirmModal';
import { Modal } from '../../shared/Modal';
import { Toast } from '../../shared/Toast';
import {
  epicMatchesFilter,
  featureMatchesFilter,
  isFeatureFilterActive,
  isFeatureId,
  resolveFeaturePath,
  statusLabel,
  statusTagClass,
  treeStatusClass,
  visibleRange,
  type FeatureFilterQuery,
  type FeatureStatus,
  type FeatureStatusFilter,
} from './tree-window';
import { formatSyncCountdown } from './formatSyncCountdown';
import {
  buildTreeSearch,
  directoryPrefixes,
  expandedPaths,
  isDocumentPath,
  parseTreeUrl,
} from './tree-url';
import { isImagePath } from '../../features/document-view/image-path';

const FEATURE_STATUS_FILTER_OPTIONS: FeatureStatusFilter[] = [
  'all',
  'changes',
  'in_progress',
  'ready',
  'done',
];

const featureStatusFilterLabel = (value: FeatureStatusFilter): string =>
  value === 'all' ? 'Все' : statusLabel(value);

const settingsRoot = (projectName: string): string => `docs/${projectName}/settings`;

const openShownFile = (path: string): Promise<{ path: string; content: string }> => {
  if (isImagePath(path)) {
    return Promise.resolve({ path, content: '' });
  }
  return fetchDocument(path);
};

const settingsTail = (path: string): { project: string; rest: string[] } | null => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'docs' || parts[2] !== 'settings') {
    return null;
  }
  return { project: parts[1], rest: parts.slice(3) };
};

const isSettingsAgentPath = (path: string): boolean => {
  const tail = settingsTail(path);
  return tail !== null && tail.rest.length === 1;
};

const isSettingsSubagentPath = (path: string): boolean => {
  const tail = settingsTail(path);
  return tail !== null && tail.rest.length === 2;
};

const settingsAgentFromPath = (path: string): { dirPath: string; name: string } | null => {
  const tail = settingsTail(path);
  if (!tail || tail.rest.length === 0) {
    return null;
  }
  const agent = tail.rest[0];
  if (agent === 'orchestrator.adoc') {
    return null;
  }
  if (tail.rest.length === 1 && agent.includes('.')) {
    return null;
  }
  return { dirPath: `${settingsRoot(tail.project)}/${agent}`, name: agent };
};

const settingsSubagentFromPath = (
  path: string,
): { dirPath: string; parent: string; name: string } | null => {
  const tail = settingsTail(path);
  if (!tail || tail.rest.length < 2) {
    return null;
  }
  const [parent, subagent] = tail.rest;
  if (parent === 'orchestrator.adoc') {
    return null;
  }
  if (tail.rest.length === 2 && subagent.includes('.')) {
    return null;
  }
  return {
    dirPath: `${settingsRoot(tail.project)}/${parent}/${subagent}`,
    parent,
    name: subagent,
  };
};

type Props =
  | {
      mode?: 'workspace';
      projects: string[];
      featureEntries: TreeEntry[];
      initialPath?: string;
      initialOpen?: string[];
    }
  | {
      mode: 'settings';
      projects: string[];
      settingsProject: string;
      settingsEntries: TreeEntry[];
      initialPath?: string;
      initialOpen?: string[];
    };

type Cache = Record<string, TreeEntry[]>;

const childPath = (parent: string, name: string): string => `${parent}/${name}`;

const initialProjectPath = (projects: string[]): string =>
  projects[0] ? `docs/${projects[0]}` : '';

export const WorkspacePage: FC<Props> = (props) => {
  const isSettings = props.mode === 'settings';
  const projects = props.projects;
  const featureEntries = isSettings ? [] : props.featureEntries;
  const settingsEntries = isSettings ? props.settingsEntries : [];
  const requestedPath = props.initialPath ?? '';
  const requestedProject = requestedPath.split('/').filter((part) => part !== '')[1] ?? '';
  const initialProject = projects.includes(requestedProject)
    ? requestedProject
    : isSettings
      ? props.settingsProject || projects[0] || ''
      : projects[0] ?? '';
  const initialTreePath = isSettings
    ? initialProject
      ? settingsRoot(initialProject)
      : ''
    : initialProject
      ? initialProjectPath([initialProject])
      : '';
  const selectedPath =
    initialTreePath &&
    (requestedPath === initialTreePath || requestedPath.startsWith(`${initialTreePath}/`))
      ? requestedPath
      : initialTreePath;
  const initialExpanded: Record<string, boolean> = {};
  if (initialTreePath) {
    initialExpanded[initialTreePath] = true;
  }
  for (const item of props.initialOpen ?? []) {
    if (item === initialTreePath || item.startsWith(`${initialTreePath}/`)) {
      initialExpanded[item] = true;
    }
  }
  for (const prefix of directoryPrefixes(selectedPath)) {
    if (prefix === initialTreePath || prefix.startsWith(`${initialTreePath}/`)) {
      initialExpanded[prefix] = true;
    }
  }
  const initialTreeEntries = isSettings ? settingsEntries : featureEntries;
  const [project, setProject] = useState(initialProject);
  const treeRootPath = isSettings ? (project ? settingsRoot(project) : '') : project ? `docs/${project}` : '';
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);
  const [cache, setCache] = useState<Cache>(() => {
    return initialTreePath ? { [initialTreePath]: initialTreeEntries } : {};
  });
  const [selected, setSelected] = useState(() => selectedPath);
  const [node, setNode] = useState<NodeDescription | null>(() => {
    if (!initialTreePath || selectedPath !== initialTreePath) {
      return null;
    }
    return {
      path: initialTreePath,
      kind: isSettings ? 'directory' : 'project',
      entries: initialTreeEntries,
    };
  });
  const [document, setDocument] = useState<{ path: string; content: string } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [newFeatureId, setNewFeatureId] = useState('');
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [addSubagentOpen, setAddSubagentOpen] = useState(false);
  const [newSubagentName, setNewSubagentName] = useState('');
  const [renameFeatureOpen, setRenameFeatureOpen] = useState(false);
  const [renameFeatureId, setRenameFeatureId] = useState('');
  const [renameFeaturePath, setRenameFeaturePath] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState(false);
  const [confirmDeleteSubagent, setConfirmDeleteSubagent] = useState(false);
  const [renameSettingsOpen, setRenameSettingsOpen] = useState(false);
  const [renameSettingsKind, setRenameSettingsKind] = useState<'agent' | 'subagent'>('agent');
  const [renameSettingsName, setRenameSettingsName] = useState('');
  const [renameSettingsParent, setRenameSettingsParent] = useState('');
  const [renameSettingsError, setRenameSettingsError] = useState('');
  const [copyAgentsOpen, setCopyAgentsOpen] = useState(false);
  const [copySource, setCopySource] = useState('');
  const [copyAgentOptions, setCopyAgentOptions] = useState<string[]>([]);
  const [copyNames, setCopyNames] = useState<string[]>([]);
  const [copyError, setCopyError] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [epicNameFilter, setEpicNameFilter] = useState('');
  const [docLinkOpen, setDocLinkOpen] = useState(false);
  const [docLinkDir, setDocLinkDir] = useState<DocLinkDirectory | null>(null);
  const [docLinkError, setDocLinkError] = useState('');
  const [docLinkConfirm, setDocLinkConfirm] = useState(false);
  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [newEpicId, setNewEpicId] = useState('');
  const [renameEpicOpen, setRenameEpicOpen] = useState(false);
  const [renameEpicId, setRenameEpicId] = useState('');
  const [renameEpicPath, setRenameEpicPath] = useState('');
  const [confirmDeleteEpic, setConfirmDeleteEpic] = useState(false);
  const [deleteFeaturePath, setDeleteFeaturePath] = useState<string | null>(null);
  const [addFeatureEpicPath, setAddFeatureEpicPath] = useState('');
  const [featureNameFilter, setFeatureNameFilter] = useState('');
  const [featureStatusFilter, setFeatureStatusFilter] = useState<FeatureStatusFilter>('all');
  const [syncSeconds, setSyncSeconds] = useState(60);
  const [syncing, setSyncing] = useState(false);
  const [changesRefresh, setChangesRefresh] = useState(0);
  const [toast, setToast] = useState<{ kind: 'ok' | 'bad'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ignoreUrlWrite = useRef(false);
  const lastUrlPath = useRef(selected);

  useEffect(() => {
    let cancelled = false;
    const remember = (dir: string, entries: TreeEntry[]) => {
      if (cancelled) {
        return;
      }
      setCache((current) => (current[dir] ? current : { ...current, [dir]: entries }));
    };
    for (const dir of Object.keys(expanded).filter((key) => expanded[key])) {
      if (cache[dir]) {
        continue;
      }
      void fetchTree(dir)
        .then((entries) => remember(dir, entries))
        .catch(() => undefined);
    }
    if (isDocumentPath(selected)) {
      void openShownFile(selected)
        .then((next) => {
          if (!cancelled) {
            setDocument(next);
          }
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
          }
        });
    } else if (selected && selected !== initialTreePath) {
      void fetchNode(selected)
        .then((next) => {
          if (cancelled) {
            return;
          }
          setNode(next);
          if (next.entries) {
            remember(selected, next.entries);
          }
        })
        .catch((reason: unknown) => {
          if (!cancelled) {
            setError(reason instanceof Error ? reason.message : 'Не удалось открыть');
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ignoreUrlWrite.current) {
      ignoreUrlWrite.current = false;
      lastUrlPath.current = selected;
      return;
    }
    const search = buildTreeSearch({
      project,
      path: selected,
      open: expandedPaths(expanded, selected).filter(
        (item) => item === treeRootPath || item.startsWith(`${treeRootPath}/`),
      ),
    });
    const base = isSettings ? '/settings' : '/';
    const next = `${base}${search}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) {
      lastUrlPath.current = selected;
      return;
    }
    const method = lastUrlPath.current === selected ? 'replaceState' : 'pushState';
    lastUrlPath.current = selected;
    window.history[method](null, '', next);
  }, [expanded, isSettings, project, selected]);

  useEffect(() => {
    const applyLocation = () => {
      const parsed = parseTreeUrl(window.location.search);
      const name = projects.includes(parsed.project)
        ? parsed.project
        : projects.includes(parsed.path.split('/')[1] ?? '')
          ? parsed.path.split('/')[1]
          : project;
      if (!name) {
        return;
      }
      const root = isSettings ? settingsRoot(name) : `docs/${name}`;
      const path = parsed.path === root || parsed.path.startsWith(`${root}/`) ? parsed.path : root;
      const open: Record<string, boolean> = { [root]: true };
      for (const item of [...parsed.open, ...directoryPrefixes(path)]) {
        if (item === root || item.startsWith(`${root}/`)) {
          open[item] = true;
        }
      }
      ignoreUrlWrite.current = true;
      setProject(name);
      setSelected(path);
      setExpanded(open);
      setHighlight(null);
      setError('');
      if (isDocumentPath(path)) {
        setNode(null);
        setDocument(null);
        void openShownFile(path)
          .then(setDocument)
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
          });
      } else {
        setDocument(null);
        void fetchNode(path)
          .then((next) => {
            setNode(next);
            if (next.entries) {
              setCache((current) => ({ ...current, [path]: next.entries ?? [] }));
            }
          })
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Не удалось открыть');
          });
      }
      for (const dir of Object.keys(open)) {
        void fetchTree(dir)
          .then((entries) => {
            setCache((current) => (current[dir] ? current : { ...current, [dir]: entries }));
          })
          .catch(() => undefined);
      }
    };
    window.addEventListener('popstate', applyLocation);
    return () => window.removeEventListener('popstate', applyLocation);
  }, [isSettings, project, projects]);

  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const nodeRef = useRef(node);
  nodeRef.current = node;
  const documentRef = useRef(document);
  documentRef.current = document;
  const syncInFlightRef = useRef(false);

  const featureFilterQuery: FeatureFilterQuery = {
    nameQuery: featureNameFilter,
    status: featureStatusFilter,
  };

  useEffect(() => {
    if (isSettings || !treeRootPath || !isFeatureFilterActive(featureFilterQuery)) {
      return;
    }
    const epics = cache[treeRootPath] ?? [];
    for (const epic of epics) {
      if (epic.kind !== 'dir' || !epicMatchesFilter(epic.name, epicNameFilter)) {
        continue;
      }
      const epicPath = `${treeRootPath}/${epic.name}`;
      if (cache[epicPath]) {
        continue;
      }
      void fetchTree(epicPath).then((entries) => {
        setCache((current) =>
          current[epicPath] ? current : { ...current, [epicPath]: entries },
        );
      });
    }
  }, [cache, epicNameFilter, featureFilterQuery, isSettings, treeRootPath]);

  const loadNode = (path: string) => {
    setSelected(path);
    setDocument(null);
    setError('');
    void fetchNode(path)
      .then((next) => {
        setNode(next);
        if (next.entries) {
          setCache((current) => ({ ...current, [path]: next.entries ?? [] }));
        }
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось открыть');
      });
  };

  const toggle = (path: string) => {
    setExpanded((current) => ({ ...current, [path]: !current[path] }));
    if (!cache[path]) {
      void fetchTree(path).then((entries) => {
        setCache((current) => ({ ...current, [path]: entries }));
      });
    }
  };

  const openFile = (path: string, nextHighlight: string | null = null) => {
    setHighlight(nextHighlight);
    setSelected(path);
    setNode(null);
    setError('');
    void openShownFile(path)
      .then(setDocument)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
      });
  };

  const refreshProjectTree = (name: string) => {
    const path = `docs/${name}`;
    void fetchTree(path).then((entries) => {
      setCache((current) => ({ ...current, [path]: entries }));
    });
  };

  const refreshSettingsTree = () => {
    const rootPath = settingsRoot(project);
    void fetchTree(rootPath).then((entries) => {
      setCache((current) => ({ ...current, [rootPath]: entries }));
    });
  };

  const openChangeFile = (projectName: string, relativePath: string) => {
    if (relativePath === 'settings' || relativePath.startsWith('settings/')) {
      if (!isSettings) {
        const filePath = `docs/${projectName}/${relativePath}`;
        window.location.href = `/settings${buildTreeSearch({
          project: projectName,
          path: filePath,
          open: directoryPrefixes(filePath),
        })}`;
        return;
      }
      const rootPath = settingsRoot(projectName);
      const parts = relativePath.split('/').filter(Boolean);
      setProject(projectName);
      setExpanded((current) => {
        const next = { ...current, [rootPath]: true };
        let prefix = rootPath;
        for (let i = 1; i < parts.length - 1; i += 1) {
          prefix = `${prefix}/${parts[i]}`;
          next[prefix] = true;
        }
        return next;
      });
      void fetchTree(rootPath).then((entries) => {
        setCache((current) => ({ ...current, [rootPath]: entries }));
      });
      if (parts.length === 1) {
        loadNode(rootPath);
        return;
      }
      openFile(`docs/${projectName}/${relativePath}`);
      return;
    }
    if (isSettings) {
      const filePath = `docs/${projectName}/${relativePath}`;
      window.location.href = `/${buildTreeSearch({
        project: projectName,
        path: filePath,
        open: directoryPrefixes(filePath),
      })}`;
      return;
    }
    setProject(projectName);
    const projectDir = `docs/${projectName}`;
    const parts = relativePath.split('/').filter(Boolean);
    setExpanded((current) => {
      const next = { ...current, [projectDir]: true };
      let prefix = projectDir;
      for (let i = 0; i < parts.length - 1; i += 1) {
        prefix = `${prefix}/${parts[i]}`;
        next[prefix] = true;
      }
      return next;
    });
    refreshProjectTree(projectName);
    openFile(`${projectDir}/${relativePath}`);
  };

  const refreshFeatureTree = (featurePath: string) => {
    void fetchTree(featurePath).then((entries) => {
      setCache((current) => ({ ...current, [featurePath]: entries }));
    });
  };

  const refreshOpenScreen = useCallback(() => {
    if (isSettings) {
      refreshSettingsTree();
      const currentSelected = selectedRef.current;
      const currentNode = nodeRef.current;
      const currentDocument = documentRef.current;
      if (currentDocument) {
        void openShownFile(currentDocument.path)
          .then(setDocument)
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
          });
      } else if (currentNode && currentNode.kind !== 'file') {
        void fetchNode(currentSelected)
          .then((next) => {
            setNode(next);
            if (next.entries) {
              setCache((current) => ({ ...current, [currentSelected]: next.entries ?? [] }));
            }
          })
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Не удалось открыть');
          });
      }
      return;
    }
    const name = projectRef.current;
    if (!name) {
      return;
    }
    refreshProjectTree(name);
    const currentSelected = selectedRef.current;
    const currentNode = nodeRef.current;
    const currentDocument = documentRef.current;
    const featurePath = resolveFeaturePath(
      currentSelected,
      currentNode?.kind === 'feature' ? currentNode.path : null,
    );
    if (featurePath) {
      refreshFeatureTree(featurePath);
    }
    if (currentDocument) {
      void openShownFile(currentDocument.path)
        .then(setDocument)
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
        });
    } else if (currentNode && currentNode.kind !== 'file') {
      void fetchNode(currentSelected)
        .then((next) => {
          setNode(next);
          if (next.entries) {
            setCache((current) => ({ ...current, [currentSelected]: next.entries ?? [] }));
          }
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Не удалось открыть');
        });
    }
  }, [isSettings]);

  const refreshOpenScreenRef = useRef(refreshOpenScreen);
  refreshOpenScreenRef.current = refreshOpenScreen;

  const runSync = useCallback(() => {
    if (syncInFlightRef.current) {
      return;
    }
    const name = projectRef.current;
    if (!name) {
      setError('Выберите проект');
      setSyncSeconds(60);
      return;
    }
    syncInFlightRef.current = true;
    setSyncing(true);
    void syncProject(name)
      .then(() => {
        refreshOpenScreenRef.current();
        setChangesRefresh((current) => current + 1);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось синхронизировать');
      })
      .finally(() => {
        syncInFlightRef.current = false;
        setSyncing(false);
        setSyncSeconds(60);
      });
  }, []);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  useEffect(() => {
    if (isSettings) {
      return undefined;
    }
    const id = window.setInterval(() => {
      if (syncInFlightRef.current) {
        return;
      }
      setSyncSeconds((current) => {
        if (current <= 1) {
          runSyncRef.current();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isSettings]);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = (event) => {
      let paths: string[];
      try {
        const payload = JSON.parse(event.data) as { paths?: unknown };
        if (!Array.isArray(payload.paths)) {
          return;
        }
        paths = payload.paths.filter((entry): entry is string => typeof entry === 'string');
      } catch {
        return;
      }
      const docPath = documentRef.current?.path;
      const prefix = isSettings ? `${settingsRoot(projectRef.current)}/` : projectRef.current ? `docs/${projectRef.current}/` : '';
      if (paths.some((path) => path.startsWith('docs/'))) {
        setChangesRefresh((current) => current + 1);
      }
      const shouldRefresh = paths.some(
        (path) => path === docPath || (prefix !== '' && path.startsWith(prefix)),
      );
      if (shouldRefresh) {
        refreshOpenScreenRef.current();
      }
    };
    return () => source.close();
  }, [isSettings]);

  const selectedFeaturePath = resolveFeaturePath(
    selected,
    node?.kind === 'feature' ? node.path : null,
  );

  const loadDocLinkDirectory = (path: string) => {
    setDocLinkError('');
    setDocLinkConfirm(false);
    void fetchDocLinkDirectory(project, path)
      .then((directory) => {
        setDocLinkDir(directory);
      })
      .catch((reason: unknown) => {
        setDocLinkError(reason instanceof Error ? reason.message : 'Не удалось открыть каталог');
      });
  };

  const openDocLink = () => {
    setDocLinkError('');
    setDocLinkConfirm(false);
    setDocLinkDir(null);
    setDocLinkOpen(true);
    loadDocLinkDirectory('');
  };

  const closeDocLink = () => {
    setDocLinkOpen(false);
    setDocLinkConfirm(false);
    setDocLinkError('');
  };

  const submitDocLink = () => {
    if (!project || !docLinkDir) {
      return;
    }
    setDocLinkError('');
    void createDocLink(project, docLinkDir.path)
      .then(() => fetchDocLinkDirectory(project, docLinkDir.path))
      .then((directory) => {
        setDocLinkDir(directory);
        setDocLinkConfirm(false);
      })
      .catch((reason: unknown) => {
        setDocLinkConfirm(false);
        setDocLinkError(reason instanceof Error ? reason.message : 'Не удалось добавить ссылку');
      });
  };

  const closeAddEpic = () => {
    setAddEpicOpen(false);
    setNewEpicId('');
  };

  const submitAddEpic = () => {
    if (!project) {
      setError('Выберите проект');
      return;
    }
    if (!isFeatureId(newEpicId)) {
      setError('Имя эпика — kebab-case');
      return;
    }
    setError('');
    void createEpic(project, newEpicId)
      .then((result) => {
        closeAddEpic();
        refreshProjectTree(project);
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [treeRootPath]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать эпик');
      });
  };

  const openRenameEpic = (path: string, epicId: string) => {
    setRenameEpicPath(path);
    setRenameEpicId(epicId);
    setError('');
    setRenameEpicOpen(true);
  };

  const closeRenameEpic = () => {
    setRenameEpicOpen(false);
    setRenameEpicId('');
    setRenameEpicPath('');
  };

  const submitRenameEpic = () => {
    if (!renameEpicPath || !project) {
      return;
    }
    const currentId = renameEpicPath.split('/').pop() ?? '';
    if (renameEpicId === currentId) {
      closeRenameEpic();
      return;
    }
    if (!isFeatureId(renameEpicId)) {
      setError('Имя эпика — kebab-case');
      return;
    }
    setError('');
    void renameEpic(renameEpicPath, renameEpicId)
      .then((result) => {
        closeRenameEpic();
        refreshProjectTree(project);
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [treeRootPath]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось переименовать эпик');
      });
  };

  const runDeleteEpic = () => {
    if (!renameEpicPath && node?.kind !== 'epic') {
      return;
    }
    const path = node?.kind === 'epic' ? node.path : '';
    if (!path || !project) {
      return;
    }
    setConfirmDeleteEpic(false);
    void deleteEpic(path)
      .then(() => {
        refreshProjectTree(project);
        loadNode(`docs/${project}`);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось удалить эпик');
      });
  };

  const openAddFeature = (epicPath: string) => {
    setAddFeatureEpicPath(epicPath);
    setNewFeatureId('');
    setError('');
    setAddFeatureOpen(true);
  };

  const submitAddFeature = () => {
    if (!project || !addFeatureEpicPath) {
      setError('Выберите эпик');
      return;
    }
    const epicId = addFeatureEpicPath.split('/').pop() ?? '';
    if (!isFeatureId(newFeatureId)) {
      setError('Имя фичи — kebab-case');
      return;
    }
    setError('');
    void createFeature(project, epicId, newFeatureId)
      .then((result) => {
        setAddFeatureOpen(false);
        setNewFeatureId('');
        refreshProjectTree(project);
        refreshFeatureTree(addFeatureEpicPath);
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [addFeatureEpicPath]: true,
          [treeRootPath]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать фичу');
      });
  };

  const openRenameFeature = (path: string, featureId: string) => {
    setRenameFeaturePath(path);
    setRenameFeatureId(featureId);
    setError('');
    setRenameFeatureOpen(true);
  };

  const closeRenameFeature = () => {
    setRenameFeatureOpen(false);
    setRenameFeatureId('');
    setRenameFeaturePath('');
  };

  const submitRenameFeature = () => {
    if (!renameFeaturePath || !project) {
      return;
    }
    const currentId = renameFeaturePath.split('/').pop() ?? '';
    if (renameFeatureId === currentId) {
      closeRenameFeature();
      return;
    }
    if (!isFeatureId(renameFeatureId)) {
      setError('Имя фичи — kebab-case');
      return;
    }
    setError('');
    void renameFeature(renameFeaturePath, renameFeatureId)
      .then((result) => {
        closeRenameFeature();
        const epicPath = result.path.split('/').slice(0, -1).join('/');
        refreshProjectTree(project);
        refreshFeatureTree(epicPath);
        loadNode(epicPath);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [epicPath]: true,
          [treeRootPath]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось переименовать фичу');
      });
  };

  const runDeleteFeature = () => {
    const path = deleteFeaturePath ?? selectedFeaturePath;
    if (!path || !project) {
      return;
    }
    const epicPath = path.split('/').slice(0, -1).join('/');
    setConfirmDelete(false);
    setDeleteFeaturePath(null);
    void deleteFeature(path)
      .then(() => {
        refreshProjectTree(project);
        refreshFeatureTree(epicPath);
        loadNode(epicPath);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось удалить фичу');
      });
  };

  const submitAddAgent = () => {
    if (!isFeatureId(newAgentName)) {
      setError('Имя агента — kebab-case');
      return;
    }
    setError('');
    void createAgent(project, newAgentName)
      .then((result) => {
        setAddAgentOpen(false);
        setNewAgentName('');
        refreshSettingsTree();
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [settingsRoot(project)]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать агента');
      });
  };

  const settingsFocusPath =
    document?.path ?? (node && node.kind !== 'file' ? node.path : selected);
  const settingsSubagentFocus = isSettings
    ? settingsSubagentFromPath(settingsFocusPath)
    : null;
  const settingsAgentFocus =
    isSettings && !settingsSubagentFocus ? settingsAgentFromPath(settingsFocusPath) : null;
  const selectedAgentName = settingsAgentFocus?.name ?? '';

  const selectedSubagent = settingsSubagentFocus
    ? { parent: settingsSubagentFocus.parent, name: settingsSubagentFocus.name }
    : null;

  const closeRenameSettings = () => {
    setRenameSettingsOpen(false);
    setRenameSettingsName('');
    setRenameSettingsParent('');
    setRenameSettingsError('');
  };

  const openRenameAgent = () => {
    if (!settingsAgentFocus) {
      return;
    }
    setRenameSettingsKind('agent');
    setRenameSettingsName(settingsAgentFocus.name);
    setRenameSettingsParent('');
    setRenameSettingsError('');
    setRenameSettingsOpen(true);
  };

  const openRenameSubagent = () => {
    if (!settingsSubagentFocus) {
      return;
    }
    setRenameSettingsKind('subagent');
    setRenameSettingsName(settingsSubagentFocus.name);
    setRenameSettingsParent(settingsSubagentFocus.parent);
    setRenameSettingsError('');
    setRenameSettingsOpen(true);
  };

  const submitRenameSettings = () => {
    if (renameSettingsKind === 'agent') {
      const currentName = settingsAgentFocus?.name ?? renameSettingsName;
      if (renameSettingsName === currentName) {
        closeRenameSettings();
        return;
      }
      if (!isFeatureId(renameSettingsName)) {
        setRenameSettingsError('Имя агента — kebab-case');
        return;
      }
      setRenameSettingsError('');
      const openFileName = document?.path.split('/').pop();
      void renameAgent(project, currentName, renameSettingsName)
        .then((result) => {
          closeRenameSettings();
          refreshSettingsTree();
          if (openFileName && document && settingsAgentFromPath(document.path)) {
            const nextFilePath = `${result.path}/${openFileName}`;
            setExpanded((current) => ({
              ...current,
              [result.path]: true,
              [settingsRoot(project)]: true,
            }));
            openFile(nextFilePath);
            return;
          }
          loadNode(result.path);
          setExpanded((current) => ({
            ...current,
            [result.path]: true,
            [settingsRoot(project)]: true,
          }));
        })
        .catch((reason: unknown) => {
          setRenameSettingsError(
            reason instanceof Error ? reason.message : 'Не удалось переименовать агента',
          );
        });
      return;
    }
    const parent = settingsSubagentFocus?.parent ?? renameSettingsParent;
    const currentName = settingsSubagentFocus?.name ?? renameSettingsName;
    if (renameSettingsName === currentName) {
      closeRenameSettings();
      return;
    }
    if (!isFeatureId(renameSettingsName)) {
      setRenameSettingsError('Имя сабагента — kebab-case');
      return;
    }
    setRenameSettingsError('');
    const openFileName = document?.path.split('/').pop();
    void renameSubagent(project, parent, currentName, renameSettingsName)
      .then((result) => {
        closeRenameSettings();
        refreshSettingsTree();
        const parentPath = `${settingsRoot(project)}/${parent}`;
        refreshFeatureTree(parentPath);
        if (openFileName && document && settingsSubagentFromPath(document.path)) {
          const nextFilePath = `${result.path}/${openFileName}`;
          setExpanded((current) => ({
            ...current,
            [result.path]: true,
            [parentPath]: true,
            [settingsRoot(project)]: true,
          }));
          openFile(nextFilePath);
          return;
        }
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [parentPath]: true,
          [settingsRoot(project)]: true,
        }));
      })
      .catch((reason: unknown) => {
        setRenameSettingsError(
          reason instanceof Error ? reason.message : 'Не удалось переименовать сабагента',
        );
      });
  };

  const submitAddSubagent = () => {
    if (!selectedAgentName) {
      return;
    }
    if (!isFeatureId(newSubagentName)) {
      setError('Имя сабагента — kebab-case');
      return;
    }
    setError('');
    void createSubagent(project, selectedAgentName, newSubagentName)
      .then((result) => {
        setAddSubagentOpen(false);
        setNewSubagentName('');
        refreshSettingsTree();
        refreshFeatureTree(`${settingsRoot(project)}/${selectedAgentName}`);
        loadNode(result.path);
        setExpanded((current) => ({
          ...current,
          [result.path]: true,
          [node?.path ?? settingsRoot(project)]: true,
          [settingsRoot(project)]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать сабагента');
      });
  };

  const runDeleteAgent = () => {
    if (!selectedAgentName) {
      return;
    }
    setConfirmDeleteAgent(false);
    void deleteAgent(project, selectedAgentName)
      .then(() => {
        refreshSettingsTree();
        loadNode(settingsRoot(project));
        setExpanded((current) => ({ ...current, [settingsRoot(project)]: true }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось удалить агента');
      });
  };

  const runDeleteSubagent = () => {
    if (!selectedSubagent) {
      return;
    }
    setConfirmDeleteSubagent(false);
    const parentPath = `${settingsRoot(project)}/${selectedSubagent.parent}`;
    void deleteSubagent(project, selectedSubagent.parent, selectedSubagent.name)
      .then(() => {
        refreshSettingsTree();
        loadNode(parentPath);
        setExpanded((current) => ({
          ...current,
          [parentPath]: true,
          [settingsRoot(project)]: true,
        }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось удалить сабагента');
      });
  };

  const requestPublish = (message: string) => {
    setPublishMessage(message);
    setConfirmPublish(true);
  };

  const runPublish = () => {
    setConfirmPublish(false);
    void publishProject()
      .then(() => {
        setToast({ kind: 'ok', message: 'Опубликовано' });
        setChangesRefresh((current) => current + 1);
      })
      .catch((reason: unknown) => {
        setToast({
          kind: 'bad',
          message: reason instanceof Error ? reason.message : 'Не удалось опубликовать',
        });
      });
  };

  const onAfterStatusMove = (newPath: string) => {
    if (project) {
      refreshProjectTree(project);
    }
    const featurePath = resolveFeaturePath(newPath, null);
    if (featurePath) {
      refreshFeatureTree(featurePath);
    }
    setHighlight(null);
    setSelected(newPath);
    setNode(null);
    setError('');
    void openShownFile(newPath)
      .then(setDocument)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
      });
  };

  const loadCopyAgentOptions = (sourceName: string) => {
    setCopySource(sourceName);
    setCopyNames([]);
    setCopyError('');
    if (!sourceName) {
      setCopyAgentOptions([]);
      return;
    }
    void fetchTree(settingsRoot(sourceName))
      .then((entries) => {
        setCopyAgentOptions(
          entries.filter((entry) => entry.kind === 'dir').map((entry) => entry.name),
        );
      })
      .catch((reason: unknown) => {
        setCopyAgentOptions([]);
        setCopyError(reason instanceof Error ? reason.message : 'Не удалось прочитать агентов');
      });
  };

  const openCopyAgents = () => {
    const sourceName = projects.find((name) => name !== project) ?? '';
    setCopyAgentsOpen(true);
    loadCopyAgentOptions(sourceName);
  };

  const closeCopyAgents = () => {
    setCopyAgentsOpen(false);
    setCopyNames([]);
    setCopyError('');
  };

  const toggleCopyName = (name: string) => {
    setCopyNames((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const submitCopyAgents = () => {
    if (!copySource || copySource === project) {
      setCopyError('Выберите другой проект');
      return;
    }
    if (copyNames.length === 0) {
      setCopyError('Выберите агента');
      return;
    }
    setCopyError('');
    void copyAgents(project, copySource, copyNames)
      .then(() => {
        closeCopyAgents();
        refreshSettingsTree();
        loadNode(settingsRoot(project));
      })
      .catch((reason: unknown) => {
        setCopyError(reason instanceof Error ? reason.message : 'Не удалось скопировать агентов');
      });
  };

  const chooseProject = (name: string) => {
    setProject(name);
    const path = isSettings ? settingsRoot(name) : `docs/${name}`;
    setDocument(null);
    setHighlight(null);
    setExpanded((current) => ({ ...current, [path]: true }));
    loadNode(path);
    if (!isSettings && !cache[path]) {
      refreshProjectTree(name);
    }
  };

  return (
    <div className="app">
      {toast && <Toast kind={toast.kind} message={toast.message} />}
      <header className="toolbar">
        <div className="toolbar-start">
          <strong>{isSettings ? 'Визуализатор: Настройки' : 'Визуализатор: Документация'}</strong>
          <label>
            Проект
            <select value={project} onChange={(event) => chooseProject(event.target.value)}>
              {projects.length === 0 && <option value="">Нет проектов</option>}
              {projects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {!isSettings && (
            <>
              <label>
                Эпик
                <input
                  className="toolbar-feature-filter-name"
                  value={epicNameFilter}
                  onChange={(event) => setEpicNameFilter(event.target.value)}
                />
              </label>
              <label>
                Фича
                <input
                  className="toolbar-feature-filter-name"
                  value={featureNameFilter}
                  onChange={(event) => setFeatureNameFilter(event.target.value)}
                />
              </label>
              <label>
                Статус
                <select
                  value={featureStatusFilter}
                  onChange={(event) =>
                    setFeatureStatusFilter(event.target.value as FeatureStatusFilter)
                  }
                >
                  {FEATURE_STATUS_FILTER_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {featureStatusFilterLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="toolbar-end">
          <ChangesMenu
            onOpenFile={openChangeFile}
            onPublish={requestPublish}
            refreshKey={changesRefresh}
          />
          {!isSettings && (
            <div className="toolbar-sync">
              <button
                type="button"
                className="toolbar-sync-button"
                aria-label="Синхронизировать"
                disabled={syncing}
                onClick={runSync}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M13.5 8A5.5 5.5 0 1 1 8 2.5V1M8 2.5L10.5 5M8 2.5L5.5 5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.5 8A5.5 5.5 0 1 0 8 13.5V15M8 13.5L5.5 11M8 13.5L10.5 11"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="toolbar-sync-countdown">{formatSyncCountdown(syncSeconds)}</span>
            </div>
          )}
          <ActionsMenu
            icon="burger"
            leading={
              <>
                <span className="menu-panel-leading-label">Тема</span>
                <ThemeSwitch />
              </>
            }
            items={
              isSettings
                ? [
                    { label: 'Документация', href: '/' },
                    { label: 'Добавить Агента', onClick: () => setAddAgentOpen(true) },
                    { label: 'Скопировать агентов', onClick: openCopyAgents },
                  ]
                : [
                    { label: 'Настройки', href: '/settings' },
                    { label: 'Добавить эпик', onClick: () => setAddEpicOpen(true) },
                    { label: 'Добавить ссылку на документацию', onClick: openDocLink },
                  ]
            }
          />
        </div>
      </header>
      <Modal title="Скопировать агентов" open={copyAgentsOpen} onClose={closeCopyAgents}>
        <label>
          Проект
          <select
            value={copySource}
            onChange={(event) => loadCopyAgentOptions(event.target.value)}
          >
            {projects.filter((name) => name !== project).length === 0 && (
              <option value="">Нет проектов</option>
            )}
            {projects
              .filter((name) => name !== project)
              .map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        </label>
        <div className="copy-agent-list">
          {copyAgentOptions.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={copyNames.includes(name)}
                onChange={() => toggleCopyName(name)}
              />
              {copySource ? `${name}-${copySource}` : name}
            </label>
          ))}
        </div>
        {copyError ? <p className="error">{copyError}</p> : null}
        <div className="modal-actions">
          <button type="button" onClick={closeCopyAgents}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitCopyAgents}>
            Скопировать
          </button>
        </div>
      </Modal>
      <Modal title="Добавить ссылку на документацию" open={docLinkOpen} onClose={closeDocLink}>
        {docLinkConfirm ? (
          <>
            <p>
              Добавить ссылку на документацию проекта {project} в {docLinkDir?.path}?
            </p>
            <div className="modal-actions">
              <button type="button" onClick={() => setDocLinkConfirm(false)}>
                Отмена
              </button>
              <button type="button" className="primary" onClick={submitDocLink}>
                Добавить
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="doc-link-path">{docLinkDir?.path ?? '…'}</p>
            {docLinkDir?.parent ? (
              <button type="button" onClick={() => loadDocLinkDirectory(docLinkDir.parent ?? '')}>
                Вверх
              </button>
            ) : null}
            {docLinkDir && docLinkDir.links.length > 0 ? (
              <ul className="doc-link-links">
                {docLinkDir.links.map((link) => (
                  <li key={link.name}>
                    {link.name} → {link.target}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="doc-link-dirs">
              {docLinkDir?.directories.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    loadDocLinkDirectory(`${docLinkDir.path}/${name}`.replaceAll('//', '/'))
                  }
                >
                  {name}
                </button>
              ))}
            </div>
            {docLinkError ? <p className="error">{docLinkError}</p> : null}
            <div className="modal-actions">
              <button type="button" onClick={closeDocLink}>
                Отмена
              </button>
              <button
                type="button"
                className="primary"
                disabled={!docLinkDir}
                onClick={() => setDocLinkConfirm(true)}
              >
                Добавить
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal title="Добавить эпик" open={addEpicOpen} onClose={closeAddEpic}>
        <label>
          Имя (kebab-case)
          <input value={newEpicId} onChange={(event) => setNewEpicId(event.target.value)} />
        </label>
        {error && addEpicOpen ? <p className="error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" onClick={closeAddEpic}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitAddEpic}>
            Создать
          </button>
        </div>
      </Modal>
      <Modal
        title="Переименовать эпик"
        open={renameEpicOpen}
        onClose={closeRenameEpic}
      >
        <label>
          Имя (kebab-case)
          <input
            value={renameEpicId}
            onChange={(event) => setRenameEpicId(event.target.value)}
          />
        </label>
        {error && renameEpicOpen ? <p className="error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" onClick={closeRenameEpic}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitRenameEpic}>
            Переименовать
          </button>
        </div>
      </Modal>
      <ConfirmModal
        title="Удалить эпик"
        message="Удалить эпик?"
        confirmLabel="Удалить"
        open={confirmDeleteEpic}
        onClose={() => setConfirmDeleteEpic(false)}
        onConfirm={runDeleteEpic}
      />
      <Modal
        title="Добавить фичу"
        open={addFeatureOpen}
        onClose={() => {
          setAddFeatureOpen(false);
          setNewFeatureId('');
        }}
      >
        <label>
          Имя (kebab-case)
          <input
            value={newFeatureId}
            onChange={(event) => setNewFeatureId(event.target.value)}
          />
        </label>
        {error && addFeatureOpen ? <p className="error">{error}</p> : null}
        <div className="modal-actions">
          <button
            type="button"
            onClick={() => {
              setAddFeatureOpen(false);
              setNewFeatureId('');
            }}
          >
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitAddFeature}>
            Создать
          </button>
        </div>
      </Modal>
      <Modal
        title="Добавить Агента"
        open={addAgentOpen}
        onClose={() => {
          setAddAgentOpen(false);
          setNewAgentName('');
        }}
      >
        <label>
          Имя (kebab-case)
          <input
            value={newAgentName}
            onChange={(event) => setNewAgentName(event.target.value)}
          />
        </label>
        {error && addAgentOpen ? <p className="error">{error}</p> : null}
        <div className="modal-actions">
          <button
            type="button"
            onClick={() => {
              setAddAgentOpen(false);
              setNewAgentName('');
            }}
          >
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitAddAgent}>
            Создать
          </button>
        </div>
      </Modal>
      <Modal
        title="Добавить сабагента"
        open={addSubagentOpen}
        onClose={() => {
          setAddSubagentOpen(false);
          setNewSubagentName('');
        }}
      >
        <label>
          Имя (kebab-case)
          <input
            value={newSubagentName}
            onChange={(event) => setNewSubagentName(event.target.value)}
          />
        </label>
        {error && addSubagentOpen ? <p className="error">{error}</p> : null}
        <div className="modal-actions">
          <button
            type="button"
            onClick={() => {
              setAddSubagentOpen(false);
              setNewSubagentName('');
            }}
          >
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitAddSubagent}>
            Создать
          </button>
        </div>
      </Modal>
      <Modal
        title={
          renameSettingsKind === 'agent' ? 'Переименовать агента' : 'Переименовать сабагента'
        }
        open={renameSettingsOpen}
        onClose={closeRenameSettings}
      >
        <label>
          Имя (kebab-case)
          <input
            value={renameSettingsName}
            onChange={(event) => setRenameSettingsName(event.target.value)}
          />
        </label>
        {renameSettingsError ? <p className="error">{renameSettingsError}</p> : null}
        <div className="modal-actions">
          <button type="button" onClick={closeRenameSettings}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitRenameSettings}>
            Переименовать
          </button>
        </div>
      </Modal>
      <Modal title="Имя фичи" open={renameFeatureOpen} onClose={closeRenameFeature}>
        <label>
          Имя (kebab-case)
          <input
            value={renameFeatureId}
            onChange={(event) => setRenameFeatureId(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={closeRenameFeature}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={submitRenameFeature}>
            Сохранить
          </button>
        </div>
      </Modal>
      <ConfirmModal
        title="Удалить фичу"
        message="Удалить фичу?"
        confirmLabel="Удалить"
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={runDeleteFeature}
      />
      <ConfirmModal
        title="Удалить агента"
        message="Удалить агента?"
        confirmLabel="Удалить"
        open={confirmDeleteAgent}
        onClose={() => setConfirmDeleteAgent(false)}
        onConfirm={runDeleteAgent}
      />
      <ConfirmModal
        title="Удалить сабагента"
        message="Удалить сабагента?"
        confirmLabel="Удалить"
        open={confirmDeleteSubagent}
        onClose={() => setConfirmDeleteSubagent(false)}
        onConfirm={runDeleteSubagent}
      />
      <Modal
        title="Публикация"
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
      >
        <pre className="publish-preview">{publishMessage}</pre>
        <div className="modal-actions">
          <button type="button" onClick={() => setConfirmPublish(false)}>
            Отмена
          </button>
          <button type="button" className="primary" onClick={runPublish}>
            Опубликовать
          </button>
        </div>
      </Modal>
      <aside className="tree-column">
        <div className="tree">
          {treeRootPath && (
            <TreeBranch
              path={treeRootPath}
              name={isSettings ? 'settings' : project}
              depth={0}
              hideRoot
              filterMode={isSettings ? undefined : 'epics'}
              epicNameQuery={isSettings ? '' : epicNameFilter}
              featureFilterQuery={isSettings ? undefined : featureFilterQuery}
              expanded={expanded}
              cache={cache}
              selected={selected}
              onToggle={toggle}
              onOpenDir={loadNode}
              onOpenFile={openFile}
            />
          )}
        </div>
      </aside>
      <section className="pane">
        {error &&
        !addAgentOpen &&
        !addSubagentOpen &&
        !renameSettingsOpen &&
        !addEpicOpen &&
        !addFeatureOpen &&
        !renameEpicOpen ? (
          <p className="error">{error}</p>
        ) : null}
        <div className="sheet">
          {node && node.kind !== 'file' && (
            <DirectoryPane
              node={node}
              epicNameQuery={isSettings ? '' : epicNameFilter}
              featureFilterQuery={isSettings ? { nameQuery: '', status: 'all' } : featureFilterQuery}
              onOpen={loadNode}
              onOpenFile={openFile}
              onAddFeature={openAddFeature}
              onRenameEpic={openRenameEpic}
              onDeleteEpic={() => setConfirmDeleteEpic(true)}
              onRenameFeature={openRenameFeature}
              onDeleteFeature={(path) => {
                setDeleteFeaturePath(path);
                setConfirmDelete(true);
              }}
              onRenameAgent={openRenameAgent}
              onDeleteAgent={() => setConfirmDeleteAgent(true)}
              onAddSubagent={() => setAddSubagentOpen(true)}
              onRenameSubagent={openRenameSubagent}
              onDeleteSubagent={() => setConfirmDeleteSubagent(true)}
            />
          )}
          {document && isSettings && settingsSubagentFocus && (
            <SettingsEntityHeading
              name={settingsSubagentFocus.name}
              onRename={openRenameSubagent}
              onDelete={() => setConfirmDeleteSubagent(true)}
            />
          )}
          {document && isSettings && settingsAgentFocus && (
            <SettingsEntityHeading
              name={settingsAgentFocus.name}
              onRename={openRenameAgent}
              onDelete={() => setConfirmDeleteAgent(true)}
              onAddSubagent={() => setAddSubagentOpen(true)}
            />
          )}
          {document && (
            <DocumentView
              key={document.path}
              path={document.path}
              content={document.content}
              highlight={highlight}
              onOpenFile={openFile}
              onAfterStatusMove={onAfterStatusMove}
            />
          )}
          {!node && !document && <p>Выберите каталог или файл.</p>}
        </div>
      </section>
    </div>
  );
};

type BranchProps = {
  path: string;
  name: string;
  depth: number;
  hideRoot?: boolean;
  filterMode?: 'epics' | 'features';
  epicNameQuery?: string;
  featureFilterQuery?: FeatureFilterQuery;
  status?: FeatureStatus;
  expanded: Record<string, boolean>;
  cache: Cache;
  selected: string;
  onToggle: (path: string) => void;
  onOpenDir: (path: string) => void;
  onOpenFile: (path: string) => void;
};

const TreeBranch: FC<BranchProps> = (props) => {
  const {
    path,
    name,
    depth,
    hideRoot,
    filterMode,
    epicNameQuery,
    featureFilterQuery,
    status,
    expanded,
    cache,
    selected,
    onToggle,
    onOpenDir,
    onOpenFile,
  } = props;
  const isOpen = hideRoot ? true : Boolean(expanded[path]);
  const entries = cache[path] ?? [];
  const listEntries =
    filterMode === 'epics'
      ? entries.filter((entry) => {
          if (!epicMatchesFilter(entry.name, epicNameQuery ?? '')) {
            return false;
          }
          if (!featureFilterQuery || !isFeatureFilterActive(featureFilterQuery)) {
            return true;
          }
          const children = cache[childPath(path, entry.name)];
          if (!children) {
            return true;
          }
          return children.some(
            (child) =>
              child.kind === 'dir' &&
              featureMatchesFilter(child.name, child.status, featureFilterQuery),
          );
        })
      : filterMode === 'features' && featureFilterQuery
        ? entries.filter((entry) =>
            entry.kind === 'dir'
              ? featureMatchesFilter(entry.name, entry.status, featureFilterQuery)
              : true,
          )
        : entries;
  const epicFilterActive = (epicNameQuery ?? '').trim() !== '';
  const showFilterEmpty =
    filterMode === 'epics' &&
    (epicFilterActive ||
      isFeatureFilterActive(featureFilterQuery ?? { nameQuery: '', status: 'all' })) &&
    entries.length > 0 &&
    listEntries.length === 0;
  const range = visibleRange(listEntries.length, 0, 28, 480);
  const visible = listEntries.slice(range.start, range.end);

  const renderChildren = (childDepth: number) =>
    visible.map((entry) => {
      const next = childPath(path, entry.name);
      const filePath = entry.path ?? next;
      if (entry.kind === 'dir') {
        return (
          <TreeBranch
            key={next}
            path={next}
            name={entry.name}
            depth={childDepth}
            filterMode={filterMode === 'epics' ? 'features' : undefined}
            featureFilterQuery={filterMode === 'epics' ? featureFilterQuery : undefined}
            status={entry.status}
            expanded={expanded}
            cache={cache}
            selected={selected}
            onToggle={onToggle}
            onOpenDir={onOpenDir}
            onOpenFile={onOpenFile}
          />
        );
      }
      return (
        <button
          key={filePath}
          type="button"
          className="tree-row"
          style={{ paddingLeft: `${childDepth * 12}px` }}
          aria-current={selected === filePath ? 'page' : undefined}
          onClick={() => onOpenFile(filePath)}
        >
          <span>{entry.name}</span>
          {entry.status || entry.hasOpenChange ? (
            <span className="tree-status-group">
              {entry.status ? (
                <span
                  className={treeStatusClass(entry.status)}
                  title={statusLabel(entry.status)}
                  aria-label={statusLabel(entry.status)}
                />
              ) : null}
              {entry.hasOpenChange ? (
                <span
                  className={treeStatusClass('changes')}
                  title={statusLabel('changes')}
                  aria-label={statusLabel('changes')}
                />
              ) : null}
            </span>
          ) : null}
        </button>
      );
    });

  if (hideRoot) {
    return (
      <div>
        {showFilterEmpty ? <p className="tree-empty">Ничего не найдено</p> : null}
        {renderChildren(0)}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="tree-row"
        style={{ paddingLeft: `${depth * 12}px` }}
        aria-current={selected === path ? 'page' : undefined}
        onClick={() => {
          onToggle(path);
          onOpenDir(path);
        }}
      >
        <span>
          {isOpen ? '▾' : '▸'} {name}
        </span>
        {status && (
          <span
            className={treeStatusClass(status)}
            title={statusLabel(status)}
            aria-label={statusLabel(status)}
          />
        )}
      </button>
      {isOpen && renderChildren(depth + 1)}
    </div>
  );
};

type SettingsEntityHeadingProps = {
  name: string;
  onRename: () => void;
  onDelete: () => void;
  onAddSubagent?: () => void;
};

const SettingsEntityHeading: FC<SettingsEntityHeadingProps> = (props) => {
  const { name, onRename, onDelete, onAddSubagent } = props;
  return (
    <div className="feature-heading">
      <span className="feature-heading-name">{name}</span>
      <span className="feature-heading-actions">
        {onAddSubagent ? (
          <button type="button" onClick={onAddSubagent}>
            Добавить сабагента
          </button>
        ) : null}
        <button type="button" onClick={onRename}>
          Переименовать
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Удалить
        </button>
      </span>
    </div>
  );
};

type PaneProps = {
  node: NodeDescription;
  epicNameQuery: string;
  featureFilterQuery: FeatureFilterQuery;
  onOpen: (path: string) => void;
  onOpenFile: (path: string) => void;
  onAddFeature: (epicPath: string) => void;
  onRenameEpic: (path: string, epicId: string) => void;
  onDeleteEpic: () => void;
  onRenameFeature: (path: string, featureId: string) => void;
  onDeleteFeature: (path: string) => void;
  onRenameAgent: () => void;
  onDeleteAgent: () => void;
  onAddSubagent: () => void;
  onRenameSubagent: () => void;
  onDeleteSubagent: () => void;
};

const DirectoryPane: FC<PaneProps> = (props) => {
  const {
    node,
    epicNameQuery,
    featureFilterQuery,
    onOpen,
    onOpenFile,
    onAddFeature,
    onRenameEpic,
    onDeleteEpic,
    onRenameFeature,
    onDeleteFeature,
    onRenameAgent,
    onDeleteAgent,
    onAddSubagent,
    onRenameSubagent,
    onDeleteSubagent,
  } = props;
  const entries =
    node.kind === 'project'
      ? (node.entries ?? []).filter((entry) => epicMatchesFilter(entry.name, epicNameQuery))
      : node.kind === 'epic'
        ? (node.entries ?? []).filter((entry) =>
            featureMatchesFilter(entry.name, entry.status, featureFilterQuery),
          )
        : (node.entries ?? []);
  const epicId = node.kind === 'epic' ? (node.path.split('/').pop() ?? '') : '';
  const agentName = isSettingsAgentPath(node.path) ? (node.path.split('/').pop() ?? '') : '';
  const subagentName = isSettingsSubagentPath(node.path)
    ? (node.path.split('/').pop() ?? '')
    : '';
  return (
    <div className="sheet-card">
      {agentName !== '' && (
        <SettingsEntityHeading
          name={agentName}
          onRename={onRenameAgent}
          onDelete={onDeleteAgent}
          onAddSubagent={onAddSubagent}
        />
      )}
      {subagentName !== '' && (
        <SettingsEntityHeading
          name={subagentName}
          onRename={onRenameSubagent}
          onDelete={onDeleteSubagent}
        />
      )}
      {node.kind === 'epic' && (
        <div className="feature-heading">
          <span className="feature-heading-name">{epicId}</span>
          <span className="feature-heading-actions">
            <button type="button" onClick={() => onAddFeature(node.path)}>
              Добавить фичу
            </button>
            <button type="button" onClick={() => onRenameEpic(node.path, epicId)}>
              Переименовать
            </button>
            <button type="button" onClick={onDeleteEpic}>
              Удалить
            </button>
          </span>
        </div>
      )}
      {node.kind === 'feature' && node.status && (
        <p>
          <span className={statusTagClass(node.status)}>{statusLabel(node.status)}</span>
        </p>
      )}
      <ul className="file-list-grid">
        {entries.map((entry) => {
          const dirPath = childPath(node.path, entry.name);
          const filePath = entry.path ?? dirPath;
          const key = entry.path ?? dirPath;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => (entry.kind === 'dir' ? onOpen(dirPath) : onOpenFile(filePath))}
              >
                {entry.name}
              </button>
              {node.kind === 'epic' && entry.kind === 'dir' ? (
                <span className="file-row-actions">
                  <button
                    type="button"
                    onClick={() => onRenameFeature(dirPath, entry.name)}
                  >
                    Редактировать
                  </button>
                  <button type="button" onClick={() => onDeleteFeature(dirPath)}>
                    Удалить
                  </button>
                </span>
              ) : null}
              {entry.status ? (
                <span className={statusTagClass(entry.status)}>{statusLabel(entry.status)}</span>
              ) : null}
              {entry.hasOpenChange ? (
                <span className={statusTagClass('changes')}>{statusLabel('changes')}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
