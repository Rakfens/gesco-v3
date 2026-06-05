// @ts-nocheck
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GesCo — Gestion Commerciale",
  description: "Application de gestion commerciale et de livraison",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
