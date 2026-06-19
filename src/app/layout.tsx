// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientProviders } from "@/modules/shared/components/ClientProviders";
import { inter } from "./fonts";

export const metadata: Metadata = {
  title: { default: "HT-GesCom", template: "%s | HT-GesCom" },
  description: "Gestion commerciale — Aterinay, Pomanay, Zazatiana",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('gesco-theme');
    if (t === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased ${inter.variable}`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
