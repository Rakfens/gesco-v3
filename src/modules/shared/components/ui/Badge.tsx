// ui/Badge.tsx — Badge moderne
import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)', dot: 'var(--text-muted)' },
  primary: { bg: 'var(--accent-light)', text: 'var(--accent)', dot: 'var(--accent)' },
  success: { bg: 'var(--success-light)', text: 'var(--success)', dot: 'var(--success)' },
  danger:  { bg: 'var(--danger-light)', text: 'var(--danger)', dot: 'var(--danger)' },
  warning: { bg: 'var(--warning-light)', text: 'var(--warning)', dot: 'var(--warning)' },
  info:    { bg: 'var(--info-light)', text: 'var(--info)', dot: 'var(--info)' },
  purple:  { bg: 'var(--purple-light)', text: 'var(--purple)', dot: 'var(--purple)' },
};

export const Badge: React.FC<BadgeProps> = ({
  children, variant = 'default', size = 'sm', dot = false, style = {},
}) => {
  const v = variantStyles[variant];
  const padding = size === 'sm' ? '3px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding, borderRadius: 'var(--radius-full)',
      background: v.bg, color: v.text,
      fontSize, fontWeight: 600,
      lineHeight: 1,
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: v.dot, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
};

export type { BadgeVariant };

export default Badge;
