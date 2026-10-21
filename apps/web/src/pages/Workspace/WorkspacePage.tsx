import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { DocumentView } from '../../features/document-view/DocumentView';
import { ThemeSwitch } from '../../features/theme/ThemeSwitch';
import { ActionsMenu } from '../../shared/ActionsMenu';
import {
  createFeature,
  deleteFeature,
  fetchDocument,
  fetchNode,
  fetchTree,
  publishProject,
  syncProject,
  type NodeDescription,
  type TreeEntry,
} from '../../shared/api';
import { ConfirmModal } from '../../shared/ConfirmModal';
import { Modal } from '../../shared/Modal';
import {
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

const FEATURE_STATUS_FILTER_OPTIONS: FeatureStatusFilter[] = [
  'all',
  'changes',
  'in_progress',
  'ready',
  'done',
];

const featureStatusFilterLabel = (value: FeatureStatusFilter): string =>
  value === 'all' ? 'Все' : statusLabel(value);

type Props = {
  projects: string[];
  featureEntries: TreeEntry[];
};

type Cache = Record<string, TreeEntry[]>;

const childPath = (parent: string, name: string): string => `${parent}/${name}`;

const initialProjectPath = (projects: string[]): string =>
  projects[0] ? `docs/${projects[0]}` : '';

export const WorkspacePage: FC<Props> = (props) => {
  const { projects, featureEntries } = props;
  const [project, setProject] = useState(projects[0] ?? '');
  const projectPath = project ? `docs/${project}` : '';
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const path = initialProjectPath(projects);
    return path ? { [path]: true } : {};
  });
  const [cache, setCache] = useState<Cache>(() => {
    const path = initialProjectPath(projects);
    return path ? { [path]: featureEntries } : {};
  });
  const [selected, setSelected] = useState(() => initialProjectPath(projects));
  const [node, setNode] = useState<NodeDescription | null>(() => {
    const path = initialProjectPath(projects);
    if (!path) {
      return null;
    }
    return {
      path,
      kind: 'project',
      entries: featureEntries,
    };
  });
  const [document, setDocument] = useState<{ path: string; content: string } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [newFeatureId, setNewFeatureId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [featureNameFilter, setFeatureNameFilter] = useState('');
  const [featureStatusFilter, setFeatureStatusFilter] = useState<FeatureStatusFilter>('all');
  const [syncSeconds, setSyncSeconds] = useState(60);
  const [syncing, setSyncing] = useState(false);

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
    void fetchDocument(path)
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

  const refreshFeatureTree = (featurePath: string) => {
    void fetchTree(featurePath).then((entries) => {
      setCache((current) => ({ ...current, [featurePath]: entries }));
    });
  };

  const refreshOpenScreen = useCallback(() => {
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
      void fetchDocument(currentDocument.path)
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
  }, []);

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
  }, []);

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
      const proj = projectRef.current;
      const docPath = documentRef.current?.path;
      const prefix = proj ? `docs/${proj}/` : '';
      const shouldRefresh = paths.some(
        (path) => path === docPath || (prefix !== '' && path.startsWith(prefix)),
      );
      if (shouldRefresh) {
        refreshOpenScreenRef.current();
      }
    };
    return () => source.close();
  }, []);

  const selectedFeaturePath = resolveFeaturePath(
    selected,
    node?.kind === 'feature' ? node.path : null,
  );

  const submitAddFeature = () => {
    if (!project) {
      setError('Выберите проект');
      return;
    }
    if (!isFeatureId(newFeatureId)) {
      setError('Имя фичи — kebab-case');
      return;
    }
    setError('');
    void createFeature(project, newFeatureId)
      .then((result) => {
        setAddFeatureOpen(false);
        setNewFeatureId('');
        refreshProjectTree(project);
        loadNode(result.path);
        setExpanded((current) => ({ ...current, [result.path]: true, [projectPath]: true }));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать фичу');
      });
  };

  const requestDeleteFeature = () => {
    if (!selectedFeaturePath) {
      setError('Выберите фичу');
      return;
    }
    setError('');
    setConfirmDelete(true);
  };

  const runDeleteFeature = () => {
    if (!selectedFeaturePath || !project) {
      return;
    }
    setConfirmDelete(false);
    void deleteFeature(selectedFeaturePath)
      .then(() => {
        refreshProjectTree(project);
        chooseProject(project);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось удалить фичу');
      });
  };

  const requestPublish = () => {
    if (!project) {
      setError('Выберите проект');
      return;
    }
    setError('');
    setConfirmPublish(true);
  };

  const runPublish = () => {
    if (!project) {
      return;
    }
    setConfirmPublish(false);
    void publishProject(project).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Не удалось опубликовать');
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
    void fetchDocument(newPath)
      .then(setDocument)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось прочитать файл');
      });
  };

  const chooseProject = (name: string) => {
    setProject(name);
    const path = `docs/${name}`;
    setExpanded((current) => ({ ...current, [path]: true }));
    loadNode(path);
    if (!cache[path]) {
      refreshProjectTree(name);
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-start">
          <strong>Визуализатор</strong>
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
        </div>
        <div className="toolbar-end">
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
          <ActionsMenu
            items={[
              { label: 'Добавить фичу', onClick: () => setAddFeatureOpen(true) },
              { label: 'Удалить фичу', onClick: requestDeleteFeature },
              { label: 'Опубликовать', onClick: requestPublish },
            ]}
          />
          <ThemeSwitch />
          <a href="/admin">Админка</a>
        </div>
      </header>
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
      <ConfirmModal
        title="Удалить фичу"
        message="Удалить фичу?"
        confirmLabel="Удалить"
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={runDeleteFeature}
      />
      <ConfirmModal
        title="Публикация"
        message={project ? `Опубликовать проект ${project}?` : ''}
        confirmLabel="Опубликовать"
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={runPublish}
      />
      <aside className="tree-column">
        <div className="tree">
          {projectPath && (
            <TreeBranch
              path={projectPath}
              name={project}
              depth={0}
              hideRoot
              featureFilterQuery={featureFilterQuery}
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
        {error && <p className="error">{error}</p>}
        <div className="sheet">
          {node && node.kind !== 'file' && (
            <DirectoryPane
              node={node}
              featureFilterQuery={featureFilterQuery}
              onOpen={loadNode}
              onOpenFile={openFile}
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
    hideRoot && featureFilterQuery
      ? entries.filter((entry) =>
          featureMatchesFilter(entry.name, entry.status, featureFilterQuery),
        )
      : entries;
  const showFilterEmpty =
    Boolean(hideRoot && featureFilterQuery) &&
    isFeatureFilterActive(featureFilterQuery ?? { nameQuery: '', status: 'all' }) &&
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

type PaneProps = {
  node: NodeDescription;
  featureFilterQuery: FeatureFilterQuery;
  onOpen: (path: string) => void;
  onOpenFile: (path: string) => void;
};

const DirectoryPane: FC<PaneProps> = (props) => {
  const { node, featureFilterQuery, onOpen, onOpenFile } = props;
  const entries =
    node.kind === 'project'
      ? (node.entries ?? []).filter((entry) =>
          featureMatchesFilter(entry.name, entry.status, featureFilterQuery),
        )
      : (node.entries ?? []);
  return (
    <div className="sheet-card">
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
