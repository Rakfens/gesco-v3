// src/modules/livraison/pages/ListeMatin.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import {
  Badge, Button, StatCard,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { Icon } from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import { formatAr, TODAY } from "@/modules/shared/utils/constants";
import { printMatinList } from "@/modules/shared/utils/printMatin";

const PrinterIcon = () => <Icon d="M6 9V2a2 2 0 012-2h8a2 2 0 012 2v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12" size={16} />;

export default function ListeMatin() {
  const { livraisons = [] } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [filterDate, setFilterDate] = useState(TODAY());

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  // Filtrer les livraisons du jour sélectionné
  const dayLivraisons = useMemo(() => {
    return safeLivraisons
      .filter((l) => l.date === filterDate)
      .sort((a, b) => (a.agent_nom || "").localeCompare(b.agent_nom || ""));
  }, [safeLivraisons, filterDate]);

  // Grouper par agent
  const byAgent = useMemo(() => {
    const map = new Map<string, { agent: string; livraisons: Livraison[]; totalFrais: number; count: number }>();
    dayLivraisons.forEach((l) => {
      const agentName = l.agent_nom || "Non assigné";
      const existing = map.get(agentName);
      if (existing) {
        existing.livraisons.push(l);
        existing.totalFrais += Number(l.frais) || 0;
        existing.count += 1;
      } else {
        map.set(agentName, {
          agent: agentName,
          livraisons: [l],
          totalFrais: Number(l.frais) || 0,
          count: 1,
        });
      }
    });
    return [...map.values()].sort((a, b) => a.agent.localeCompare(b.agent));
  }, [dayLivraisons]);

  // Stats
  const stats = useMemo(() => ({
    totalColis: dayLivraisons.length,
    totalAgents: byAgent.length,
    totalFrais: dayLivraisons.reduce((s, l) => s + (Number(l.frais) || 0), 0),
    totalMontant: dayLivraisons.reduce((s, l) => s + (Number(l.montant) || 0), 0),
  }), [dayLivraisons, byAgent]);

  // Impression — utilise le format ticket thermique existant
  const handlePrint = useCallback(() => {
    printMatinList(dayLivraisons, filterDate, null, currentCompany);
  }, [dayLivraisons, filterDate, currentCompany]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (isMobile) {
    return (
      <div className="pb-8">
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{
          ...sectionStyle(0),
          background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(96,165,250,0.03) 100%)",
          border: "1px solid rgba(201,169,110,0.08)",
        }}>
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style={{
                border: "2px solid rgba(201,169,110,0.2)",
                background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
                boxShadow: "0 0 20px rgba(201,169,110,0.06)",
              }}>
                <Image src="/logo.png" alt="HT-GesCom" width={28} height={28} priority className="object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Liste du matin</h1>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {currentCompany?.name} · {new Date(filterDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handlePrint} icon={<PrinterIcon />}>Imprimer</Button>
          </div>
        </div>

        {/* Date selector */}
        <div className="mb-4 flex gap-2 items-center" style={sectionStyle(0.05)}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
            className="py-2 px-3 rounded-lg text-xs font-medium outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4" style={sectionStyle(0.1)}>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-xl font-extrabold" style={{ color: "var(--info)" }}>{stats.totalColis}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Colis</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-xl font-extrabold" style={{ color: "var(--gold)" }}>{stats.totalAgents}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Agents</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-lg font-extrabold" style={{ color: "var(--success)" }}>{formatAr(stats.totalFrais)}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Frais</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="text-lg font-extrabold" style={{ color: "var(--violet)" }}>{formatAr(stats.totalMontant)}</div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Montant</div>
          </div>
        </div>

        {/* Agent cards */}
        {byAgent.length === 0 ? (
          <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison pour cette date.</div>
          </div>
        ) : byAgent.map((a, idx) => (
          <div key={a.agent} className="rounded-2xl overflow-hidden mb-3" style={{
            ...sectionStyle(0.15 + idx * 0.05),
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
          }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold), var(--violet))", color: "var(--bg-primary)" }}>
                  {a.agent.charAt(0)}
                </div>
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{a.agent}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm">{a.count} colis</Badge>
                <span className="text-xs font-bold" style={{ color: "var(--gold)" }}>{formatAr(a.totalFrais)}</span>
              </div>
            </div>
            {a.livraisons.map((l, i) => (
              <div key={l.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <span className="text-[10px] font-bold w-5 text-center" style={{ color: "var(--text-faint)" }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{l.colis || "—"}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {l.destinataire || "—"}</span>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {l.client_donneur || "—"} → {l.destinataire_lieu || "—"} {l.destinataire_telephone ? `· ${l.destinataire_telephone}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold" style={{ color: "var(--success)" }}>{formatAr(l.frais)}</div>
                  <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{l.statut || "en_cours"}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="pb-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{
        ...sectionStyle(0),
        background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(96,165,250,0.03) 100%)",
        border: "1px solid rgba(201,169,110,0.08)",
      }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{
              border: "2px solid rgba(201,169,110,0.2)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 20px rgba(201,169,110,0.06)",
            }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Liste du matin</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {currentCompany?.name} · {new Date(filterDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="py-2 px-3 rounded-lg text-xs font-medium outline-none input-focus"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
            <Button variant="primary" onClick={handlePrint} icon={<PrinterIcon />} style={{ boxShadow: "0 0 20px rgba(201,169,110,0.15)" }}>Imprimer</Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5" style={sectionStyle(0.1)}>
        <StatCard label="Total colis" value={stats.totalColis} color="info" icon={<Icon d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7L12 12l8.7-5M12 22V12" size={18} />} />
        <StatCard label="Agents" value={stats.totalAgents} color="accent" icon={<Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" size={18} />} />
        <StatCard label="Total frais" value={formatAr(stats.totalFrais)} color="success" icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} />} />
        <StatCard label="Total montant" value={formatAr(stats.totalMontant)} color="purple" icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
      </div>

      {/* Table by agent */}
      {byAgent.length === 0 ? (
        <div className="rounded-2xl py-14 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison pour cette date.</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Sélectionnez une autre date ou ajoutez des livraisons.</div>
        </div>
      ) : byAgent.map((a, idx) => (
        <div key={a.agent} className="rounded-2xl overflow-hidden mb-4" style={{
          ...sectionStyle(0.15 + idx * 0.05),
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}>
          {/* Agent header */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold), var(--violet))", color: "var(--bg-primary)" }}>
                {a.agent.charAt(0)}
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{a.agent}</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info" size="sm">{a.count} colis</Badge>
              <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>{formatAr(a.totalFrais)}</span>
            </div>
          </div>
          {/* Table */}
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader className="col-num">#</TableHeader>
                <TableHeader className="col-md">Colis</TableHeader>
                <TableHeader className="col-lg">Client</TableHeader>
                <TableHeader className="col-lg">Destinataire</TableHeader>
                <TableHeader className="col-sm">Téléphone</TableHeader>
                <TableHeader className="col-md">Lieu</TableHeader>
                <TableHeader className="col-sm" align="right">Frais</TableHeader>
                <TableHeader className="col-sm" align="right">Montant</TableHeader>
                <TableHeader className="col-sm" align="center">Statut</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {a.livraisons.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell className="col-num"><span className="text-xs font-bold" style={{ color: "var(--text-faint)" }}>{i + 1}</span></TableCell>
                  <TableCell className="col-md"><span className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>{l.colis || "—"}</span></TableCell>
                  <TableCell className="col-lg"><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{l.client_donneur || "—"}</span></TableCell>
                  <TableCell className="col-lg"><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{l.destinataire || "—"}</span></TableCell>
                  <TableCell className="col-sm"><span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.destinataire_telephone || "—"}</span></TableCell>
                  <TableCell className="col-md"><span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.destinataire_lieu || "—"}</span></TableCell>
                  <TableCell className="col-sm" align="right"><span className="font-bold text-xs" style={{ color: "var(--success)" }}>{formatAr(l.frais)}</span></TableCell>
                  <TableCell className="col-sm" align="right"><span className="text-xs" style={{ color: "var(--text-primary)" }}>{formatAr(l.montant)}</span></TableCell>
                  <TableCell className="col-sm" align="center">
                    <Badge variant={l.statut === "livre" ? "success" : l.statut === "retourne" ? "danger" : l.statut === "reporte" ? "purple" : "warning"} size="sm">
                      {l.statut || "en_cours"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
