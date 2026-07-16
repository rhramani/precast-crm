import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import './ConfirmDialog.css';

const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog animate-zoom" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__header">
          <div className={`confirm-dialog__icon-container confirm-dialog__icon-container--${type}`}>
            {type === 'danger' && (
              <Trash2 size={24} className="confirm-dialog__icon" />
            )}
            {type === 'warning' && (
              <AlertTriangle size={24} className="confirm-dialog__icon" />
            )}
          </div>
          <h3 className="confirm-dialog__title">{title}</h3>
        </div>
        <div className="confirm-dialog__body">
          <p className="confirm-dialog__message">{message}</p>
        </div>
        <div className="confirm-dialog__actions">
          <button onClick={onCancel} className="confirm-btn confirm-btn--cancel">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`confirm-btn confirm-btn--confirm confirm-btn--${type}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
