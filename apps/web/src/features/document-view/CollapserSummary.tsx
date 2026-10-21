import type { FC, MouseEvent } from 'react';
import { formatAppliedUpdateLinkLabel } from './collapser-updates';

type Props = {
  title: string;
  updatePath: string | null;
  updateTimestampPrefix: string | null;
  openUpdatePath: string | null;
  showActions: boolean;
  canCreateUpdate: boolean;
  addDisabled: boolean;
  onOpenUpdate: (path: string) => void;
  onAddChange: () => void;
};

const stopSummaryToggle = (event: MouseEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

export const CollapserSummary: FC<Props> = (props) => {
  const {
    title,
    updatePath,
    updateTimestampPrefix,
    openUpdatePath,
    showActions,
    canCreateUpdate,
    addDisabled,
    onOpenUpdate,
    onAddChange,
  } = props;
  const appliedLinkLabel =
    updateTimestampPrefix !== null
      ? formatAppliedUpdateLinkLabel(updateTimestampPrefix)
      : null;
  const hasOpenUpdate = openUpdatePath !== null;
  const showSecondaryButton = hasOpenUpdate || canCreateUpdate;
  const secondaryActionLabel = hasOpenUpdate ? 'Текущие изменения' : 'Добавить изменение';
  const hasAppliedLink = updatePath !== null && appliedLinkLabel !== null;
  const showActionBar = showActions && (hasAppliedLink || showSecondaryButton);

  return (
    <span className="doc-block-summary-row">
      <span className="doc-block-title">{title}</span>
      {showActionBar && (
        <span className="doc-block-actions">
          {hasAppliedLink && (
            <button
              type="button"
              className="doc-link"
              onMouseDown={stopSummaryToggle}
              onClick={(event) => {
                stopSummaryToggle(event);
                onOpenUpdate(updatePath);
              }}
            >
              {appliedLinkLabel}
            </button>
          )}
          {showSecondaryButton && (
            <button
              type="button"
              className="doc-block-add-change"
              disabled={hasOpenUpdate ? false : addDisabled}
              onMouseDown={stopSummaryToggle}
              onClick={(event) => {
                stopSummaryToggle(event);
                if (hasOpenUpdate) {
                  onOpenUpdate(openUpdatePath);
                } else {
                  onAddChange();
                }
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </span>
      )}
    </span>
  );
};
