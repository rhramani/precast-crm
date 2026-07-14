import { useEffect } from 'react';
import './FormDrawer.css';

/**
 * FormDrawer — slide-in panel for Add/Edit forms.
 * Keeps the list visible behind the drawer per design doc §2.4.
 *
 * Props:
 *   open: boolean
 *   onClose: fn
 *   title: string
 *   children: form content
 *   width?: string (default '480px')
 *   footer?: JSX (submit/cancel buttons)
 */
const FormDrawer = ({ open, onClose, title, children, footer, width = '480px' }) => {
  // Lock scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${open ? 'drawer-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`drawer ${open ? 'drawer--open' : ''}`}
        style={{ width, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="drawer__header">
          <h2 className="drawer__title">{title}</h2>
          <button
            className="drawer__close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer__body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="drawer__footer">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default FormDrawer;
