// ui/Button.tsx — Bouton moderne et élégant
import React from 'react';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  className?: string;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(59,130,246,0.15), 0 1px 3px rgba(59,130,246,0.1)',
  },
  success: {
    background: 'var(--success)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(16,185,129,0.15)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(239,68,68,0.15)',
  },
  warning: {
    background: 'var(--warning)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 2px rgba(245,158,11,0.15)',
  },
  secondary: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--border-strong)',
  },
};

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: number; borderRadius: number; height?: number }> = {
  sm: { padding: '6px 12px', fontSize: 12, borderRadius: 6, height: 30 },
  md: { padding: '8px 16px', fontSize: 13, borderRadius: 8, height: 36 },
  lg: { padding: '10px 20px', fontSize: 14, borderRadius: 10, height: 42 },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconRight = null,
  fullWidth = false,
  onClick,
  type = 'button',
  style = {},
  className,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...v,
        ...s,
        fontWeight: 600,
        fontFamily: 'var(--font)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        transition: 'all var(--transition-fast)',
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)';
          if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
          if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--border)';
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLElement).style.background = v.background as string;
        }
      }}
    >
      {loading ? (
        <span style={{
          width: 14, height: 14,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          display: 'inline-block',
        }} />
      ) : icon}
      {children}
      {iconRight}
    </button>
  );
};

export default Button;
