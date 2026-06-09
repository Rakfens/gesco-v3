"use client";

import { useTheme } from "@/modules/shared/context/ThemeContext";
import { type ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <html lang="fr" data-theme={theme} style={{ height: "100%" }}>
      <body
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily: "var(--font)",
          fontSize: 14,
          lineHeight: 1.6,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
