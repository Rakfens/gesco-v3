// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from "@/modules/shared/components/ClientProviders";

export const metadata: Metadata = {
  title: { default: "HT-GesCom", template: "%s | HT-GesCom" },
  description: "Gestion commerciale — Aterinay, Pomanay, Zazatiana",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
    { media: "(prefers-color-scheme: light)", color: "#08080c" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
    <body className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased font-sans">
    <ClientProviders>{children}</ClientProviders>
    </body>
    </html>
  );
}
