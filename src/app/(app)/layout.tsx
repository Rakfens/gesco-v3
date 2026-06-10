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

export const dynamic = "force-dynamic";

/* ─── Sidebar Navigation Icons (inline SVG, noir & or) ─── */
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
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-2M21 12v7a2 2 0 01-2 2h-2",
    document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
  };
  return <SvgIcon d={icons[icon] || icons.grid} />;
};

/* ─── Main Layout Content ─── */
function LayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const navItems =
    currentCompany?.type === "service"
      ? NAV_CONFIG.service
      : currentCompany?.type === "commerce"
        ? NAV_CONFIG.commerce
        : [];

  const meta = getCompanyMeta(currentCompany);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "var(--font)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside
        className={!sidebarOpen ? "sidebar-mobile-hide" : ""}
        style={{
          position: "fixed", inset: "0 auto 0 0", zIndex: 40,
          display: "flex", flexDirection: "column",
          width: "var(--sidebar-w)", background: "var(--sidebar-bg)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform var(--transition)", flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          height: "var(--header-h)", padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #c9a96e, #a68b4b)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, color: "#08080c",
            boxShadow: "0 0 20px rgba(201,169,110,0.2)",
          }}>
            G
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              GesCo
            </div>
            <div style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Aterinay Services
            </div>
          </div>
        </div>

        {/* Company selector */}
        {currentCompany && (
          <div style={{ padding: "14px 18px" }}>
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", transition: "all var(--transition-fast)",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentCompany.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--sidebar-text)" }}>{meta.label}</div>
              </div>
              {companies?.length > 1 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sidebar-text)" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 16px", borderRadius: "var(--radius-md)",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  textDecoration: "none", marginBottom: 2,
                  transition: "all var(--transition-fast)",
                  position: "relative",
                  color: active ? "#08080c" : "var(--sidebar-text)",
                  background: active ? "var(--accent)" : "transparent",
                  boxShadow: active ? "0 0 20px rgba(201,169,110,0.15)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                  }
                }}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 20px" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: "var(--radius-md)",
              background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.1)",
              color: "#f87171", fontSize: 12, fontWeight: 500,
              cursor: "pointer", width: "100%", transition: "all var(--transition-fast)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ══ MAIN AREA ══ */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "var(--header-h)", padding: "0 28px",
          background: "var(--header-bg)", backdropFilter: `blur(var(--header-blur))`,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          position: "sticky", top: 0, zIndex: 50, gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-btn"
              style={{
                background: "none", border: "none", color: "var(--text-secondary)",
                cursor: "pointer", padding: 4, display: "flex",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Breadcrumb-like */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {currentCompany?.name || "GesCo"}
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: 16 }}>/</span>
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
                {navItems.find((i) => isActive(i.href))?.label || "Tableau de bord"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* User avatar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "5px 14px 5px 6px", borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)", background: "var(--card)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#08080c",
              }}>
                A
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="app-main"
          style={{
            flex: 1, overflow: "auto", padding: 28,
            background: "var(--bg-secondary)",
          }}
        >
          {children}
        </main>
      </div>

      {sheetOpen && (
        <CompanySheet
          companies={companies}
          currentCompany={currentCompany}
          onSelect={switchCompany}
          onClose={() => setSheetOpen(false)}
        />
      )}
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
