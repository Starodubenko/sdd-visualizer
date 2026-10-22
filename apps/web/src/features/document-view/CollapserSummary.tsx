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
  onEdit: (() => void) | null;
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
    onEdit,
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
      {(onEdit !== null || showActionBar) && (
        <span className="doc-block-actions">
          {onEdit !== null && (
            <button
              type="button"
              className="doc-block-add-change"
              onMouseDown={stopSummaryToggle}
              onClick={(event) => {
                stopSummaryToggle(event);
                onEdit();
              }}
            >
              Редактировать
            </button>
          )}
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
