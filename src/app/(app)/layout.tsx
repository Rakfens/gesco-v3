'use client';

import { useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { CompanyProvider, useCompany } from '@/modules/shared/context/CompanyContext';
import { ThemeProvider, useTheme } from '@/modules/shared/context/ThemeContext';
import { AppProvider } from '@/modules/shared/context/AppContext';
import { useIsMobile } from '@/modules/shared/hooks/useIsMobile';
import { NAV_CONFIG } from '@/modules/shared/components/layout/navConfig';
import { getCompanyMeta, getLogoSrc } from '@/modules/shared/components/layout/company';
import { CompanySheet } from '@/modules/shared/components/layout/CompanySheet';
import {
  MoonIcon, SunIcon, LogoutIcon, ChevronDownIcon, MenuIcon,
  NavIcons, type NavIconKey,
} from '@/modules/shared/components/ui/Icons';

export const dynamic = 'force-dynamic';

// ─── Main Layout ────────────────────────────────────────────────
function LayoutContent({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { currentCompany, companies, switchCompany } = useCompany();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [logoError, setLogoError] = useState(false);

  const handleLogout = useCallback(async () => {
    await getSupabase().auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  const navItems = currentCompany?.type === 'service'
    ? NAV_CONFIG.service
    : (currentCompany?.type === 'commerce' ? NAV_CONFIG.commerce : []);

  const meta = getCompanyMeta(currentCompany);
  const logoSrc = getLogoSrc(currentCompany);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-secondary)', fontFamily: 'var(--font)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside style={{
        position: isMobile ? 'fixed' : 'static',
        ...(isMobile ? { inset: '0 auto 0 0', zIndex: 40 } : {}),
        display: 'flex', flexDirection: 'column',
        width: 'var(--sidebar-w)',
        background: 'var(--sidebar-bg)',
        transform: isMobile
          ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'none',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }} className={isMobile && !sidebarOpen ? 'sidebar-mobile-hide' : ''}>

        {/* Sidebar brand */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 'var(--header-h)', padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
            }}>
              G
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                GesCo
              </div>
              <div style={{ fontSize: 10, color: 'var(--sidebar-text)', marginTop: -1 }}>Gestion Commerciale</div>
            </div>
          </div>
        </div>

        {/* Company selector in sidebar */}
        {currentCompany && (
          <div style={{ padding: '12px 16px' }}>
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', transition: 'background var(--transition-fast)',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: meta.bg || 'rgba(255,255,255,0.1)',
                color: meta.color || '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentCompany.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--sidebar-text)' }}>{meta.label}</div>
              </div>
              {companies?.length > 1 && (
                <span style={{ color: 'var(--sidebar-text)', flexShrink: 0, display: 'flex' }}>
                  <ChevronDownIcon />
                </span>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {navItems.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                  marginBottom: 2,
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                  ...(active
                    ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active)' }
                    : { color: 'var(--sidebar-text)' }),
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                    (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 16, borderRadius: '0 3px 3px 0',
                    background: 'var(--accent)',
                  }} />
                )}
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
                  {NavIcons[item.icon as NavIconKey]?.()}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 20px',
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--sidebar-text)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', width: '100%',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <LogoutIcon />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 'var(--header-h)', padding: '0 24px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 50, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button type="button" onClick={() => setSidebarOpen(true)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex',
              }}>
                <MenuIcon />
              </button>
            )}
            {/* Breadcrumb-like title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>{currentCompany?.name || 'GesCo'}</span>
              <span style={{ color: 'var(--text-faint)' }}>/</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {navItems.find(i => isActive(i.href))?.label || 'Tableau de bord'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              style={{
                width: 36, height: 36,
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              }}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div style={{
              width: 1, height: 24, background: 'var(--border)', margin: '0 4px',
            }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px 6px 6px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                A
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1, overflow: 'auto',
          padding: isMobile ? undefined : 28,
          background: 'var(--bg-secondary)',
        }} className={isMobile ? 'mobile-main' : ''}>
          {children}
        </main>
      </div>

      {sheetOpen && (
        <CompanySheet companies={companies} currentCompany={currentCompany} onSelect={switchCompany} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CompanyProvider>
        <AppProvider>
          <LayoutContent>{children}</LayoutContent>
        </AppProvider>
      </CompanyProvider>
    </ThemeProvider>
  );
}
