import { useCallback, useEffect, useState, type FC } from 'react';
import { fetchChanges, type ChangeEntry, type ProjectChanges } from '../../shared/api';
import { useCloseOnOutside } from '../../shared/useCloseOnOutside';
import { buildChangeTree, type ChangeTreeNode } from './change-tree';

type Props = {
  onOpenFile: (project: string, path: string) => void;
  onPublish: (message: string) => void;
  refreshKey: number;
};

const statusLabel = (status: ChangeEntry['status']): string => {
  if (status === 'added') {
    return 'добавлен';
  }
  if (status === 'deleted') {
    return 'удалён';
  }
  return 'изменён';
};

const statusClass = (status: ChangeEntry['status']): string => {
  if (status === 'added') {
    return 'changes-status-added';
  }
  if (status === 'deleted') {
    return 'changes-status-deleted';
  }
  return 'changes-status-modified';
};

const DocumentPencilIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4.5 2.5h5l3 3V12.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 2.5V5.5h3"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
    <path
      d="M11.5 9.5 13 11 10.5 13.5H8.5V11.5l3-2Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);

type TreeRowProps = {
  project: string;
  node: ChangeTreeNode;
  depth: number;
  onOpenFile: (project: string, path: string) => void;
  onClose: () => void;
  pathPrefix: string;
};

const ChangeTreeRow: FC<TreeRowProps> = (props) => {
  const { project, node, depth, onOpenFile, onClose, pathPrefix } = props;
  const fullPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
  const indent = { paddingLeft: `${12 * depth}px` };

  if (node.status) {
    const label = statusLabel(node.status);
    if (node.status === 'deleted') {
      return (
        <div className="changes-file-row" style={indent}>
          <span className="changes-file-name">{node.name}</span>
          <span className={statusClass(node.status)}>{label}</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        className="changes-file-row changes-file-button"
        style={indent}
        onClick={() => {
          onClose();
          onOpenFile(project, fullPath);
        }}
      >
        <span className="changes-file-name">{node.name}</span>
        <span className={statusClass(node.status)}>{label}</span>
      </button>
    );
  }

  return (
    <div className="changes-tree-branch">
      <div className="changes-dir-name" style={indent}>
        {node.name}
      </div>
      {(node.children ?? []).map((child) => (
        <ChangeTreeRow
          key={`${fullPath}/${child.name}`}
          project={project}
          node={child}
          depth={depth + 1}
          onOpenFile={onOpenFile}
          onClose={onClose}
          pathPrefix={fullPath}
        />
      ))}
    </div>
  );
};

const ProjectGroup: FC<{
  group: ProjectChanges;
  onOpenFile: (project: string, path: string) => void;
  onClose: () => void;
}> = (props) => {
  const { group, onOpenFile, onClose } = props;
  const tree = buildChangeTree(group.entries);
  return (
    <div className="changes-project">
      <div className="changes-project-name">{group.name}</div>
      {tree.map((node) => (
        <ChangeTreeRow
          key={node.name}
          project={group.name}
          node={node}
          depth={0}
          onOpenFile={onOpenFile}
          onClose={onClose}
          pathPrefix=""
        />
      ))}
    </div>
  );
};

export const ChangesMenu: FC<Props> = (props) => {
  const { onOpenFile, onPublish, refreshKey } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ProjectChanges[] | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const ref = useCloseOnOutside(open, close);

  useEffect(() => {
    void fetchChanges()
      .then((response) => {
        setHasChanges(response.projects.length > 0);
      })
      .catch(() => {
        // keep previous highlight on background fetch failure
      });
  }, [refreshKey]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      if (next) {
        setLoading(true);
        setError('');
        void fetchChanges()
          .then((response) => {
            setData(response.projects);
            setCommitMessage(response.message);
            setHasChanges(response.projects.length > 0);
          })
          .catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : 'Не удалось загрузить изменения');
          })
          .finally(() => {
            setLoading(false);
          });
      }
      return next;
    });
  };

  const buttonClassName = hasChanges
    ? 'toolbar-changes-button has-changes'
    : 'toolbar-changes-button';

  return (
    <div className="changes-menu" ref={ref}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={hasChanges ? 'Есть изменения' : 'Изменения'}
        aria-expanded={open}
        onClick={toggle}
      >
        <DocumentPencilIcon />
      </button>
      {open && (
        <div className="changes-panel">
          {loading && data === null && !error && <p className="changes-message">Загрузка…</p>}
          {error && <p className="changes-message changes-error">{error}</p>}
          {!loading && !error && data !== null && data.length === 0 && (
            <p className="changes-message">Нет изменений</p>
          )}
          {data !== null &&
            data.map((group) => (
              <ProjectGroup
                key={group.name}
                group={group}
                onOpenFile={onOpenFile}
                onClose={close}
              />
            ))}
          {data !== null && data.length > 0 && (
            <button
              type="button"
              className="changes-publish primary"
              onClick={() => {
                close();
                onPublish(commitMessage);
              }}
            >
              Опубликовать
            </button>
          )}
        </div>
      )}
    </div>
  );
};
