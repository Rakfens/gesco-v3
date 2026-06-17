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

/* ─── Sous-composants ─── */
function PaiementButton({
  mode,
  active,
  onClick,
}: {
  mode: PaiementMode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
    type="button"
    onClick={onClick}
    data-testid={`paiement-mode-${mode.key}`}
    className={`flex-1 py-2.5 px-2 rounded-[9px] text-xs font-semibold text-center cursor-pointer transition-all duration-150 font-[var(--font)] ${active ? "border-2 border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]" : "border-2 border-[var(--border2)] bg-[var(--bg)] text-[var(--subtle)]"}`}
    >
    <div
    className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wider flex-shrink-0 mx-auto mb-0.5 ${active ? "bg-[var(--accent)] text-white" : "bg-[var(--border2)] text-[var(--subtle)]"}`}
    >
    {mode.icon}
    </div>
    {mode.label}
    </button>
  );
}

function SectionHeader({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <div className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${colorClass}`}>
    {label}
    </div>
  );
}

/* ─── Form ─── */
export function LivraisonForm({
  agents,
  onAddLivraison,
  showToast,
  suggestions,
}: LivraisonFormProps) {
  const { currentCompany } = useCompany();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<FormState>({
    colis: "",
    client_donneur: "",
    destinataire: "",
    destinataire_telephone: "",
    destinataire_lieu: "",
    agentId: "",
    agent_nom: "",
    montant: "",
    frais: "",
    paiement: "espece",
    date: TODAY(),
                                               statut: "en_cours",
                                               remarque: "",
  });

  const [submitting, setSubmitting] = useState(false);

  /* ─── Mémoïsation ─── */
  const agentOptions = useMemo(
    () => agents.map((a) => ({ value: String(a.id), label: a.nom })),
                               [agents]
  );

  const paiementModes = useMemo(
    () => Object.entries(PAIE_MODES).map(([key, val]) => ({ key, label: val.label, icon: val.icon })),
                                []
  );

  const statutOptions = useMemo(
    () => Object.entries(STATUTS).map(([key, val]) => ({ value: key, label: val.label })),
                                []
  );

  /* ─── Handlers ─── */
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      colis: "",
      client_donneur: "",
      destinataire: "",
      destinataire_telephone: "",
      destinataire_lieu: "",
      agentId: "",
      agent_nom: "",
      montant: "",
      frais: "",
      paiement: "espece",
      date: TODAY(),
            statut: "en_cours",
            remarque: "",
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    const required = [
      { field: "colis" as const, label: "Nom du colis" },
      { field: "client_donneur" as const, label: "Client donneur" },
      { field: "destinataire" as const, label: "Destinataire" },
      { field: "agentId" as const, label: "Livreur" },
      { field: "date" as const, label: "Date" },
    ];
    const missing = required.filter((r) => !form[r.field].trim());
    if (missing.length > 0) {
      const labels = missing.map((m) => m.label).join(", ");
      showToast(`${labels} requis${missing.length > 1 ? "s" : ""}`, "error");
      return;
    }

    const selectedAgent = agents.find((a) => a.id === form.agentId);
    const agent_nom = selectedAgent?.nom || "—";

    // Construire l'objet Partial<Livraison> typé
    const livraisonData: Partial<Livraison> = {
      colis: form.colis.trim(),
                                   client_donneur: form.client_donneur.trim(),
                                   destinataire: form.destinataire.trim(),
                                   destinataire_telephone: form.destinataire_telephone.trim() || undefined,
                                   destinataire_lieu: form.destinataire_lieu.trim() || undefined,
                                   agent_id: form.agentId,
                                   agent_nom: agent_nom,
                                   montant: form.paiement === "client" ? 0 : parseFloat(form.montant) || 0,
                                   frais: parseFloat(form.frais) || 0,
                                   paiement: form.paiement,
                                   date: form.date,
                                   statut: form.statut,
                                   remarque: form.statut === "reporte" ? form.remarque.trim() : undefined,
                                   company_id: currentCompany?.id,
    };

    setSubmitting(true);
    try {
      await onAddLivraison(livraisonData);
      resetForm();
      showToast("Livraison enregistrée avec succès");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }, [form, agents, currentCompany, onAddLivraison, showToast, resetForm]);

  const isClientPaiement = form.paiement === "client";

  return (
    <div data-testid="livraison-form-page">
    {/* Header */}
    <div className="mb-5">
    <h1 className="font-extrabold tracking-tight text-[22px] text-[var(--text)]">
    Nouvelle livraison
    {currentCompany && (
      <span className="font-normal ml-1.5 text-sm text-[var(--muted)]">
      · {currentCompany.name}
      </span>
    )}
    </h1>
    </div>

    <Card padding={isMobile ? "sm" : "md"}>
    {/* Colis + Montant */}
    <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
    <div className="relative">
    <Input
    label="Nom du colis"
    placeholder="Ex: Téléphone"
    value={form.colis}
    onChange={(e) => updateField("colis", e.target.value)}
    list="colis-list"
    required
    />
    <datalist id="colis-list">
    {suggestions?.colisList?.map((c) => (
      <option key={c} value={c} />
    ))}
    </datalist>
    </div>
    <Input
    label="Montant (Ar)"
    type="number"
    placeholder="50000"
    value={form.montant}
    onChange={(e) => updateField("montant", e.target.value)}
    disabled={isClientPaiement}
    min={0}
    step={100}
    />
    </div>

    {/* Client donneur */}
    <div className="rounded-[10px] p-3 mb-3 bg-blue-400/10">
    <SectionHeader label="Client donneur" colorClass="text-blue-400" />
    <div className="relative">
    <Input
    placeholder="Ex: SARL TECH"
    value={form.client_donneur}
    onChange={(e) => updateField("client_donneur", e.target.value)}
    list="client-list"
    required
    />
    <datalist id="client-list">
    {suggestions?.clients?.map((c) => (
      <option key={c} value={c} />
    ))}
    </datalist>
    </div>
    </div>

    {/* Destinataire */}
    <div className="rounded-[10px] p-3 mb-3 bg-teal-400/10">
    <SectionHeader label="Destinataire" colorClass="text-teal-400" />
    <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
    <div className="relative">
    <Input
    placeholder="Ex: Jean RAZAFY"
    value={form.destinataire}
    onChange={(e) => updateField("destinataire", e.target.value)}
    list="destinataire-list"
    required
    />
    <datalist id="destinataire-list" />
    </div>
    <Input
    type="tel"
    placeholder="034 00 000 00"
    value={form.destinataire_telephone}
    onChange={(e) => updateField("destinataire_telephone", e.target.value)}
    />
    </div>
    <div className="mt-2 relative">
    <Input
    placeholder="Ex: Analakely, Antaninarenina..."
    value={form.destinataire_lieu}
    onChange={(e) => updateField("destinataire_lieu", e.target.value)}
    list="lieu-list"
    />
    <datalist id="lieu-list">
    {suggestions?.lieux?.map((c) => (
      <option key={c} value={c} />
    ))}
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
    <Input
    label="Date"
    type="date"
    value={form.date}
    onChange={(e) => updateField("date", e.target.value)}
    required
    />
    </div>

    {/* Mode de paiement */}
    <div className="mb-3">
    <label className="block text-xs font-semibold mb-2 text-[var(--text2)]">
    Mode de paiement
    </label>
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${paiementModes.length}, 1fr)` }}>
    {paiementModes.map((mode) => (
      <PaiementButton
      key={mode.key}
      mode={mode}
      active={form.paiement === mode.key}
      onClick={() => updateField("paiement", mode.key)}
      />
    ))}
    </div>
    </div>

    {/* Frais */}
    <Input
    label="Frais de livraison (Ar)"
    type="number"
    placeholder="3000"
    value={form.frais}
    onChange={(e) => updateField("frais", e.target.value)}
    min={0}
    step={100}
    />

    {/* Statut */}
    <div className="mt-3">
    <Select
    label="Statut"
    value={form.statut}
    onChange={(e) => updateField("statut", e.target.value)}
    options={statutOptions}
    />
    </div>

    {/* Remarque — visible si reporté */}
    {form.statut === "reporte" && (
      <div className="mt-3">
      <label className="block text-xs font-semibold mb-1.5 text-[var(--text2)]">
      Motif du report
      </label>
      <textarea
      className="w-full px-3.5 py-2.5 min-h-[70px] rounded-lg text-sm outline-none resize-y box-border bg-[var(--card)] border border-[var(--border2)] text-[var(--text)] font-[var(--font)]"
      value={form.remarque || ""}
      onChange={(e) => updateField("remarque", e.target.value)}
      placeholder="Ex: Reporté au lendemain..."
      rows={3}
      />
      </div>
    )}

    {/* Submit */}
    <div className="mt-4">
    <Button
    variant="primary"
    fullWidth
    onClick={handleSubmit}
    disabled={submitting}
    data-testid="btn-submit-livraison"
    >
    {submitting ? "Enregistrement..." : "Enregistrer la livraison"}
    </Button>
    </div>
    </Card>
    </div>
  );
}
