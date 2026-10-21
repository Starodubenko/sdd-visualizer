import type { FC } from 'react';
import { Modal } from './Modal';

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const ConfirmModal: FC<Props> = (props) => {
  const { title, message, confirmLabel, open, onClose, onConfirm } = props;
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <p>{message}</p>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          Отмена
        </button>
        <button type="button" className="primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
