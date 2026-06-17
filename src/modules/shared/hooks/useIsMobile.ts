// src/modules/shared/hooks/useIsMobile.ts
import { useEffect, useState, useCallback } from "react";

/**
 * SSR-safe mobile detection.
 * Returns false during SSR (no window), then updates after mount.
 * Use this instead of direct window.innerWidth checks to avoid hydration mismatch.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < breakpoint);
  }, [breakpoint]);

  useEffect(() => {
    setMounted(true);
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [checkMobile]);

  // Return false during SSR, real value after mount
  return mounted ? isMobile : false;
}
