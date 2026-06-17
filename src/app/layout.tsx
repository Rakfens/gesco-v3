// src/app/layout.tsx — 100% Tailwind pur
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/modules/shared/components/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HT-GesCom — Gestion commerciale",
  description: "Application de gestion commerciale Aterinay Services",
};

export const viewport: Viewport = {
  themeColor: "#08080c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} dark h-full`}>
    <body className="min-h-full flex flex-col bg-[#08080c] text-[#e8e8ec] antialiased font-[family-name:var(--font-inter),Inter,system-ui,sans-serif]">
    <ClientProviders>{children}</ClientProviders>
    </body>
    </html>
  );
}
