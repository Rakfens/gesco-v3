// ui/Skeleton.tsx — Composants de chargement (100% Tailwind pur)
import type { ReactNode } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 14,
  circle = false,
  className = "",
}: SkeletonProps) {
  return (
    <div
    className={`skeleton ${circle ? "rounded-full" : "rounded-md"} ${className}`}
    style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#121218] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
    <Skeleton height={10} width="40%" className="mb-3" />
    <Skeleton height={24} width="60%" className="mb-2" />
    <Skeleton height={10} width="80%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
    <div className="mb-3 flex gap-3 px-2">
    <Skeleton height={12} width={120} />
    <Skeleton height={12} width={100} />
    <Skeleton height={12} width={80} />
    <Skeleton height={12} width={100} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3 border-b border-white/[0.06] px-2 py-3">
      <Skeleton height={12} width={120} />
      <Skeleton height={12} width={100} />
      <Skeleton height={12} width={80} />
      <Skeleton height={12} width={100} />
      </div>
    ))}
    </div>
  );
}

export function SkeletonGrid({ cols = 4, rows = 1 }: { cols?: number; rows?: number }) {
  const gridColsMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div className={`grid gap-3 ${gridColsMap[cols] || "grid-cols-4"}`}>
    {Array.from({ length: cols * rows }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
    </div>
  );
}

export default Skeleton;
