import {
  Children,
  isValidElement,
  type FC,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveRelative } from '../../pages/Workspace/tree-window';
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
};

const currentFileName = (documentPath: string): string => {
  const parts = documentPath.split('/');
  return parts[parts.length - 1] ?? '';
};

type ImageProps = {
  src?: string;
  alt?: string;
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

const makeMarkdownComponents = (
  documentPath: string,
  onOpenFile: (path: string, highlight?: string | null) => void,
): ComponentPropsWithoutRef<typeof ReactMarkdown>['components'] => {
  const wrapText =
    (Tag: 'p' | 'li' | 'td' | 'th' | 'strong' | 'em'): FC<ComponentPropsWithoutRef<typeof Tag>> =>
    (props) => {
      const { children, ...rest } = props;
      return (
        <Tag {...rest}>{linkifyChildren(children, documentPath, onOpenFile)}</Tag>
      );
    };

  const Image: FC<ImageProps> = (image) => {
    const src = image.src ?? '';
    const resolved = resolveRelative(documentPath, src);
    const href =
      resolved.startsWith('http') || resolved.startsWith('/')
        ? resolved
        : `/api/raw?path=${encodeURIComponent(resolved)}`;
    return <img src={href} alt={image.alt ?? ''} />;
  };

  const Code: FC<ComponentPropsWithoutRef<'code'>> = (codeProps) => {
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

  const Anchor: FC<ComponentPropsWithoutRef<'a'>> = (anchor) => {
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
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {anchor.children}
      </a>
    );
  };

  return {
    p: wrapText('p'),
    li: wrapText('li'),
    td: wrapText('td'),
    th: wrapText('th'),
    strong: wrapText('strong'),
    em: wrapText('em'),
    img: Image,
    a: Anchor,
    pre: MarkdownPre,
    code: Code,
  };
};

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
  } = props;
  const { prelude, sections } = splitMarkdownSections(content);
  const components = makeMarkdownComponents(documentPath, onOpenFile);
  const sourceFileName = currentFileName(documentPath);
  const showCollapserActions = !isUpdatesDocumentPath(documentPath);

  return (
    <div className="markdown doc">
      {prelude.trim() !== '' && (
        <div className="doc-prelude">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {prelude}
          </ReactMarkdown>
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
        return (
        <details key={section.title} className={blockClassName}>
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
            />
          </summary>
          <div className="doc-block-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {section.body}
            </ReactMarkdown>
          </div>
        </details>
        );
      })}
    </div>
  );
};
