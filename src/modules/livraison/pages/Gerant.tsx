// src/modules/livraison/pages/Gerant.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import {
  Badge, Button, Card, CardHeader, CardTitle, Input, Select, StatCard, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import {
  CURRENT_MONTH, EXCLUDED_CLIENTS, formatAr, monthLabel, shouldCountGerantCommission, TODAY,
} from "@/modules/shared/utils/constants";
import { Icon } from "@/modules/shared/components/ui/Icons";

type TabKey = "jour" | "mois";

/* ─── Icon path constants ─── */
const CASH_D = "M2 7h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM2 10h20";
const TREND_UP_D = "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6";
const BOX_D = "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7L12 12l8.7-5M12 22V12";
const EDIT_D = "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z";

export default function Gerant() {
  const { livraisons, commissionGerant, commissionLoading, updateCommission, showToast } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [editCommission, setEditCommission] = useState(false);
  const [tmpCommission, setTmpCommission] = useState<number>(commissionGerant);
  const [gerantTab, setGerantTab] = useState<TabKey>("jour");
  const [gerantDate, setGerantDate] = useState<string>(TODAY());
  const [gerantMonth, setGerantMonth] = useState<string>(CURRENT_MONTH);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
  useEffect(() => { if (!editCommission) setTmpCommission(commissionGerant); }, [commissionGerant, editCommission]);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];
  const livsGerant = useCallback((arr: Livraison[]) => arr.filter((l) => shouldCountGerantCommission(l)), []);

  // Jour
  const dayLivs = useMemo(() => livsGerant(safeLivraisons.filter((l) => l.date === gerantDate)), [safeLivraisons, gerantDate, livsGerant]);
  const dayCount = dayLivs.length;
  const dayGain = dayCount * commissionGerant;
  const dayFraisTotal = dayLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
  const dayNet = dayFraisTotal - dayGain;
  const dayExcluded = safeLivraisons.filter((l) => l.date === gerantDate && EXCLUDED_CLIENTS.includes((l.client_donneur || "").toUpperCase()) && (Number(l.frais) || 0) > 0);

  // Mois
  const monthLivs = useMemo(() => livsGerant(safeLivraisons.filter((l) => l.date?.startsWith(gerantMonth))), [safeLivraisons, gerantMonth, livsGerant]);
  const monthCount = monthLivs.length;
  const monthGain = monthCount * commissionGerant;
  const monthFrais = monthLivs.reduce((s, l) => s + (Number(l.frais) || 0), 0);
  const monthNet = monthFrais - monthGain;

  const monthByDay = useMemo(() => {
    const map: Record<string, { date: string; count: number; gain: number; frais: number }> = {};
    monthLivs.forEach((l) => {
      if (!map[l.date]) map[l.date] = { date: l.date, count: 0, gain: 0, frais: 0 };
      map[l.date].count++;
      map[l.date].gain += commissionGerant;
      map[l.date].frais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthLivs, commissionGerant]);

  const handleUpdateCommission = async () => {
    try { if (updateCommission) await updateCommission(tmpCommission); showToast("Commission mise à jour"); }
    catch (e: unknown) { logger.error("Erreur commission:", e); showToast("Erreur", "error"); }
    setEditCommission(false);
  };

  const months = useMemo(() => {
    const s = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
    s.add(CURRENT_MONTH);
    return [...s].sort().reverse() as string[];
  }, [safeLivraisons]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl p-5"
        style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(139,92,246,0.03) 100%)",
          border: "1px solid rgba(201,169,110,0.1)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.06)" }} />
        <div className="relative z-10 flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0"
            style={{
              border: "2px solid rgba(201,169,110,0.25)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 20px rgba(201,169,110,0.08)",
            }}
          >
            <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Gérant
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {currentCompany?.name} · Commission {formatAr(commissionGerant)}/livraison
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMMISSION CARD
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-6 rounded-2xl p-5" style={{ ...sectionStyle(0.1), border: "1px solid rgba(201,169,110,0.12)", background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, rgba(139,92,246,0.02) 100%)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}
            >
              <Icon d={CASH_D} size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                Commission par livraison
              </div>
              {editCommission ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" value={String(tmpCommission)} onChange={(e) => setTmpCommission(parseFloat(e.target.value) || 0)} className="w-[130px]" />
                  <Button variant="success" size="sm" onClick={handleUpdateCommission} loading={commissionLoading}>Sauver</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditCommission(false)}>Annuler</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-black" style={{ color: "var(--gold)" }}>{formatAr(commissionGerant)}</span>
                  <button
                    onClick={() => { setTmpCommission(commissionGerant); setEditCommission(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold btn-press transition-colors"
                    style={{ border: "1px solid rgba(201,169,110,0.2)", color: "var(--gold)", background: "rgba(201,169,110,0.06)" }}
                  >
                    <Icon d={EDIT_D} size={14} /> Modifier
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Commission sur toutes les livraisons dès que les frais sont payés</div>
            {EXCLUDED_CLIENTS.length > 0 && (
              <div className="mt-1 text-[10px] px-2 py-1 rounded-full inline-block" style={{ background: "rgba(251,191,36,0.08)", color: "var(--warning)" }}>
                ⚠️ Exclus : {EXCLUDED_CLIENTS.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABS
          ═══════════════════════════════════════════════════════ */}
      <div className="flex gap-2 mb-5" style={sectionStyle(0.15)}>
        {(["jour", "mois"] as const).map((tab) => {
          const isActive = gerantTab === tab;
          const d = tab === "jour" ? CASH_D : TREND_UP_D;
          return (
            <button
              key={tab}
              onClick={() => setGerantTab(tab)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold btn-press transition-all"
              style={{
                border: isActive ? "1.5px solid var(--gold)" : "1.5px solid var(--border-default)",
                background: isActive ? "rgba(201,169,110,0.08)" : "transparent",
                color: isActive ? "var(--gold)" : "var(--text-muted)",
                boxShadow: isActive ? "0 0 12px rgba(201,169,110,0.1)" : "none",
              }}
            >
              <Icon d={d} size={16} />
              {tab === "jour" ? "Par jour" : "Par mois"}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB JOUR
          ═══════════════════════════════════════════════════════ */}
      {gerantTab === "jour" && (
        <div style={sectionStyle(0.2)}>
          {/* Date picker */}
          <div className="mb-4">
            <Input label="Sélectionner une date" type="date" value={gerantDate} onChange={(e) => setGerantDate(e.target.value)} className={isMobile ? "" : "max-w-[220px]"} />
          </div>

          {/* Excluded warning */}
          {dayExcluded.length > 0 && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}>
              <span style={{ color: "var(--warning)" }}>⚠️</span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--warning)" }}>
                {dayExcluded.length} livraison(s) exclue(s) — clients {EXCLUDED_CLIENTS.join(", ")}
              </span>
            </div>
          )}

          {/* Stats jour */}
          <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
            <StatCard label="Gain du jour" value={formatAr(dayGain)} color="accent" icon={<Icon d={CASH_D} size={16} />} sub={`${dayCount} livraison${dayCount !== 1 ? 's' : ''}`} />
            <StatCard label="Livraisons" value={dayCount} color="warning" icon={<Icon d={BOX_D} size={16} />} />
            <StatCard label="Frais collectés" value={formatAr(dayFraisTotal)} color="purple" icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} />} />
            <StatCard label="Frais nets" value={formatAr(dayNet)} color={dayNet >= 0 ? "success" : "danger"} icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} />} />
          </div>

          {/* Net highlight card */}
          <div className="mb-5 rounded-xl p-4 flex items-center justify-between" style={{ border: `1px solid ${dayNet >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`, background: dayNet >= 0 ? "rgba(52,211,153,0.03)" : "rgba(248,113,113,0.03)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${dayNet >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)"}`, color: dayNet >= 0 ? "var(--success)" : "var(--danger)" }}>
                <Icon d={TREND_UP_D} size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Résultat net</div>
                <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>Frais collectés — Gain gérant</div>
              </div>
            </div>
            <div className="text-2xl font-black" style={{ color: dayNet >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatAr(dayNet)}
            </div>
          </div>

          {/* Table jour */}
          {dayLivs.length > 0 ? (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
                      <Icon d={BOX_D} size={16} />
                    </div>
                    <CardTitle className="text-sm">Détail des livraisons</CardTitle>
                  </div>
                  <Badge variant="default" size="sm">{dayCount} livraison{dayCount !== 1 ? "s" : ""}</Badge>
                </div>
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>#</TableHeader>
                    <TableHeader>Colis</TableHeader>
                    <TableHeader>Client</TableHeader>
                    <TableHeader>Destinataire</TableHeader>
                    <TableHeader>Agent</TableHeader>
                    <TableHeader align="right">Frais</TableHeader>
                    <TableHeader align="right">Commission</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayLivs.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell><span style={{ color: "var(--text-faint)" }}>{i + 1}</span></TableCell>
                      <TableCell className="font-semibold">{l.colis}</TableCell>
                      <TableCell><span style={{ color: "var(--text-secondary)" }}>{l.client_donneur}</span></TableCell>
                      <TableCell><span style={{ color: "var(--text-secondary)" }}>{l.destinataire}</span></TableCell>
                      <TableCell>
                        {l.agent_nom && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
                            🚚 {l.agent_nom}
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right" className="font-semibold"><span style={{ color: "var(--violet)" }}>{formatAr(Number(l.frais) || 0)}</span></TableCell>
                      <TableCell align="right" className="font-semibold"><span style={{ color: "var(--gold)" }}>{formatAr(commissionGerant)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableCell colSpan={5} className="font-bold">TOTAL</TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: "var(--violet)" }}>{formatAr(dayFraisTotal)}</span></TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: "var(--gold)" }}>{formatAr(dayGain)}</span></TableCell>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl py-12 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">💰</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison avec commission ce jour.</div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB MOIS
          ═══════════════════════════════════════════════════════ */}
      {gerantTab === "mois" && (
        <div style={sectionStyle(0.2)}>
          {/* Month picker */}
          <div className="mb-4">
            <Select label="Sélectionner un mois" value={gerantMonth} onChange={(e) => setGerantMonth(e.target.value)} className={isMobile ? "" : "max-w-[220px]"} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          </div>

          {/* Stats mois */}
          <div className="grid gap-3 mb-5 grid-cols-2">
            <StatCard label={`Gain total — ${monthLabel(gerantMonth)}`} value={formatAr(monthGain)} color="accent" icon={<Icon d={CASH_D} size={16} />} sub={`${monthCount} livraison${monthCount !== 1 ? 's' : ''}`} />
            <StatCard label="Frais collectés" value={formatAr(monthFrais)} color="purple" icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} />} />
          </div>

          {/* Net highlight card */}
          <div className="mb-5 rounded-xl p-4 flex items-center justify-between" style={{ border: `1px solid ${monthNet >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"}`, background: monthNet >= 0 ? "rgba(52,211,153,0.03)" : "rgba(248,113,113,0.03)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${monthNet >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)"}`, color: monthNet >= 0 ? "var(--success)" : "var(--danger)" }}>
                <Icon d={TREND_UP_D} size={16} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Résultat net du mois</div>
                <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>Frais collectés — Gain gérant</div>
              </div>
            </div>
            <div className="text-2xl font-black" style={{ color: monthNet >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatAr(monthNet)}
            </div>
          </div>

          {/* Table mois */}
          {monthByDay.length > 0 ? (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)" }}>
                      <Icon d={TREND_UP_D} size={16} />
                    </div>
                    <CardTitle className="text-sm">Récapitulatif par jour</CardTitle>
                  </div>
                  <Badge variant="default" size="sm">{monthLabel(gerantMonth)}</Badge>
                </div>
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader align="center">Livraisons</TableHeader>
                    <TableHeader align="right">Frais collectés</TableHeader>
                    <TableHeader align="right">Gain gérant</TableHeader>
                    <TableHeader align="right">Frais nets</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthByDay.map((d) => {
                    const net = d.frais - d.gain;
                    return (
                      <TableRow key={d.date}>
                        <TableCell className="font-semibold">{d.date}</TableCell>
                        <TableCell align="center">
                          <Badge variant="default" size="sm">{d.count}</Badge>
                        </TableCell>
                        <TableCell align="right" className="font-semibold"><span style={{ color: "var(--violet)" }}>{formatAr(d.frais)}</span></TableCell>
                        <TableCell align="right" className="font-semibold"><span style={{ color: "var(--gold)" }}>{formatAr(d.gain)}</span></TableCell>
                        <TableCell align="right" className="font-semibold"><span style={{ color: net >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(net)}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell align="center" className="font-bold">{monthCount}</TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: "var(--violet)" }}>{formatAr(monthFrais)}</span></TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: "var(--gold)" }}>{formatAr(monthGain)}</span></TableCell>
                  <TableCell align="right" className="font-bold"><span style={{ color: monthNet >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(monthNet)}</span></TableCell>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl py-12 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
              <div className="text-4xl mb-3">💰</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison avec commission ce mois-ci.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
