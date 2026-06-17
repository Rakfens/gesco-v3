"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { CompanySheet } from "@/modules/shared/components/layout/CompanySheet";
import { getCompanyMeta } from "@/modules/shared/components/layout/company";
import { NAV_CONFIG } from "@/modules/shared/components/layout/navConfig";
import { AppProvider } from "@/modules/shared/context/AppContext";
import { CompanyProvider, useCompany } from "@/modules/shared/context/CompanyContext";

const SvgIcon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d={d} />
  </svg>
);

const NavIcon = ({ icon }: { icon: string }) => {
  const icons: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    truck: "M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M9 17a2 2 0 004 0m0 0h6a2 2 0 002-2v-4M5 17a2 2 0 000 4m14 0a2 2 0 000-4",
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    chart: "M18 20V10M12 20V4M6 20v-6",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
    refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9",
    cash: "M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19",
    cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z",
    box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7L12 12l8.7-5M12 22V12",
    package: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-2M21 12v7a2 2 0 01-2 2h-2",
    document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  };
  return <SvgIcon d={icons[icon] || icons.grid} />;
};

function LayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try { await getSupabase().auth.signOut(); } catch (e) { console.error("Logout error:", e); }
    router.push("/login");
    router.refresh();
  }, [router]);

  const navItems = currentCompany?.type === "service" ? NAV_CONFIG.service : currentCompany?.type === "commerce" ? NAV_CONFIG.commerce : [];
  const meta = getCompanyMeta(currentCompany);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-screen font-sans bg-[#08080c]">
    {/* Mobile overlay */}
    <div className={`fixed inset-0 z-30 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)} />

    {/* ══ SIDEBAR ══ */}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] border-r border-white/[0.04] bg-[#0f0f13]/80 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
    {/* Brand */}
    <div className="flex items-center gap-3 h-16 px-6 border-b border-white/[0.04]">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg font-black text-gray-950 shadow-[0_0_20px_rgba(201,169,110,0.3)]">
    G
    </div>
    <div>
    <div className="text-sm font-bold text-white tracking-tight">GesCo</div>
    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Aterinay Services</div>
    </div>
    </div>

    {/* Company selector */}
    {currentCompany && (
      <div className="py-3.5 px-[18px]">
      <button type="button" onClick={() => setSheetOpen(true)} className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer transition-all duration-150 hover:bg-white/[0.04] hover:border-white/[0.1]">
      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-violet-500 flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-lg">
      {meta.icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
      <div className="text-[13px] font-semibold text-white truncate">{currentCompany.name}</div>
      <div className="text-[10px] text-zinc-500">{meta.label}</div>
      </div>
      {companies && companies.length > 1 && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500">
        <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      </button>
      </div>
    )}

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
    {navItems.map((item) => {
      const active = isActive(item.href);
      return (
        <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${active ? "bg-amber-400/10 text-amber-400 font-semibold shadow-[0_0_20px_rgba(201,169,110,0.1)]" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"}`}>
        <span className={active ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300 transition-colors"}>
        <NavIcon icon={item.icon} />
        </span>
        {item.label}
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(201,169,110,0.5)]" />}
        </Link>
      );
    })}
    </nav>

    {/* Sidebar footer */}
    <div className="border-t border-white/[0.04] py-4 px-5">
    <button type="button" onClick={handleLogout} className="flex items-center gap-2 py-2 px-3.5 rounded-lg bg-red-400/[0.06] border border-red-400/[0.1] text-red-400 text-xs font-medium cursor-pointer w-full transition-all duration-150 hover:bg-red-400/[0.1] btn-press">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
    Déconnexion
    </button>
    </div>
    </aside>

    {/* ══ MAIN AREA ══ */}
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
    {/* Header */}
    <header className="flex items-center justify-between h-16 px-7 bg-[#0f0f13]/60 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50 gap-3">
    <div className="flex items-center gap-3.5">
    <button type="button" onClick={() => setSidebarOpen(true)} className="bg-transparent border-none text-zinc-400 cursor-pointer p-1 flex lg:hidden hover:text-white transition-colors">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
    </button>
    <div className="flex items-center gap-2 text-[13px] text-zinc-500">
    <span className="text-amber-400 font-semibold">{currentCompany?.name || "GesCo"}</span>
    <span className="text-zinc-600 text-base">/</span>
    <span className="text-white font-semibold text-[13px]">{navItems.find((i) => isActive(i.href))?.label || "Tableau de bord"}</span>
    </div>
    </div>
    <div className="flex gap-2 items-center">
    <div className="flex items-center gap-2.5 py-[5px] pl-1.5 pr-3.5 rounded-full border border-zinc-800 bg-[#1a1a1f]">
    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-amber-400 to-violet-500 flex items-center justify-center text-xs font-extrabold text-gray-950">
    A
    </div>
    <span className="text-[13px] font-semibold text-white">Admin</span>
    </div>
    </div>
    </header>

    {/* Content */}
    <main className="flex-1 overflow-auto p-7 bg-[#08080c]">
    <div className="animate-fade-up">
    {children}
    </div>
    </main>
    </div>

    {sheetOpen && <CompanySheet companies={companies} currentCompany={currentCompany} onSelect={switchCompany} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
    <AppProvider>
    <LayoutContent>{children}</LayoutContent>
    </AppProvider>
    </CompanyProvider>
  );
}
