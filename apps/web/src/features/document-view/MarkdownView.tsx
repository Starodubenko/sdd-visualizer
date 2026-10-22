import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type FC,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveFeaturePath, resolveRelative } from '../../pages/Workspace/tree-window';
import { uploadAsset } from '../../shared/api';
import { fileHref, linkifyText } from './doc-links';
import { formatJson, tokenizeJson } from './json-highlight';
import { CollapserSummary } from './CollapserSummary';
import {
  findLatestAppliedUpdate,
  sectionHasOpenChange,
  type AppliedUpdateMeta,
  isUpdatesDocumentPath,
} from './collapser-updates';
import { splitMarkdownSections } from './markdown-sections';
import { applyEditedRegion, type EditedRegion } from './markdown-blocks';
import { SectionEditor } from './SectionEditor';
import { MermaidDiagram } from './MermaidDiagram';
import { fragmentFromHref } from './text-fragment';

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

const currentFileName = (documentPath: string): string => {
  const parts = documentPath.split('/');
  return parts[parts.length - 1] ?? '';
};

type ImageProps = {
  src?: string;
  alt?: string;
};

type DocActions = {
  documentPath: string;
  onOpenFile: (path: string, highlight?: string | null) => void;
};

const DocActionsContext = createContext<DocActions>({
  documentPath: '',
  onOpenFile: () => undefined,
});

const imageHref = (documentPath: string, src: string): string => {
  const resolved = resolveRelative(documentPath, src);
  if (resolved.startsWith('http') || resolved.startsWith('/')) {
    return resolved;
  }
  return `/api/raw?path=${encodeURIComponent(resolved)}`;
};

const PixoThumb: FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="doc-pixo-fallback">Pixo</span>;
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
};

const linkifyString = (
  text: string,
  documentPath: string,
  onOpenFile: (path: string, highlight?: string | null) => void,
): ReactNode[] =>
  linkifyText(text).map((part, index) =>
    part.kind === 'text' ? (
      part.value
    ) : (
      <button
        key={`${part.value}-${index}`}
        type="button"
        className="doc-link"
        onClick={() => onOpenFile(resolveRelative(documentPath, part.value))}
      >
        {part.value}
      </button>
    ),
  );

const linkifyChildren = (
  children: ReactNode,
  documentPath: string,
  onOpenFile: (path: string, highlight?: string | null) => void,
): ReactNode =>
  Children.map(children, (child) => {
    if (typeof child === 'string') {
      return linkifyString(child, documentPath, onOpenFile);
    }
    if (isValidElement(child)) {
      return child;
    }
    return child;
  });

const MarkdownPre: FC<ComponentPropsWithoutRef<'pre'>> = (preProps) => {
  const { children, ...rest } = preProps;
  let source: string | null = null;
  Children.forEach(children, (child) => {
    if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      return;
    }
    const className = child.props.className ?? '';
    if (!className.split(/\s+/).includes('language-mermaid')) {
      return;
    }
    source = String(child.props.children ?? '').replace(/\n$/, '');
  });
  if (source !== null) {
    return <MermaidDiagram source={source} />;
  }
  return <pre {...rest}>{children}</pre>;
};

const wrapText =
  (Tag: 'p' | 'li' | 'td' | 'th' | 'strong' | 'em'): FC<ComponentPropsWithoutRef<typeof Tag>> =>
  (props) => {
    const { documentPath, onOpenFile } = useContext(DocActionsContext);
    const { children, ...rest } = props;
    return <Tag {...rest}>{linkifyChildren(children, documentPath, onOpenFile)}</Tag>;
  };

const MarkdownImage: FC<ImageProps> = (image) => {
  const { documentPath } = useContext(DocActionsContext);
  const src = image.src ?? '';
  return <img src={imageHref(documentPath, src)} alt={image.alt ?? ''} />;
};

const soleImage = (children: ReactNode): ImageProps | null => {
  const nodes = Children.toArray(children).filter(
    (node) => !(typeof node === 'string' && node.trim() === ''),
  );
  if (nodes.length !== 1 || !isValidElement<ImageProps>(nodes[0])) {
    return null;
  }
  const node = nodes[0];
  if (node.type !== MarkdownImage && node.type !== 'img') {
    return null;
  }
  const src = node.props.src ?? '';
  if (src === '') {
    return null;
  }
  return { src, alt: node.props.alt ?? '' };
};

const MarkdownCode: FC<ComponentPropsWithoutRef<'code'>> = (codeProps) => {
  const { className, children, ...rest } = codeProps;
  const isJson = className?.includes('language-json') ?? false;
  if (!isJson) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
  const source = String(children).replace(/\n$/, '');
  const pretty = formatJson(source);
  if (pretty === null) {
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  }
  const tokens = tokenizeJson(pretty);
  return (
    <code className="json" {...rest}>
      {tokens.map((token, index) => (
        <span key={`${token.kind}-${index}`} className={`json-${token.kind}`}>
          {token.text}
        </span>
      ))}
    </code>
  );
};

const MarkdownAnchor: FC<ComponentPropsWithoutRef<'a'>> = (anchor) => {
  const { documentPath, onOpenFile } = useContext(DocActionsContext);
  const href = anchor.href ?? '';
  const fragment = fragmentFromHref(href);
  if (fragment) {
    const fileName = currentFileName(documentPath);
    const resolved = resolveRelative(documentPath, fragment.path || fileName);
    return (
      <button
        type="button"
        className="doc-link"
        onClick={() => onOpenFile(resolved, fragment.text)}
      >
        {anchor.children}
      </button>
    );
  }
  const file = fileHref(href);
  if (file) {
    return (
      <button
        type="button"
        className="doc-link"
        onClick={() => onOpenFile(resolveRelative(documentPath, file))}
      >
        {anchor.children}
      </button>
    );
  }
  const image = soleImage(anchor.children);
  if (image && /^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="doc-pixo">
        <PixoThumb
          key={image.src}
          src={imageHref(documentPath, image.src ?? '')}
          alt={image.alt || 'Pixo'}
        />
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {anchor.children}
    </a>
  );
};

const markdownComponents: ComponentPropsWithoutRef<typeof ReactMarkdown>['components'] = {
  p: wrapText('p'),
  li: wrapText('li'),
  td: wrapText('td'),
  th: wrapText('th'),
  strong: wrapText('strong'),
  em: wrapText('em'),
  img: MarkdownImage,
  a: MarkdownAnchor,
  pre: MarkdownPre,
  code: MarkdownCode,
};

export const MarkdownPreview: FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
    {content}
  </ReactMarkdown>
);

export const MarkdownView: FC<Props> = (props) => {
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
  const { prelude, sections } = splitMarkdownSections(content);
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
    <div className="markdown doc">
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
              preview={MarkdownPreview}
              onCancel={() => setEditingKey(null)}
              onSave={(body) => saveRegion({ kind: 'prelude' }, body)}
              onUploadImage={uploadImage}
            />
          ) : (
            prelude.trim() !== '' && (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {prelude}
              </ReactMarkdown>
            )
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
          showCollapserActions &&
          sectionHasOpenChange(openUpdates, sourceFileName, section.title);
        const blockClassName = hasOpenChange
          ? 'doc-block doc-block-open-change'
          : 'doc-block';
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
                preview={MarkdownPreview}
                onCancel={() => setEditingKey(null)}
                onSave={(body) => saveRegion({ kind: 'section', title: section.title }, body)}
                onUploadImage={uploadImage}
              />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.body}
              </ReactMarkdown>
            )}
          </div>
        </details>
        );
      })}
    </div>
    </DocActionsContext.Provider>
  );
};
