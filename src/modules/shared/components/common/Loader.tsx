// Loader.tsx — Professional Design (100% Tailwind pur)
import { useEffect, useState } from "react";
import { clearCurrentCompany, getSupabase } from "@/lib/supabase";

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
  timeout?: number;
}

export function Loader({
  message = "Chargement...",
  fullScreen = true,
  timeout = 10000,
}: LoaderProps) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowRetry(true), timeout);
    return () => clearTimeout(t);
  }, [timeout]);

  const handleForceLogout = async () => {
    try {
      clearCurrentCompany();
      await getSupabase().auth.signOut();
    } catch (_) {
      /* ignore */
    }
    window.location.reload();
  };

  const handleReload = () => window.location.reload();

  return (
    <div
    className={`flex items-center justify-center ${fullScreen ? "min-h-screen bg-[#08080c]" : "px-5 py-12"}`}
    >
    <div className="max-w-[280px] text-center">
    {/* Logo spinner */}
    <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-[14px] border-2 border-white/[0.06] border-t-[#c9a96e]" />
    <div className="text-sm font-medium text-[#a0a0b0]">{message}</div>
    {/* Dots */}
    <div className="mt-3.5 flex justify-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <div
      key={i}
      className={`h-[5px] w-[5px] animate-pulse rounded-full bg-white/[0.08] ${i === 0 ? "delay-0" : i === 1 ? "delay-200" : "delay-400"}`}
      />
    ))}
    </div>
    {showRetry && (
      <div className="mt-7 animate-fade-in">
      <div className="mb-3.5 text-xs leading-relaxed text-[#6b6b7b]">
      Le chargement prend plus de temps que prévu.
      </div>
      <div className="flex flex-col gap-2">
      <button
      type="button"
      onClick={handleReload}
      className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-5 py-2.5 text-[13px] font-semibold text-amber-400 transition-colors hover:bg-amber-400/10"
      >
      Réessayer
      </button>
      <button
      type="button"
      onClick={handleForceLogout}
      className="rounded-lg border border-white/[0.06] bg-transparent px-5 py-2.5 text-[13px] font-semibold text-[#6b6b7b] transition-colors hover:bg-white/[0.02]"
      >
      Se déconnecter
      </button>
      </div>
      </div>
    )}
    </div>
    </div>
  );
}

export function ButtonLoader({ size = 16 }: { size?: number }) {
  return (
    <span
    className={`mr-2 inline-block shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white align-middle`}
    style={{ width: size, height: size }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#121218] p-4.5">
    <div className="skeleton mb-3 h-3.5 w-[40%] rounded-md" />
    <div className="skeleton mb-3 h-7 w-[80%] rounded-md" />
    <div className="skeleton h-3.5 w-[60%] rounded-md" />
    </div>
  );
}

export function TableSkeleton({ rows = 4, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#121218]">
    {Array.from({ length: rows }).map((_, i) => (
      <div
      key={i}
      className={`flex gap-3 px-3.5 py-3 ${i < rows - 1 ? "border-b border-white/[0.06]" : ""}`}
      >
      {Array.from({ length: columns }).map((_, j) => (
        <div
        key={j}
        className={`skeleton h-3.5 rounded-md ${j === 0 ? "flex-[2]" : "flex-1"} ${j === 0 ? "delay-0" : j === 1 ? "delay-100" : "delay-200"}`}
        />
      ))}
      </div>
    ))}
    </div>
  );
}
