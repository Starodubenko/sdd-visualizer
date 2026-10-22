import { createContext, useContext, useEffect, useRef, useState, type FC, type MouseEvent } from 'react';
import { resolveFeaturePath, resolveRelative } from '../../pages/Workspace/tree-window';
import { uploadAsset } from '../../shared/api';
import { CollapserSummary } from './CollapserSummary';
import {
  findLatestAppliedUpdate,
  sectionHasOpenChange,
  type AppliedUpdateMeta,
  isUpdatesDocumentPath,
} from './collapser-updates';
import { splitAdocSections } from './adoc-sections';
import { applyEditedRegion, type EditedRegion } from './adoc-blocks';
import {
  cachedAdocHtml,
  linkifyHtml,
  loadAdocHtml,
  rewriteAdocImages,
  splitMermaidBlocks,
} from './adoc-html';
import { SectionEditor } from './SectionEditor';
import { MermaidDiagram } from './MermaidDiagram';

type Props = {
  documentPath: string;
  content: string;
  appliedUpdates: AppliedUpdateMeta[];
  openUpdates: AppliedUpdateMeta[];
  canCreateUpdate: boolean;
  addChangeDisabled: boolean;
  onOpenFile: (path: string, highlight?: string | null) => void;
  onAddSectionChange: (sectionTitle: string, blockBody: string) => void;
  editable: boolean;
  onSaveContent: (content: string) => Promise<void>;
};

type DocActions = {
  documentPath: string;
  onOpenFile: (path: string, highlight?: string | null) => void;
};

const DocActionsContext = createContext<DocActions>({
  documentPath: '',
  onOpenFile: () => undefined,
});

const currentFileName = (documentPath: string): string => {
  const parts = documentPath.split('/');
  return parts[parts.length - 1] ?? '';
};

const AdocHtml: FC<{ source: string }> = ({ source }) => {
  const { documentPath, onOpenFile } = useContext(DocActionsContext);
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

  useEffect(() => {
    const root = container.current;
    if (!root) {
      return;
    }
    const onError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) {
        return;
      }
      if (!target.closest('a.doc-pixo')) {
        return;
      }
      const fallback = document.createElement('span');
      fallback.className = 'doc-pixo-fallback';
      fallback.textContent = 'Pixo';
      target.replaceWith(fallback);
    };
    root.addEventListener('error', onError, true);
    return () => root.removeEventListener('error', onError, true);
  }, [raw]);

  if (raw === '') {
    return null;
  }
  const html = linkifyHtml(rewriteAdocImages(raw, documentPath));
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest('button.doc-link');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const path = button.dataset.path;
    if (!path) {
      return;
    }
    onOpenFile(resolveRelative(documentPath, path));
  };
  return (
    <div
      className="adoc-html"
      ref={container}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={onClick}
    />
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
    <DocActionsContext.Provider value={{ documentPath, onOpenFile }}>
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
                    canUploadImage={canUploadImage}
                    preview={AdocPreview}
                    onCancel={() => setEditingKey(null)}
                    onSave={(body) => saveRegion({ kind: 'section', title: section.title }, body)}
                    onUploadImage={uploadImage}
                  />
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
