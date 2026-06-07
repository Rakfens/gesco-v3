// ui/Modal.tsx — Modal moderne avec overlay flou
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, onOpenChange, title, children, width = 480, footer,
}) => {
  const handleClose = onClose || (onOpenChange ? () => onOpenChange(false) : undefined);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        padding: 20,
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%', maxWidth: width,
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: 'var(--shadow-xl)',
          animation: 'scaleIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <h3 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text)',
              margin: 0, letterSpacing: '-0.01em',
            }}>{title}</h3>
            <button
              onClick={handleClose}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                border: 'none', background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)';
                (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >×</button>
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;

// Sous-composants Modal pour compatibilité avec les pages existantes

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
  }}>
    <h3 style={{
      fontSize: 16, fontWeight: 700, color: 'var(--text)',
      margin: 0, letterSpacing: '-0.01em',
    }}>{title}</h3>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          border: 'none', background: 'var(--bg-tertiary)',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, lineHeight: 1,
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--danger-light)';
          (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
        }}
      >×</button>
    )}
  </div>
);

interface ModalTitleProps {
  children: React.ReactNode;
}

export const ModalTitle: React.FC<ModalTitleProps> = ({ children }) => (
  <h3 style={{
    fontSize: 16, fontWeight: 700, color: 'var(--text)',
    margin: 0, letterSpacing: '-0.01em',
  }}>{children}</h3>
);

export const ModalBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: 20 }}>{children}</div>
);

export const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    padding: '12px 20px', borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
  }}>{children}</div>
);
