// ui/Skeleton.tsx — Composants de chargement
import React from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%', height = 14, circle = false, style = {},
}) => (
  <div
    className="skeleton"
    style={{
      width, height,
      borderRadius: circle ? '50%' : 'var(--radius-sm)',
      ...style,
    }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)',
  }}>
    <Skeleton height={10} width="40%" style={{ marginBottom: 12 }} />
    <Skeleton height={24} width="60%" style={{ marginBottom: 8 }} />
    <Skeleton height={10} width="80%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div>
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '0 8px' }}>
      <Skeleton height={12} width={120} />
      <Skeleton height={12} width={100} />
      <Skeleton height={12} width={80} />
      <Skeleton height={12} width={100} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{
        display: 'flex', gap: 12, padding: '12px 8px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Skeleton height={12} width={120} />
        <Skeleton height={12} width={100} />
        <Skeleton height={12} width={80} />
        <Skeleton height={12} width={100} />
      </div>
    ))}
  </div>
);

export const SkeletonGrid: React.FC<{ cols?: number; rows?: number }> = ({ cols = 4, rows = 1 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
    {Array.from({ length: cols * rows }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeleton;
