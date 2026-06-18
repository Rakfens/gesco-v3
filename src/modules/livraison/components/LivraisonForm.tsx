// src/modules/livraison/components/LivraisonForm.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Card, Input, Select } from "@/modules/shared/components/ui";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Livraison } from "@/modules/shared/types";
import type { ToastType } from "@/modules/shared/hooks/useToast";
import { PAIE_MODES, STATUTS, TODAY } from "@/modules/shared/utils/constants";

/* ─── Types ─── */
interface PaiementMode {
  key: string;
  label: string;
  icon: string;
}

interface LivraisonFormProps {
  agents: Array<{ id: string; nom: string }>;
  onAddLivraison: (data: Partial<Livraison>) => Promise<void>;
  showToast: (msg: string, type?: ToastType, duration?: number) => number;
  suggestions?: { colisList?: string[]; clients?: string[]; lieux?: string[] };
}

interface FormState {
  colis: string;
  client_donneur: string;
  destinataire: string;
  destinataire_telephone: string;
  destinataire_lieu: string;
  agentId: string;
  agent_nom: string;
  montant: string;
  frais: string;
  paiement: string;
  date: string;
  statut: string;
  remarque: string;
}

/* ─── SVG Icons ─── */
const PackageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <path d="M3.3 7L12 12l8.7-5" /><path d="M12 22V12" />
  </svg>
);
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const TruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1.5" fill="currentColor" /><circle cx="20" cy="21" r="1.5" fill="currentColor" />
  </svg>
);
const CashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

/* ─── Sous-composants ─── */
function PaiementButton({ mode, active, onClick }: { mode: PaiementMode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`paiement-mode-${mode.key}`}
      className="flex-1 py-3 px-2 rounded-xl text-xs font-semibold text-center cursor-pointer btn-press transition-all duration-200"
      style={{
        border: active ? "2px solid var(--gold)" : "2px solid var(--border-subtle)",
        background: active ? "rgba(201,169,110,0.08)" : "var(--bg-primary)",
        color: active ? "var(--gold)" : "var(--text-faint)",
        boxShadow: active ? "0 0 12px rgba(201,169,110,0.1)" : "none",
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold tracking-wider flex-shrink-0 mx-auto mb-1"
        style={{
          background: active ? "var(--gold)" : "var(--border-active)",
          color: active ? "var(--bg-primary)" : "var(--text-faint)",
        }}
      >
        {mode.icon}
      </div>
      {mode.label}
    </button>
  );
}

function SectionHeader({ label, icon, color }: { label: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

/* ─── Form ─── */
export function LivraisonForm({ agents, onAddLivraison, showToast, suggestions }: LivraisonFormProps) {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<FormState>({
    colis: "", client_donneur: "", destinataire: "", destinataire_telephone: "",
    destinataire_lieu: "", agentId: "", agent_nom: "", montant: "", frais: "",
    paiement: "espece", date: TODAY(), statut: "en_cours", remarque: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useState(() => { setTimeout(() => setMounted(true), 50); });

  const agentOptions = useMemo(() => agents.map((a) => ({ value: String(a.id), label: a.nom })), [agents]);
  const paiementModes = useMemo(() => Object.entries(PAIE_MODES).map(([key, val]) => ({ key, label: val.label, icon: val.icon })), []);
  const statutOptions = useMemo(() => Object.entries(STATUTS).map(([key, val]) => ({ value: key, label: val.label })), []);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ colis: "", client_donneur: "", destinataire: "", destinataire_telephone: "", destinataire_lieu: "", agentId: "", agent_nom: "", montant: "", frais: "", paiement: "espece", date: TODAY(), statut: "en_cours", remarque: "" });
  }, []);

  const handleSubmit = useCallback(async () => {
    const required = [
      { field: "colis" as const, label: "Nom du colis" },
      { field: "client_donneur" as const, label: "Client donneur" },
      { field: "destinataire" as const, label: "Destinataire" },
      { field: "agentId" as const, label: "Livreur" },
      { field: "date" as const, label: "Date" },
    ];
    const missing = required.filter((r) => !form[r.field].trim());
    if (missing.length > 0) {
      showToast(`${missing.map((m) => m.label).join(", ")} requis${missing.length > 1 ? "s" : ""}`, "error");
      return;
    }
    const selectedAgent = agents.find((a) => a.id === form.agentId);
    const livraisonData: Partial<Livraison> = {
      colis: form.colis.trim(), client_donneur: form.client_donneur.trim(),
      destinataire: form.destinataire.trim(),
      destinataire_telephone: form.destinataire_telephone.trim() || undefined,
      destinataire_lieu: form.destinataire_lieu.trim() || undefined,
      agent_id: form.agentId, agent_nom: selectedAgent?.nom || "—",
      montant: form.paiement === "client" ? 0 : parseFloat(form.montant) || 0,
      frais: parseFloat(form.frais) || 0, paiement: form.paiement,
      date: form.date, statut: form.statut,
      remarque: form.statut === "reporte" ? form.remarque.trim() : undefined,
      company_id: currentCompany?.id,
    };
    setSubmitting(true);
    try {
      await onAddLivraison(livraisonData);
      resetForm();
      showToast("Livraison enregistrée avec succès");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erreur lors de l'enregistrement", "error");
    } finally { setSubmitting(false); }
  }, [form, agents, currentCompany, onAddLivraison, showToast, resetForm]);

  const isClientPaiement = form.paiement === "client";

  const sectionCardStyle = (color: string): React.CSSProperties => ({
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "14px",
    background: `${color}06`,
    border: `1px solid ${color}12`,
  });

  return (
    <div data-testid="livraison-form-page" className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-dark))", color: "var(--bg-primary)" }}
        >
          <PackageIcon />
        </div>
        <div>
          <h1 className="font-extrabold tracking-tight text-[20px]" style={{ color: "var(--text-primary)" }}>
            Nouvelle livraison
          </h1>
          {currentCompany && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{currentCompany.name}</span>
          )}
        </div>
      </div>

      <Card padding={isMobile ? "sm" : "md"}>
        {/* Colis + Montant */}
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="relative">
            <Input label="Nom du colis" placeholder="Ex: Téléphone" value={form.colis} onChange={(e) => updateField("colis", e.target.value)} list="colis-list" required />
            <datalist id="colis-list">
              {suggestions?.colisList?.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Input label="Montant (Ar)" type="number" placeholder="50000" value={form.montant} onChange={(e) => updateField("montant", e.target.value)} disabled={isClientPaiement} min={0} step={100} />
        </div>

        {/* Client donneur */}
        <div style={sectionCardStyle("var(--info)")}>
          <SectionHeader label="Client donneur" icon={<UserIcon />} color="var(--info)" />
          <div className="relative">
            <Input placeholder="Ex: SARL TECH" value={form.client_donneur} onChange={(e) => updateField("client_donneur", e.target.value)} list="client-list" required />
            <datalist id="client-list">
              {suggestions?.clients?.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Destinataire */}
        <div style={sectionCardStyle("var(--success)")}>
          <SectionHeader label="Destinataire" icon={<MapPinIcon />} color="var(--success)" />
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="relative">
              <Input placeholder="Ex: Jean RAZAFY" value={form.destinataire} onChange={(e) => updateField("destinataire", e.target.value)} list="destinataire-list" required />
              <datalist id="destinataire-list" />
            </div>
            <Input type="tel" placeholder="034 00 000 00" value={form.destinataire_telephone} onChange={(e) => updateField("destinataire_telephone", e.target.value)} />
          </div>
          <div className="mt-2 relative">
            <Input placeholder="Ex: Analakely, Antaninarenina..." value={form.destinataire_lieu} onChange={(e) => updateField("destinataire_lieu", e.target.value)} list="lieu-list" />
            <datalist id="lieu-list">
              {suggestions?.lieux?.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Livreur + Date */}
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <Select
            label="Livreur"
            value={form.agentId}
            onChange={(e) => {
              const agentId = e.target.value;
              const agent = agents.find((a) => a.id === agentId);
              setForm((prev) => ({ ...prev, agentId, agent_nom: agent?.nom || "" }));
            }}
            options={agentOptions}
            placeholder="-- Choisir --"
            required
          />
          <Input label="Date" type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} required />
        </div>

        {/* Mode de paiement */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
              <CashIcon />
            </div>
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Mode de paiement
            </label>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${paiementModes.length}, 1fr)` }}>
            {paiementModes.map((mode) => (
              <PaiementButton key={mode.key} mode={mode} active={form.paiement === mode.key} onClick={() => updateField("paiement", mode.key)} />
            ))}
          </div>
        </div>

        {/* Frais */}
        <Input label="Frais de livraison (Ar)" type="number" placeholder="3000" value={form.frais} onChange={(e) => updateField("frais", e.target.value)} min={0} step={100} />

        {/* Statut */}
        <div className="mt-3">
          <Select label="Statut" value={form.statut} onChange={(e) => updateField("statut", e.target.value)} options={statutOptions} />
        </div>

        {/* Remarque */}
        {form.statut === "reporte" && (
          <div className="mt-3 animate-fade-up">
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Motif du report
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 min-h-[70px] rounded-xl text-sm outline-none resize-y box-border input-focus"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              value={form.remarque || ""}
              onChange={(e) => updateField("remarque", e.target.value)}
              placeholder="Ex: Reporté au lendemain..."
              rows={3}
            />
          </div>
        )}

        {/* Submit */}
        <div className="mt-5">
          <Button variant="primary" fullWidth onClick={handleSubmit} disabled={submitting} data-testid="btn-submit-livraison">
            {submitting ? "Enregistrement..." : "Enregistrer la livraison"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
