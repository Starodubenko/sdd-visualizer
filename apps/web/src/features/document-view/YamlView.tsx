import type { FC, ReactNode } from 'react';
import { parse, stringify } from 'yaml';
import { resolveRelative } from '../../pages/Workspace/tree-window';
import { CollapserSummary } from './CollapserSummary';
import {
  findLatestAppliedUpdate,
  sectionHasOpenChange,
  type AppliedUpdateMeta,
  isUpdatesDocumentPath,
} from './collapser-updates';
import { linkifyText } from './doc-links';

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const LinkifiedText: FC<{
  text: string;
  documentPath: string;
  onOpenFile: (path: string) => void;
}> = (props) => {
  const { text, documentPath, onOpenFile } = props;
  return (
    <>
      {linkifyText(text).map((part, index) =>
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
      )}
    </>
  );
};

const renderScalar = (
  value: unknown,
  documentPath: string,
  onOpenFile: (path: string) => void,
): ReactNode => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return <LinkifiedText text={value} documentPath={documentPath} onOpenFile={onOpenFile} />;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const renderYamlValue = (
  value: unknown,
  documentPath: string,
  onOpenFile: (path: string) => void,
): ReactNode => {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) {
      return (
        <ul>
          {value.map((item) => (
            <li key={item}>
              <LinkifiedText text={item} documentPath={documentPath} onOpenFile={onOpenFile} />
            </li>
          ))}
        </ul>
      );
    }
    if (value.every((item) => isPlainObject(item))) {
      return (
        <>
          {value.map((item, index) => (
            <div key={String(item.id ?? index)} className="yaml-case">
              {Object.entries(item).map(([field, fieldValue]) => {
                if (typeof fieldValue !== 'string') {
                  return null;
                }
                return (
                  <p key={field}>
                    <strong>{field}:</strong>{' '}
                    <LinkifiedText
                      text={fieldValue}
                      documentPath={documentPath}
                      onOpenFile={onOpenFile}
                    />
                  </p>
                );
              })}
            </div>
          ))}
        </>
      );
    }
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>{renderScalar(item, documentPath, onOpenFile)}</li>
        ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return (
      <>
        {Object.entries(value).map(([field, fieldValue]) => (
          <p key={field}>
            <strong>{field}:</strong> {renderScalar(fieldValue, documentPath, onOpenFile)}
          </p>
        ))}
      </>
    );
  }
  return renderScalar(value, documentPath, onOpenFile);
};

export const YamlView: FC<Props> = (props) => {
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
  const sourceFileName = documentPath.split('/').pop() ?? '';
  const showCollapserActions = !isUpdatesDocumentPath(documentPath);
  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch {
    return <pre className="yaml">{content}</pre>;
  }
  if (!isPlainObject(parsed)) {
    return <pre className="yaml">{content}</pre>;
  }

  const { feature, role, ...rest } = parsed;
  const headerFields: ReactNode[] = [];
  if (typeof feature === 'string') {
    headerFields.push(
      <p key="feature">
        <strong>feature:</strong> {feature}
      </p>,
    );
  }
  if (typeof role === 'string') {
    headerFields.push(
      <p key="role">
        <strong>role:</strong> {role}
      </p>,
    );
  }

  return (
    <div className="yaml-doc">
      {headerFields.length > 0 && <div className="doc-prelude">{headerFields}</div>}
      {Object.entries(rest).map(([key, value]) => {
        const latest = showCollapserActions
          ? findLatestAppliedUpdate(appliedUpdates, sourceFileName, key)
          : null;
        const latestOpen = showCollapserActions
          ? findLatestAppliedUpdate(openUpdates, sourceFileName, key)
          : null;
        const hasOpenChange =
          showCollapserActions && sectionHasOpenChange(openUpdates, sourceFileName, key);
        const blockClassName = hasOpenChange
          ? 'doc-block doc-block-open-change'
          : 'doc-block';
        const blockBody = stringify(value).trimEnd();
        return (
          <details key={key} className={blockClassName}>
            <summary>
              <CollapserSummary
                title={key}
                updatePath={latest?.path ?? null}
                updateTimestampPrefix={latest?.timestampPrefix ?? null}
                openUpdatePath={latestOpen?.path ?? null}
                showActions={showCollapserActions}
                canCreateUpdate={canCreateUpdate}
                addDisabled={addChangeDisabled}
                onOpenUpdate={(path) => onOpenFile(path, 'Правка')}
                onAddChange={() => onAddSectionChange(key, blockBody)}
              />
            </summary>
            <div className="doc-block-body">
              {renderYamlValue(value, documentPath, onOpenFile)}
            </div>
          </details>
        );
      })}
    </div>
  );
};
