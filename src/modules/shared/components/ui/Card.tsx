// ui/Card.tsx — Carte moderne avec ombres subtiles
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children, padding = 20, style = {}, className, hover = false, onClick,
}) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding,
      boxShadow: 'var(--shadow-sm)',
      transition: 'all var(--transition)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
    onMouseEnter={e => {
      if (hover) {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
      }
    }}
    onMouseLeave={e => {
      if (hover) {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }
    }}
  >
    {children}
  </div>
);

// Section header pour les pages
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20, flexWrap: 'wrap', gap: 12,
  }}>
    <div>
      <h2 style={{
        fontSize: 18, fontWeight: 700, color: 'var(--text)',
        letterSpacing: '-0.01em', margin: 0,
      }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
      )}
    </div>
    {action}
  </div>
);

// CardHeader — en-tête de carte
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, style = {} }) => (
  <div className={className} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, ...style,
  }}>{children}</div>
);

// CardTitle — titre de carte
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, style = {} }) => (
  <h3 className={className} style={{
    fontSize: 14, fontWeight: 700, color: 'var(--text)',
    margin: 0, letterSpacing: '-0.01em', ...style,
  }}>{children}</h3>
);

// CardContent — contenu de carte
interface CardContentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style = {} }) => (
  <div style={style}>{children}</div>
);

// CardFooter — pied de carte
interface CardFooterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style = {} }) => (
  <div style={{
    marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
    display: 'flex', justifyContent: 'flex-end', gap: 8, ...style,
  }}>{children}</div>
);

export default Card;
