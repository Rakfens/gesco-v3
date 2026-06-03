// @ts-nocheck
// ui/Modal.tsx — Modal professionnel
import React from 'react';

export const Modal = ({ open, onClose, onOpenChange, className, children }) => {
  if (!open) return null;
  const handleClose = onClose || onOpenChange;
  return (
    <div
      onClick={handleClose}
      className={className}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
        paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '18px 18px 0 0',
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 0.25s ease',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalTitle = ({ children }) => (
  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{children}</div>
);

export const ModalHeader = ({ title, onClose, subtitle, children }) => (
  <div style={{
    padding: '0 20px 14px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border)',
    marginBottom: 16,
  }}>
    <div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          width: 32, height: 32, border: 'none', background: 'var(--bg2)',
          borderRadius: 8, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', fontSize: 16,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    )}
  </div>
);

export const ModalBody = ({ children }) => (
  <div style={{
    flex: 1, overflowY: 'auto', overflowX: 'hidden',
    padding: '0 20px', WebkitOverflowScrolling: 'touch',
  }}>
    {children}
  </div>
);

export const ModalFooter = ({ children }) => (
  <div style={{
    flexShrink: 0,
    padding: '14px 20px',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    borderTop: '1px solid var(--border)',
    background: 'var(--card)',
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  }}>
    {children}
  </div>
);

export default Modal;
