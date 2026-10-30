import { useEffect, useRef, useState, type FC } from 'react';
import { createPortal } from 'react-dom';
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
import { createUpdate, fetchDocument, fetchTree, moveDocumentStatus, saveDocument } from '../../shared/api';
import { ActionsMenu } from '../../shared/ActionsMenu';
import { ConfirmModal } from '../../shared/ConfirmModal';
import {
  alternateStatusPaths,
  updateFeatureStatusCandidates,
  updateLinkedSectionHighlight,
} from './doc-links';
import { clearHighlight, highlightFragment } from './highlight-text';
import { AssetCanvas } from './asset-notes/AssetCanvas';
import { isImagePath } from './image-path';
import { highlightForAnchor } from './adoc-sections';
import { AsciiDocView } from './AsciiDocView';
import { copyText } from './asset-notes/note-link';
import { Toast } from '../../shared/Toast';
import { fragmentBrowserHref, textFromFragmentHash } from './text-fragment';
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
  const [documentText, setDocumentText] = useState(content);
  const articleRef = useRef<HTMLElement>(null);
  const [error, setError] = useState('');
  const [copyLink, setCopyLink] = useState<CopyLinkPopover | null>(null);
  const [linkToast, setLinkToast] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);
  const [appliedUpdates, setAppliedUpdates] = useState<AppliedUpdateMeta[]>([]);
  const [openUpdates, setOpenUpdates] = useState<AppliedUpdateMeta[]>([]);
  const [addChangePending, setAddChangePending] = useState(false);
  const status = fileStatus(path);
  const canCreateUpdate = status === 'done' && !isUpdatesDocumentPath(path);
  const fileName = path.split('/').pop() ?? '';
  const isAdoc = path.endsWith('.adoc');
  const isYaml = path.endsWith('.yaml') || path.endsWith('.yml');
  const isImage = isImagePath(path);
  const editable = isAdoc && !path.includes('/done/');
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

  const openLinkedFile = (targetPath: string, nextHighlight?: string | null, anchor?: string | null) => {
    setError('');
    const linkedName = targetPath.split('/').pop() ?? targetPath;
    const resolvedHighlight =
      nextHighlight !== undefined
        ? nextHighlight
        : updateLinkedSectionHighlight(documentText, linkedName);
    const candidates = [
      ...updateFeatureStatusCandidates(path, linkedName),
      targetPath,
      ...alternateStatusPaths(targetPath),
    ];
    void (async () => {
      for (const candidate of candidates) {
        try {
          const document = await fetchDocument(candidate);
          const fragmentText = anchor ? textFromFragmentHash(anchor) : null;
          const fromAnchor = anchor && !fragmentText ? highlightForAnchor(document.content, anchor) : null;
          if (fragmentText) {
            const nextUrl = new URL(window.location.href);
            nextUrl.hash = `t=${fragmentText}`;
            window.history.replaceState(null, '', nextUrl.toString());
          } else if (window.location.hash.startsWith('#t=')) {
            const nextUrl = new URL(window.location.href);
            nextUrl.hash = '';
            window.history.replaceState(null, '', nextUrl.toString());
          }
          onOpenFile(candidate, fragmentText ?? fromAnchor ?? resolvedHighlight);
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
    copyText(fragmentBrowserHref(window.location.href, copyLink.text));
    setCopyLink(null);
    setLinkToast((current) => current + 1);
  };

  useEffect(() => {
    if (linkToast === 0) {
      return;
    }
    const timer = window.setTimeout(() => setLinkToast(0), 2500);
    return () => window.clearTimeout(timer);
  }, [linkToast]);

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
  }, [highlight, documentText, path]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) {
      return;
    }
    const applyHash = () => {
      const pagePath = new URLSearchParams(window.location.search).get('path');
      const text = textFromFragmentHash(window.location.hash);
      if (!text || pagePath !== path || article.querySelector('mark.text-hit')) {
        return;
      }
      clearHighlight(article);
      const mark = highlightFragment(article, text);
      mark?.scrollIntoView({ block: 'center', inline: 'nearest' });
    };
    applyHash();
    const timer = window.setInterval(applyHash, 200);
    const stop = window.setTimeout(() => window.clearInterval(timer), 3000);
    window.addEventListener('hashchange', applyHash);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      window.removeEventListener('hashchange', applyHash);
    };
  }, [documentText, path]);

  useEffect(() => {
    setDocumentText(content);
  }, [content, path]);

  const saveContent = (next: string): Promise<void> =>
    saveDocument(path, next).then(() => {
      setDocumentText(next);
    });

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
        {isAdoc && (
          <AsciiDocView
            documentPath={path}
            content={documentText}
            appliedUpdates={appliedUpdates}
            openUpdates={openUpdates}
            canCreateUpdate={canCreateUpdate}
            addChangeDisabled={addChangePending}
            onOpenFile={openLinkedFile}
            onAddSectionChange={submitSectionChange}
            editable={editable}
            onSaveContent={saveContent}
          />
        )}
        {isYaml && (
          <YamlView
            documentPath={path}
            content={documentText}
            appliedUpdates={appliedUpdates}
            openUpdates={openUpdates}
            canCreateUpdate={canCreateUpdate}
            addChangeDisabled={addChangePending}
            onOpenFile={openLinkedFile}
            onAddSectionChange={submitSectionChange}
          />
        )}
        {isImage && <AssetCanvas imagePath={path} editable startMarking />}
        {!isAdoc && !isYaml && !isImage && <pre>{content}</pre>}
        {error && <p className="error">{error}</p>}
      </div>
      {linkToast > 0 && createPortal(<Toast kind="ok" message="Ссылка скопирована" />, document.body)}
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
