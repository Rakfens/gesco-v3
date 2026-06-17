// src/modules/shared/components/ClientProviders.tsx
"use client";

import { ThemeProvider } from "@/modules/shared/context/ThemeContext";
import { type ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
