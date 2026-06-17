// src/modules/livraison/pages/Gerant.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import {
  CURRENT_MONTH,
  EXCLUDED_CLIENTS,
  formatAr,
    monthLabel,
    shouldCountGerantCommission,
    TODAY,
} from "@/modules/shared/utils/constants";
import { Icon } from "@/modules/shared/components/ui/Icons";

type TabKey = "jour" | "mois";

export default function Gerant() {
  const { livraisons, commissionGerant, commissionLoading, updateCommission, showToast } = useApp();
  const isMobile = useIsMobile();

  const [editCommission, setEditCommission] = useState(false);
  const [tmpCommission, setTmpCommission] = useState<number>(commissionGerant);
  const [gerantTab, setGerantTab] = useState<TabKey>("jour");
  const [gerantDate, setGerantDate] = useState<string>(TODAY());
  const [gerantMonth, setGerantMonth] = useState<string>(CURRENT_MONTH);

  useEffect(() => {
    if (!editCommission) setTmpCommission(commissionGerant);
  }, [commissionGerant, editCommission]);

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
      try {
        if (updateCommission) await updateCommission(tmpCommission);
        showToast("Commission mise à jour");
      } catch (e: unknown) {
        logger.error("Erreur commission:", e);
        showToast("Erreur", "error");
      }
      setEditCommission(false);
    };

    const months = useMemo(() => {
      const s = new Set(safeLivraisons.map((l) => l.date?.slice(0, 7)).filter(Boolean));
      s.add(CURRENT_MONTH);
      return [...s].sort().reverse() as string[];
    }, [safeLivraisons]);

    const tabs = useMemo(() => ["jour", "mois"] as const, []);

    return (
      <div className="pb-6 animate-fade-up">
      {/* ══ HEADER ══ */}
      <header className="mb-5">
      <div className="flex items-center gap-2.5 mb-1">
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-pink-400/10">
      <Icon
      d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19"
      size={18}
      className="text-pink-400"
      />
      </div>
      <div>
      <h1 className={`font-extrabold m-0 text-[var(--text)] ${isMobile ? "text-xl" : "text-2xl"}`}>
      Gérant
      </h1>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">
      Commission : {formatAr(commissionGerant)} par livraison
      </p>
      </div>
      </div>
      </header>

      {/* ══ COMMISSION CARD ══ */}
      <Card className="mb-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-pink-400">
      Commission par livraison
      </div>
      {editCommission ? (
        <div className="flex items-center gap-2">
        <Input
        type="number"
        value={String(tmpCommission)}
        onChange={(e) => setTmpCommission(parseFloat(e.target.value) || 0)}
        className="w-[120px]"
        />
        <Button variant="success" size="sm" onClick={handleUpdateCommission} loading={commissionLoading}>
        Sauver
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditCommission(false)}>
        Annuler
        </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
        <span className="text-2xl font-black text-pink-400">
        {formatAr(commissionGerant)}
        </span>
        <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setTmpCommission(commissionGerant);
          setEditCommission(true);
        }}
        >
        Modifier
        </Button>
        </div>
      )}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] text-right">
      <div>Commission sur toutes les livraisons</div>
      <div>Dès que les frais sont payés</div>
      {EXCLUDED_CLIENTS.length > 0 && (
        <div className="mt-0.5 text-amber-400">
        Exclus : {EXCLUDED_CLIENTS.join(", ")}
        </div>
      )}
      </div>
      </div>
      </Card>

      {/* ══ TABS ══ */}
      <div className="flex gap-1.5 mb-4">
      {tabs.map((tab) => (
        <button
        key={tab}
        onClick={() => setGerantTab(tab)}
        className={`px-5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all font-[var(--font)] ${gerantTab === tab ? "border-[1.5px] border-pink-400 bg-pink-400/10 text-pink-400" : "border-[1.5px] border-[var(--border)] bg-transparent text-[var(--text-muted)]"}`}
        >
        {tab === "jour" ? "Par jour" : "Par mois"}
        </button>
      ))}
      </div>

      {/* ══ TAB JOUR ══ */}
      {gerantTab === "jour" && (
        <div>
        <div className="mb-4">
        <Input
        label="Sélectionner une date"
        type="date"
        value={gerantDate}
        onChange={(e) => setGerantDate(e.target.value)}
        className={isMobile ? "" : "max-w-[220px]"}
        />
        </div>

        {dayExcluded.length > 0 && (
          <Card className="mb-3.5 bg-amber-400/10 border border-amber-400/20">
          <div className="text-[11px] font-semibold text-amber-400">
          ⚠️ {dayExcluded.length} livraison(s) exclue(s) — clients {EXCLUDED_CLIENTS.join(", ")}
          </div>
          </Card>
        )}

        {/* Stats jour */}
        <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <StatCard
        label="Gain du jour"
        value={formatAr(dayGain)}
        className="text-pink-400"
        icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} className="text-pink-400" />}
        />
        <StatCard
        label="Livraisons"
        value={dayCount}
        className="text-amber-400"
        icon={<Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" size={18} className="text-amber-400" />}
        />
        <StatCard
        label="Frais collectés"
        value={formatAr(dayFraisTotal)}
        className="text-violet-400"
        icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} className="text-violet-400" />}
        />
        <StatCard
        label="Frais nets"
        value={formatAr(dayNet)}
        className={dayNet >= 0 ? "text-emerald-400" : "text-red-400"}
        icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={18} className={dayNet >= 0 ? "text-emerald-400" : "text-red-400"} />}
        />
        </div>

        {dayLivs.length > 0 ? (
          <Table>
          <TableHead>
          <TableRow>
          <TableHeader>#</TableHeader>
          <TableHeader>Colis</TableHeader>
          <TableHeader>Client donneur</TableHeader>
          <TableHeader>Destinataire</TableHeader>
          <TableHeader>Agent</TableHeader>
          <TableHeader align="right">Frais</TableHeader>
          <TableHeader align="right">Commission</TableHeader>
          </TableRow>
          </TableHead>
          <TableBody>
          {dayLivs.map((l, i) => (
            <TableRow key={l.id}>
            <TableCell>{i + 1}</TableCell>
            <TableCell className="font-semibold">{l.colis}</TableCell>
            <TableCell>{l.client_donneur}</TableCell>
            <TableCell>{l.destinataire}</TableCell>
            <TableCell>{l.agent_nom}</TableCell>
            <TableCell align="right" className="font-semibold text-violet-400">
            {formatAr(Number(l.frais) || 0)}
            </TableCell>
            <TableCell align="right" className="font-semibold text-pink-400">
            {formatAr(commissionGerant)}
            </TableCell>
            </TableRow>
          ))}
          </TableBody>
          <TableFooter>
          <TableCell colSpan={5} className="font-bold">
          TOTAL
          </TableCell>
          <TableCell align="right" className="font-bold text-violet-400">
          {formatAr(dayFraisTotal)}
          </TableCell>
          <TableCell align="right" className="font-bold text-pink-400">
          {formatAr(dayGain)}
          </TableCell>
          </TableFooter>
          </Table>
        ) : (
          <Card className="py-8">
          <div className="text-center text-[13px] text-[var(--text-muted)]">
          <div className="text-[28px] mb-1.5">💰</div>
          Aucune livraison avec commission ce jour.
          </div>
          </Card>
        )}
        </div>
      )}

      {/* ══ TAB MOIS ══ */}
      {gerantTab === "mois" && (
        <div>
        <div className="mb-4">
        <Select
        label="Sélectionner un mois"
        value={gerantMonth}
        onChange={(e) => setGerantMonth(e.target.value)}
        className={isMobile ? "" : "max-w-[220px]"}
        options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
        />
        </div>

        {/* Stats mois */}
        <div className={`grid gap-2.5 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-2"}`}>
        <StatCard
        label={`Gain total — ${monthLabel(gerantMonth)}`}
        value={formatAr(monthGain)}
        className="text-pink-400"
        icon={<Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" size={18} className="text-pink-400" />}
        />
        <StatCard
        label="Frais collectés"
        value={formatAr(monthFrais)}
        className="text-violet-400"
        icon={<Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" size={18} className="text-violet-400" />}
        />
        </div>

        {monthByDay.length > 0 ? (
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
              <Badge variant="default" size="sm">
              {d.count}
              </Badge>
              </TableCell>
              <TableCell align="right" className="font-semibold text-violet-400">
              {formatAr(d.frais)}
              </TableCell>
              <TableCell align="right" className="font-semibold text-pink-400">
              {formatAr(d.gain)}
              </TableCell>
              <TableCell align="right" className={`font-semibold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatAr(net)}
              </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
          <TableFooter>
          <TableCell className="font-bold">TOTAL</TableCell>
          <TableCell align="center" className="font-bold">
          {monthCount}
          </TableCell>
          <TableCell align="right" className="font-bold text-violet-400">
          {formatAr(monthFrais)}
          </TableCell>
          <TableCell align="right" className="font-bold text-pink-400">
          {formatAr(monthGain)}
          </TableCell>
          <TableCell align="right" className={`font-bold ${monthFrais - monthGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {formatAr(monthFrais - monthGain)}
          </TableCell>
          </TableFooter>
          </Table>
        ) : (
          <Card className="py-8">
          <div className="text-center text-[13px] text-[var(--text-muted)]">
          <div className="text-[28px] mb-1.5">💰</div>
          Aucune livraison avec commission ce mois-ci.
          </div>
          </Card>
        )}
        </div>
      )}
      </div>
    );
}
