// src/modules/livraison/pages/Historique.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { ClientFeedbackModal } from "@/modules/shared/components/Modals/ClientFeedbackModal";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader, Select,
} from "@/modules/shared/components/ui";
import { Icon } from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import { formatAr, PAIE_MODES, STATUTS, TODAY } from "@/modules/shared/utils/constants";
import { StatusIcon } from "@/modules/shared/components/ui/Icons";

/* ─── Status config ─── */
const STATUS_CONFIG = [
  { key: "en_cours", label: "En cours", color: "var(--gold)", bg: "rgba(201,169,110,0.08)", border: "rgba(201,169,110,0.15)", icon: "clock" as const },
  { key: "livre", label: "Livré", color: "var(--success)", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)", icon: "check" as const },
  { key: "retourne", label: "Retourné", color: "var(--danger)", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)", icon: "rotate-left" as const },
  { key: "reporte", label: "Reporté", color: "var(--violet)", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.15)", icon: "xmark" as const },
] as const;

const STATUS_OPTIONS = STATUS_CONFIG.map(({ key, label }) => ({ value: key, label }));

const agentMatch = (livraison: Livraison, agent: { id?: string; nom?: string }): boolean => {
  if (livraison.agent_id != null && agent.id != null) return Number(livraison.agent_id) === Number(agent.id);
  return livraison.agent_nom === agent.nom;
};

interface ClientStat {
  client: string;
  livs: Livraison[];
  totalMontant: number;
  totalFrais: number;
}

function getStatusCfg(statut?: string) {
  return STATUS_CONFIG.find((s) => s.key === statut) || STATUS_CONFIG[0];
}

const EditIcon = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={10} />;
const TrashIcon = () => <Icon d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" size={10} />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" size={14} />;
const FilterIcon = () => <Icon d="M22 3H2l10 9.46V19l4 2V12.46L22 3z" size={14} />;
const FileTextIcon = () => <Icon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" size={14} />;
const HistoryIcon = () => <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={16} />;

export default function Historique() {
  const { livraisons = [], agents = [], showToast, livraisonCrud } = useApp();
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [histDate, setHistDate] = useState<string>(TODAY());
  const [histAgent, setHistAgent] = useState<string>("tous");
  const [histStatut, setHistStatut] = useState<string>("tous");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Livraison>>({});
  const [fbClient, setFbClient] = useState<string | { client: string; livs: Livraison[] } | null>(null);
  const [fbRecup, setFbRecup] = useState("0");
  const [fbProvince, setFbProvince] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useState(() => { setTimeout(() => setMounted(true), 50); });

  const safeLivraisons = Array.isArray(livraisons) ? livraisons : [];

  const livsFiltered = useMemo(() => {
    return safeLivraisons.filter((l) =>
      l.date === histDate &&
      (histAgent === "tous" || l.agent_nom === histAgent) &&
      (histStatut === "tous" || l.statut === histStatut)
    );
  }, [safeLivraisons, histDate, histAgent, histStatut]);

  const statsByClient: ClientStat[] = useMemo(() => {
    const map: Record<string, ClientStat> = {};
    livsFiltered.forEach((l) => {
      const client = l.client_donneur || "—";
      if (!map[client]) map[client] = { client, livs: [], totalMontant: 0, totalFrais: 0 };
      map[client].livs.push(l);
      if (l.paiement !== "client") map[client].totalMontant += Number(l.montant) || 0;
      map[client].totalFrais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalMontant - a.totalMontant);
  }, [livsFiltered]);

  const stats = useMemo(() => ({
    total: livsFiltered.length,
    montant: livsFiltered.reduce((s, l) => s + (Number(l.montant) || 0), 0),
    frais: livsFiltered.reduce((s, l) => s + (Number(l.frais) || 0), 0),
    livres: livsFiltered.filter((l) => l.statut === "livre").length,
    enCours: livsFiltered.filter((l) => l.statut === "en_cours").length,
    retournes: livsFiltered.filter((l) => l.statut === "retourne").length,
  }), [livsFiltered]);

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const montant = editData.paiement === "client" ? 0 : parseFloat(String(editData.montant)) || 0;
      await livraisonCrud.update(editId, { ...editData, montant, frais: parseFloat(String(editData.frais)) || 0 });
      setEditId(null);
      showToast("Livraison mise à jour");
    } catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    setSaving(true);
    try { await livraisonCrud.delete(id); showToast("Livraison supprimée", "warn"); }
    catch { showToast("Erreur", "error"); }
    finally { setSaving(false); }
  };

  const startEdit = (l: Livraison) => { setEditId(l.id); setEditData({ ...l }); };

  const handleExportCSV = useCallback(() => {
    const bom = "﻿";
    const header = "Date;Colis;Donneur;Destinataire;Agent;Montant;Frais;Statut\n";
    const rows = livsFiltered.map((l) => [l.date, l.colis, l.client_donneur, l.destinataire, l.agent_nom || "", l.montant || 0, l.frais || 0, STATUTS[l.statut || ""]?.label || ""].join(";")).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique_${histDate}.csv`;
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => { document.body.removeChild(a); URL.revokeObjectURL(url); });
    showToast("Export CSV téléchargé");
  }, [livsFiltered, histDate, showToast]);

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  return (
    <div className="pb-8">
      {/* HEADER */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{
        ...sectionStyle(0),
        background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(201,169,110,0.03) 100%)",
        border: "1px solid rgba(139,92,246,0.08)",
      }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{
              border: "2px solid rgba(139,92,246,0.2)",
              background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))",
              boxShadow: "0 0 20px rgba(139,92,246,0.06)",
            }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Historique</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name}</p>
            </div>
          </div>
          <Button variant="success" size="sm" onClick={handleExportCSV} icon={<DownloadIcon />}>Exporter CSV</Button>
        </div>
      </div>

      {/* STATS */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        {[
          { label: "Total", value: stats.total, color: "var(--gold)", icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
          { label: "Livrés", value: stats.livres, color: "var(--success)", icon: "M20 6L9 17l-5-5" },
          { label: "Retournés", value: stats.retournes, color: "var(--danger)", icon: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 1015.24 4.76L23 9" },
          { label: "Montant", value: formatAr(stats.montant), color: "var(--violet)", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000 7H6M17 19h-5.5a3.5 3.5 0 010-7H19" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3.5 transition-all duration-200 hover:-translate-y-0.5" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${s.color}10`, color: s.color }}>
                <Icon d={s.icon} size={13} />
              </div>
            </div>
            <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div className="mb-5 rounded-xl p-4" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)" }}>
            <FilterIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Filtres</span>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          <Input type="date" label="Date" value={histDate} onChange={(e) => setHistDate(e.target.value)} />
          <Select label="Agent" value={histAgent} onChange={(e) => setHistAgent(e.target.value)} options={[{ value: "tous", label: "Tous" }, ...agents.map((a) => ({ value: a.nom, label: a.nom }))]} />
          <Select label="Statut" value={histStatut} onChange={(e) => setHistStatut(e.target.value)} options={[{ value: "tous", label: "Tous" }, ...STATUS_OPTIONS]} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button onClick={() => setHistStatut("tous")} className="rounded-full px-3 py-1 text-[10px] font-semibold btn-press transition-all" style={{
            border: histStatut === "tous" ? "1.5px solid var(--violet)" : "1px solid var(--border-default)",
            background: histStatut === "tous" ? "rgba(139,92,246,0.08)" : "transparent",
            color: histStatut === "tous" ? "var(--violet)" : "var(--text-muted)",
          }}>Tous ({livsFiltered.length})</button>
          {STATUS_CONFIG.map((opt) => {
            const count = livsFiltered.filter((l) => l.statut === opt.key).length;
            return (
              <button key={opt.key} onClick={() => setHistStatut(opt.key)} className="flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold btn-press transition-all" style={{
                border: histStatut === opt.key ? `1.5px solid ${opt.color}` : "1px solid var(--border-default)",
                background: histStatut === opt.key ? opt.bg : "transparent",
                color: histStatut === opt.key ? opt.color : "var(--text-muted)",
              }}>
                <StatusIcon name={opt.icon} size={10} className="text-current" />
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* CLIENT FEEDBACK MODAL */}
      <ClientFeedbackModal
        fbClient={fbClient} setFbClient={setFbClient} histDate={histDate}
        fbRecup={fbRecup} setFbRecup={setFbRecup} fbProvince={fbProvince} setFbProvince={setFbProvince}
        livraisons={livsFiltered} onClose={() => setFbClient(null)}
      />

      {/* VERSEMENT PAR CLIENT */}
      {statsByClient.length > 0 && (
        <div style={sectionStyle(0.2)}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
              <HistoryIcon />
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Versement par client</h2>
            <Badge variant="default" size="sm">{statsByClient.length} client{statsByClient.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="flex flex-col gap-4">
            {statsByClient.map((cl, cIdx) => {
              const livrees = cl.livs.filter((l) => l.statut === "livre");
              const retournees = cl.livs.filter((l) => l.statut === "retourne");
              const reportees = cl.livs.filter((l) => l.statut === "reporte");
              const enCours = cl.livs.filter((l) => l.statut === "en_cours");

              const renderLivGroup = (title: string, items: Livraison[], color: string, bg: string, iconName: string) => {
                if (items.length === 0) return null;
                return (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: `${color}19`, color }}>
                        <StatusIcon name={iconName as "check" | "rotate-left" | "xmark" | "clock"} size={11} className="text-current" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{title} ({items.length})</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((l) => (
                        <div key={l.id} className="rounded-lg overflow-hidden" style={{ background: `${bg}08`, borderLeft: `2px solid ${color}` }}>
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md shrink-0" style={{ background: `${color}14`, color }}>
                              <StatusIcon name={iconName as "check" | "rotate-left" | "xmark" | "clock"} size={12} className="text-current" />
                            </div>
                            <span className="text-[12px] font-semibold flex-1 min-w-[80px] truncate" style={{ color: "var(--text-primary)" }}>{l.colis}</span>
                            <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{l.destinataire}</span>
                            <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: l.paiement === "client" ? "var(--info)" : color }}>
                              {l.paiement === "client" ? "Client" : l.montant ? formatAr(l.montant) : "—"}
                            </span>
                            <button onClick={() => startEdit(l)} className="w-6 h-6 rounded-md flex items-center justify-center btn-press shrink-0" style={{ border: "1px solid var(--border-default)", color: "var(--text-muted)" }}>
                              <EditIcon />
                            </button>
                            <button onClick={() => setConfirmDelete(l.id)} className="w-6 h-6 rounded-md flex items-center justify-center btn-press shrink-0" style={{ border: "1px solid rgba(248,113,113,0.12)", color: "var(--danger)", background: "rgba(248,113,113,0.03)" }}>
                              <TrashIcon />
                            </button>
                          </div>
                          {l.remarque && (
                            <div className="px-3 pb-2">
                              <div className="rounded-md px-2.5 py-1.5 text-[10px]" style={{ background: `${bg}0a`, borderLeft: `2px solid ${color}`, color: "var(--text-secondary)" }}>
                                <span className="font-bold" style={{ color }}>Motif : </span>{l.remarque}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <div key={cl.client} className="rounded-2xl overflow-hidden transition-all duration-200" style={{
                  ...sectionStyle(0.25 + cIdx * 0.05),
                  border: "1px solid var(--border-subtle)", background: "var(--bg-card)",
                }}>
                  <div className="px-4 py-3.5" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.04) 0%, rgba(139,92,246,0.02) 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold" style={{ background: "linear-gradient(135deg, var(--gold), var(--violet))", color: "var(--bg-primary)", boxShadow: "0 0 12px rgba(201,169,110,0.12)" }}>
                          {cl.client.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm" style={{ color: "var(--text-primary)" }}>{cl.client}</div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{cl.livs.length} colis · {formatAr(cl.totalMontant + cl.totalFrais)} total</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>À verser</div>
                          <div className="font-extrabold text-sm" style={{ color: "var(--success)" }}>{formatAr(cl.totalMontant)}</div>
                        </div>
                        <Button variant="primary" size="sm" onClick={() => { setFbClient(cl.client); setFbRecup("0"); setFbProvince("0"); }} icon={<FileTextIcon />}>PDF</Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    {renderLivGroup("Livrés", livrees, "var(--success)", "rgba(52,211,153,0.03)", "check")}
                    {renderLivGroup("Retournés", retournees, "var(--danger)", "rgba(248,113,113,0.03)", "rotate-left")}
                    {renderLivGroup("Reportés", reportees, "var(--violet)", "rgba(139,92,246,0.03)", "xmark")}
                    {renderLivGroup("En cours", enCours, "var(--gold)", "rgba(201,169,110,0.03)", "clock")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {livsFiltered.length === 0 && (
        <div className="rounded-2xl py-12 text-center" style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Aucune livraison pour cette date.</div>
        </div>
      )}

      {/* MODAL ÉDITION */}
      <Modal open={!!editId} onClose={() => setEditId(null)}>
        <ModalHeader title="Modifier la livraison" onClose={() => setEditId(null)} />
        <ModalBody>
          <div className={`grid gap-2.5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <Input label="Colis" value={String(editData.colis ?? "")} onChange={(e) => setEditData({ ...editData, colis: e.target.value })} />
            <Input label="Client donneur" value={String(editData.client_donneur ?? "")} onChange={(e) => setEditData({ ...editData, client_donneur: e.target.value })} />
            <Input label="Destinataire" value={String(editData.destinataire ?? "")} onChange={(e) => setEditData({ ...editData, destinataire: e.target.value })} />
            <Input label="Lieu" value={String(editData.destinataire_lieu ?? "")} onChange={(e) => setEditData({ ...editData, destinataire_lieu: e.target.value })} />
            <Input type="number" label="Montant (Ar)" value={String(editData.montant ?? "")} onChange={(e) => setEditData({ ...editData, montant: Number(e.target.value) })} />
            <Input type="number" label="Frais (Ar)" value={String(editData.frais ?? "")} onChange={(e) => setEditData({ ...editData, frais: Number(e.target.value) })} />
            <Select label="Statut" value={String(editData.statut ?? "en_cours")} onChange={(e) => setEditData({ ...editData, statut: e.target.value })} options={STATUS_OPTIONS} />
            <Select label="Paiement" value={String(editData.paiement ?? "espece")} onChange={(e) => setEditData({ ...editData, paiement: e.target.value })} options={Object.entries(PAIE_MODES).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          <div className="mt-2.5">
            <Input label="Remarque" value={String(editData.remarque ?? "")} onChange={(e) => setEditData({ ...editData, remarque: e.target.value })} placeholder="Motif du retour, du report..." />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
          <Button variant="primary" onClick={handleUpdate} loading={saving}>Enregistrer</Button>
        </ModalFooter>
      </Modal>

      {/* MODAL SUPPRESSION */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
