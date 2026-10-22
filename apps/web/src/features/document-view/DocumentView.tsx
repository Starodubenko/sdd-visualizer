import { useEffect, useRef, useState, type FC } from 'react';
import {
  displayDocumentPath,
  isKeyFileName,
  otherStatuses,
  statusLabel,
  statusTagClass,
  type FeatureStatus,
} from '../../pages/Workspace/tree-window';
import {
  buildAppliedUpdateMeta,
  featureUpdatesDoneTreePath,
  featureUpdatesInProgressTreePath,
  fileHasOpenChange,
  isUpdatesDocumentPath,
  type AppliedUpdateMeta,
} from './collapser-updates';
import { createUpdate, fetchDocument, fetchTree, moveDocumentStatus } from '../../shared/api';
import { ActionsMenu } from '../../shared/ActionsMenu';
import { ConfirmModal } from '../../shared/ConfirmModal';
import {
  alternateStatusPaths,
  updateFeatureStatusCandidates,
  updateLinkedSectionHighlight,
} from './doc-links';
import { clearHighlight, highlightFragment } from './highlight-text';
import { imageRawHref, isImagePath } from './image-path';
import { MarkdownView } from './MarkdownView';
import { fragmentLink } from './text-fragment';
import { YamlView } from './YamlView';

type Props = {
  path: string;
  content: string;
  highlight: string | null;
  onOpenFile: (path: string, highlight?: string | null) => void;
  onAfterStatusMove: (newPath: string) => void;
};

type PendingStatus = {
  status: FeatureStatus;
};

type CopyLinkPopover = {
  top: number;
  left: number;
  text: string;
};

const loadUpdatesFromTree = async (treePath: string): Promise<AppliedUpdateMeta[]> => {
  try {
    const entries = await fetchTree(treePath);
    const fileEntries = entries.filter((entry) => entry.kind === 'file');
    const loaded = await Promise.all(
      fileEntries.map(async (entry) => {
        const filePath = entry.path ?? `${treePath}/${entry.name}`;
        const document = await fetchDocument(filePath);
        return buildAppliedUpdateMeta(filePath, document.content);
      }),
    );
    return loaded.filter((entry): entry is AppliedUpdateMeta => entry !== null);
  } catch {
    return [];
  }
};

const fileStatus = (path: string): 'in_progress' | 'ready' | 'done' | null => {
  if (path.includes('/in-progress/')) {
    return 'in_progress';
  }
  if (path.includes('/ready-to-implement/')) {
    return 'ready';
  }
  if (path.includes('/done/')) {
    return 'done';
  }
  return null;
};

export const DocumentView: FC<Props> = (props) => {
  const { path, content, highlight, onOpenFile, onAfterStatusMove } = props;
  const articleRef = useRef<HTMLElement>(null);
  const [error, setError] = useState('');
  const [copyLink, setCopyLink] = useState<CopyLinkPopover | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);
  const [appliedUpdates, setAppliedUpdates] = useState<AppliedUpdateMeta[]>([]);
  const [openUpdates, setOpenUpdates] = useState<AppliedUpdateMeta[]>([]);
  const [addChangePending, setAddChangePending] = useState(false);
  const status = fileStatus(path);
  const canCreateUpdate = status === 'done' && !isUpdatesDocumentPath(path);
  const fileName = path.split('/').pop() ?? '';
  const isMarkdown = path.endsWith('.md');
  const isYaml = path.endsWith('.yaml') || path.endsWith('.yml');
  const isImage = isImagePath(path);
  const isPendingUpdateFile =
    isUpdatesDocumentPath(path) && !path.includes('/updates/done/');
  const statusActions = isPendingUpdateFile
    ? [
        {
          label: statusLabel('done'),
          onClick: () => setPendingStatus({ status: 'done' }),
        },
      ]
    : status && isKeyFileName(fileName)
      ? otherStatuses(status).map((next) => ({
          label: statusLabel(next),
          onClick: () => setPendingStatus({ status: next }),
        }))
      : [];

  const runStatusMove = () => {
    if (!pendingStatus) {
      return;
    }
    const nextStatus = pendingStatus.status;
    setPendingStatus(null);
    setError('');
    void moveDocumentStatus(path, nextStatus)
      .then((result) => {
        onAfterStatusMove(result.path);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось перенести файл');
      });
  };

  const openLinkedFile = (targetPath: string, nextHighlight?: string | null) => {
    setError('');
    const linkedName = targetPath.split('/').pop() ?? targetPath;
    const resolvedHighlight =
      nextHighlight !== undefined
        ? nextHighlight
        : updateLinkedSectionHighlight(content, linkedName);
    const candidates = [
      ...updateFeatureStatusCandidates(path, linkedName),
      targetPath,
      ...alternateStatusPaths(targetPath),
    ];
    void (async () => {
      for (const candidate of candidates) {
        try {
          await fetchDocument(candidate);
          onOpenFile(candidate, resolvedHighlight);
          return;
        } catch {
          // try next alternate path
        }
      }
      setError('Не удалось открыть файл');
    })();
  };

  const onArticleMouseUp = () => {
    const article = articleRef.current;
    const selection = window.getSelection();
    if (!article || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setCopyLink(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) {
      setCopyLink(null);
      return;
    }
    const selectedText = selection.toString();
    if (selectedText.trim() === '') {
      setCopyLink(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setCopyLink({
      top: rect.bottom + 4,
      left: rect.left,
      text: selectedText,
    });
  };

  const copyFragmentLink = () => {
    if (!copyLink) {
      return;
    }
    const fileName = path.split('/').pop() ?? '';
    void navigator.clipboard
      .writeText(fragmentLink(fileName, copyLink.text))
      .then(() => {
        setCopyLink(null);
        setError('');
      })
      .catch(() => {
        setError('Не удалось скопировать');
      });
  };

  useEffect(() => {
    const doneTreePath = featureUpdatesDoneTreePath(path);
    const inProgressTreePath = featureUpdatesInProgressTreePath(path);
    if (!doneTreePath && !inProgressTreePath) {
      setAppliedUpdates([]);
      setOpenUpdates([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [doneList, openList] = await Promise.all([
        doneTreePath ? loadUpdatesFromTree(doneTreePath) : Promise.resolve([]),
        inProgressTreePath ? loadUpdatesFromTree(inProgressTreePath) : Promise.resolve([]),
      ]);
      if (!cancelled) {
        setAppliedUpdates(doneList);
        setOpenUpdates(openList);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  const submitSectionChange = (sectionTitle: string, blockBody: string) => {
    setError('');
    setAddChangePending(true);
    void createUpdate(path, sectionTitle, blockBody)
      .then((result) => {
        onOpenFile(result.path, 'Правка');
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось создать изменение');
      })
      .finally(() => {
        setAddChangePending(false);
      });
  };

  useEffect(() => {
    const article = articleRef.current;
    if (!article) {
      return;
    }
    clearHighlight(article);
    if (!highlight || highlight.trim() === '') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const mark = highlightFragment(article, highlight);
      mark?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [highlight, content, path]);

  return (
    <article className="document" ref={articleRef} onMouseUp={onArticleMouseUp}>
      <div className="doc-bar">
        <div className="toolbar-start">
          <span>{displayDocumentPath(path)}</span>
          {status && (
            <span className={statusTagClass(status)}>{statusLabel(status)}</span>
          )}
          {!isUpdatesDocumentPath(path) &&
            fileHasOpenChange(openUpdates, fileName) && (
              <span className={statusTagClass('changes')}>
                {statusLabel('changes')}
              </span>
            )}
        </div>
        {statusActions.length > 0 && (
          <div className="toolbar-end">
            <ActionsMenu items={statusActions} />
          </div>
        )}
      </div>
      <ConfirmModal
        title="Смена статуса"
        message={
          pendingStatus
            ? `Перенести файл в «${statusLabel(pendingStatus.status)}»?`
            : ''
        }
        confirmLabel="Перенести"
        open={pendingStatus !== null}
        onClose={() => setPendingStatus(null)}
        onConfirm={runStatusMove}
      />
      <div className="sheet-card">
        {isMarkdown && (
          <MarkdownView
            documentPath={path}
            content={content}
            appliedUpdates={appliedUpdates}
            openUpdates={openUpdates}
            canCreateUpdate={canCreateUpdate}
            addChangeDisabled={addChangePending}
            onOpenFile={openLinkedFile}
            onAddSectionChange={submitSectionChange}
          />
        )}
        {isYaml && (
          <YamlView
            documentPath={path}
            content={content}
            appliedUpdates={appliedUpdates}
            openUpdates={openUpdates}
            canCreateUpdate={canCreateUpdate}
            addChangeDisabled={addChangePending}
            onOpenFile={openLinkedFile}
            onAddSectionChange={submitSectionChange}
          />
        )}
        {isImage && <img className="asset-image" src={imageRawHref(path)} alt={fileName} />}
        {!isMarkdown && !isYaml && !isImage && <pre>{content}</pre>}
        {error && <p className="error">{error}</p>}
      </div>
      {copyLink && (
        <button
          type="button"
          className="copy-link"
          style={{ top: `${copyLink.top}px`, left: `${copyLink.left}px` }}
          onClick={copyFragmentLink}
        >
          Скопировать ссылку
        </button>
      )}
    </article>
  );
};
