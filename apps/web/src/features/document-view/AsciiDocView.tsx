import { createContext, useContext, useEffect, useRef, useState, type FC, type MouseEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { resolveFeaturePath, resolveRelative } from '../../pages/Workspace/tree-window';
import { uploadAsset } from '../../shared/api';
import { CollapserSummary } from './CollapserSummary';
import {
  findLatestAppliedUpdate,
  sectionHasOpenChange,
  type AppliedUpdateMeta,
  isUpdatesDocumentPath,
} from './collapser-updates';
import { splitAdocSections, splitNestedCollapsers } from './adoc-sections';
import { applyEditedRegion, type EditedRegion } from './adoc-blocks';
import {
  cachedAdocHtml,
  linkifyHtml,
  loadAdocHtml,
  rewriteAdocImages,
  rewriteAdocLinks,
  rewriteApiOps,
  splitMermaidBlocks,
} from './adoc-html';
import { highlightJsonBlocks } from './json-highlight';
import { SectionEditor } from './SectionEditor';
import { MermaidDiagram } from './MermaidDiagram';
import { AssetCanvas } from './asset-notes/AssetCanvas';
import { NoteCrop } from './asset-notes/NoteCrop';
import { imagePathFromRawSrc } from './asset-notes/notes';

type Props = {
  documentPath: string;
  content: string;
  appliedUpdates: AppliedUpdateMeta[];
  openUpdates: AppliedUpdateMeta[];
  canCreateUpdate: boolean;
  addChangeDisabled: boolean;
  onOpenFile: (path: string, highlight?: string | null, anchor?: string | null) => void;
  onAddSectionChange: (sectionTitle: string, blockBody: string) => void;
  editable: boolean;
  onSaveContent: (content: string) => Promise<void>;
};

type DocActions = {
  documentPath: string;
  canMarkNotes: boolean;
  onOpenFile: (path: string, highlight?: string | null, anchor?: string | null) => void;
};

const DocActionsContext = createContext<DocActions>({
  documentPath: '',
  canMarkNotes: false,
  onOpenFile: () => undefined,
});

const currentFileName = (documentPath: string): string => {
  const parts = documentPath.split('/');
  return parts[parts.length - 1] ?? '';
};

const copyRoute = (value: string): void => {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  void navigator.clipboard.writeText(value).catch(() => undefined);
};

const markCopied = (button: HTMLButtonElement): void => {
  const hint = button.querySelector('.api-op-hint');
  button.classList.add('api-op-copied');
  if (hint) {
    hint.textContent = 'Скопировано';
  }
  window.setTimeout(() => {
    button.classList.remove('api-op-copied');
    if (hint) {
      hint.textContent = 'Скопировать';
    }
  }, 1500);
};

const renderAssetHost = (host: HTMLElement, imagePath: string, canMarkNotes: boolean): Root => {
  const canvasRoot = createRoot(host);
  canvasRoot.render(<AssetCanvas imagePath={imagePath} editable={canMarkNotes} />);
  return canvasRoot;
};

const mountNoteCrops = (root: HTMLElement, documentPath: string): Root[] => {
  const roots: Root[] = [];
  root.querySelectorAll('.asset-note-ref').forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const raw = node.dataset.image ?? '';
    const noteNumber = Number(node.dataset.note);
    if (raw === '' || !Number.isInteger(noteNumber) || noteNumber < 1) {
      return;
    }
    const imagePath = raw.startsWith('docs/') ? raw : resolveRelative(documentPath, raw);
    const canvasRoot = createRoot(node);
    canvasRoot.render(<NoteCrop imagePath={imagePath} noteNumber={noteNumber} />);
    roots.push(canvasRoot);
  });
  return roots;
};

const mountAssetCanvases = (root: HTMLElement, canMarkNotes: boolean): Root[] => {
  const roots: Root[] = [];
  root.querySelectorAll('.asset-notes-host').forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const imagePath = node.dataset.image;
    if (!imagePath) {
      return;
    }
    roots.push(renderAssetHost(node, imagePath, canMarkNotes));
  });
  if (roots.length > 0) {
    return roots;
  }
  root.querySelectorAll('img').forEach((node) => {
    if (!(node instanceof HTMLImageElement) || node.closest('a.doc-pixo')) {
      return;
    }
    const imagePath = imagePathFromRawSrc(node.getAttribute('src') ?? '');
    if (!imagePath) {
      return;
    }
    const host = document.createElement('div');
    host.className = 'asset-notes-host';
    host.dataset.image = imagePath;
    node.replaceWith(host);
    roots.push(renderAssetHost(host, imagePath, canMarkNotes));
  });
  return roots;
};

const AdocHtml: FC<{ source: string }> = ({ source }) => {
  const { documentPath, onOpenFile, canMarkNotes } = useContext(DocActionsContext);
  const container = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(() => cachedAdocHtml(source));

  useEffect(() => {
    const hit = cachedAdocHtml(source);
    if (hit !== '') {
      setRaw(hit);
      return;
    }
    let cancelled = false;
    void loadAdocHtml(source).then((html) => {
      if (!cancelled) {
        setRaw(html);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const html = raw === ''
    ? ''
    : highlightJsonBlocks(
      linkifyHtml(rewriteApiOps(rewriteAdocLinks(rewriteAdocImages(raw, documentPath)))),
    );

  useEffect(() => {
    const root = container.current;
    if (!root || html === '') {
      return;
    }
    const canvasRoots = [
      ...mountAssetCanvases(root, canMarkNotes),
      ...mountNoteCrops(root, documentPath),
    ];
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !target.closest('a.doc-pixo')) {
        return;
      }
      const fallback = document.createElement('span');
      fallback.className = 'doc-pixo-fallback';
      fallback.textContent = 'Pixo';
      target.replaceWith(fallback);
    };
    root.addEventListener('error', onError, true);
    return () => {
      root.removeEventListener('error', onError, true);
      canvasRoots.forEach((canvasRoot) => canvasRoot.unmount());
    };
  }, [html, canMarkNotes, documentPath]);

  if (raw === '') {
    return null;
  }
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const copyButton = (event.target as HTMLElement).closest('button.api-op-copy');
    if (copyButton instanceof HTMLButtonElement) {
      const value = copyButton.dataset.copy ?? '';
      if (value !== '') {
        copyRoute(value);
        markCopied(copyButton);
      }
      return;
    }
    const button = (event.target as HTMLElement).closest('button.doc-link');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const path = button.dataset.path;
    if (!path) {
      return;
    }
    onOpenFile(
      resolveRelative(documentPath, path),
      button.dataset.highlight ?? null,
      button.dataset.anchor ?? null,
    );
  };
  return (
    <div
      className="adoc-html"
      ref={container}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const NestedCollapsers: FC<{ body: string }> = ({ body }) => {
  const nested = splitNestedCollapsers(body);
  if (nested.sections.length === 0) {
    return <AdocPreview content={body} />;
  }
  return (
    <>
      {nested.prelude.trim() !== '' && <AdocPreview content={nested.prelude} />}
      {nested.sections.map((section) => (
        <details key={section.title} className="doc-block doc-block-nested">
          <summary>
            <span className="doc-block-title">{section.title}</span>
          </summary>
          <div className="doc-block-body">
            <AdocPreview content={section.body} />
          </div>
        </details>
      ))}
    </>
  );
};

export const AdocPreview: FC<{ content: string }> = ({ content }) => {
  const parts = splitMermaidBlocks(content);
  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'mermaid' ? (
          <MermaidDiagram key={`mermaid-${index}`} source={part.source} />
        ) : (
          <AdocHtml key={`adoc-${index}`} source={part.source} />
        ),
      )}
    </>
  );
};

export const AsciiDocView: FC<Props> = (props) => {
  const {
    documentPath,
    content,
    appliedUpdates,
    openUpdates,
    canCreateUpdate,
    addChangeDisabled,
    onOpenFile,
    onAddSectionChange,
    editable,
    onSaveContent,
  } = props;
  const { prelude, sections } = splitAdocSections(content);
  const sourceFileName = currentFileName(documentPath);
  const showCollapserActions = !isUpdatesDocumentPath(documentPath);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const featurePath = resolveFeaturePath(documentPath, null);
  const canUploadImage =
    featurePath !== null &&
    (documentPath.includes('/in-progress/') ||
      documentPath.includes('/ready-to-implement/') ||
      documentPath.includes('/assets/'));

  const uploadImage = (file: File, pixoUrl: string): Promise<string> => {
    if (!featurePath) {
      return Promise.reject(new Error('Скриншот сохраняется в каталог фичи'));
    }
    return uploadAsset(featurePath, file, pixoUrl).then((saved) => saved.markdown);
  };

  const saveRegion = (region: EditedRegion, body: string): Promise<void> =>
    onSaveContent(applyEditedRegion(content, region, body)).then(() => {
      setEditingKey(null);
    });

  const beginEdit = (key: string) => {
    setEditingKey(key);
    setOpenSections((current) => ({ ...current, [key]: true }));
  };

  return (
    <DocActionsContext.Provider value={{ documentPath, onOpenFile, canMarkNotes: editable }}>
      <div className="markdown adoc doc">
        {(editable || prelude.trim() !== '') && (
          <div className="doc-prelude">
            {editable && editingKey !== 'prelude' && (
              <div className="doc-prelude-bar">
                <button type="button" className="doc-block-add-change" onClick={() => beginEdit('prelude')}>
                  Редактировать
                </button>
              </div>
            )}
            {editingKey === 'prelude' ? (
              <SectionEditor
                body={prelude}
                documentPath={documentPath}
                canUploadImage={canUploadImage}
                preview={AdocPreview}
                onCancel={() => setEditingKey(null)}
                onSave={(body) => saveRegion({ kind: 'prelude' }, body)}
                onUploadImage={uploadImage}
              />
            ) : (
              prelude.trim() !== '' && <AdocPreview content={prelude} />
            )}
          </div>
        )}
        {sections.map((section) => {
          const latest = showCollapserActions
            ? findLatestAppliedUpdate(appliedUpdates, sourceFileName, section.title)
            : null;
          const latestOpen = showCollapserActions
            ? findLatestAppliedUpdate(openUpdates, sourceFileName, section.title)
            : null;
          const hasOpenChange =
            showCollapserActions && sectionHasOpenChange(openUpdates, sourceFileName, section.title);
          const blockClassName = hasOpenChange ? 'doc-block doc-block-open-change' : 'doc-block';
          const isEditing = editingKey === section.title;
          return (
            <details
              key={section.title}
              className={blockClassName}
              open={openSections[section.title] === true}
              onToggle={(event) => {
                const node = event.currentTarget;
                if (isEditing && !node.open) {
                  node.open = true;
                }
                setOpenSections((current) => ({ ...current, [section.title]: node.open }));
              }}
            >
              <summary>
                <CollapserSummary
                  title={section.title}
                  updatePath={latest?.path ?? null}
                  updateTimestampPrefix={latest?.timestampPrefix ?? null}
                  openUpdatePath={latestOpen?.path ?? null}
                  showActions={showCollapserActions}
                  canCreateUpdate={canCreateUpdate}
                  addDisabled={addChangeDisabled}
                  onOpenUpdate={(path) => onOpenFile(path, 'Правка')}
                  onAddChange={() => onAddSectionChange(section.title, section.body)}
                  onEdit={editable && !isEditing ? () => beginEdit(section.title) : null}
                />
              </summary>
              <div className="doc-block-body">
                {isEditing ? (
                  <SectionEditor
                    body={section.body}
                    documentPath={documentPath}
                    canUploadImage={canUploadImage}
                    preview={AdocPreview}
                    onCancel={() => setEditingKey(null)}
                    onSave={(body) => saveRegion({ kind: 'section', title: section.title }, body)}
                    onUploadImage={uploadImage}
                  />
                ) : section.title === 'Валидация' ? (
                  <NestedCollapsers body={section.body} />
                ) : (
                  <AdocPreview content={section.body} />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </DocActionsContext.Provider>
  );
};
