// ClientFeedbackModal.tsx — v6 : 100% Tailwind pur
import { useState } from "react";
import type { Livraison } from "@/modules/shared/types";
import { useCompany } from "../../context/CompanyContext";
import { formatAr, STATUTS } from "../../utils/constants";
import { generateClientPDF } from "../../utils/pdfExport";

interface ClientFeedbackModalProps {
  fbClient: string | { client: string; livs: Livraison[] } | null;
  setFbClient: (v: string | { client: string; livs: Livraison[] } | null) => void;
  histDate: string;
  fbRecup: string;
  setFbRecup: (v: string) => void;
  fbProvince: string;
  setFbProvince: (v: string) => void;
  livraisons: Livraison[];
  onClose?: () => void;
}

export function ClientFeedbackModal({
  fbClient,
  setFbClient,
  histDate,
  fbRecup,
  setFbRecup,
  fbProvince,
  setFbProvince,
  livraisons,
  onClose,
}: ClientFeedbackModalProps) {
  const { currentCompany } = useCompany();
  const [generating, setGenerating] = useState(false);

  if (!fbClient) return null;

  const clientNom = typeof fbClient === "string" ? fbClient : fbClient.client;
  const livsClient =
  typeof fbClient === "string"
  ? (livraisons || []).filter((l) => l.client_donneur === fbClient)
  : fbClient.livs;

  const livsLivrees = livsClient.filter((l) => l.statut === "livre");
  const livsRetournees = livsClient.filter((l) => l.statut === "retourne");
  const livsReportees = livsClient.filter((l) => l.statut === "reporte");
  const livsEnCours = livsClient.filter((l) => l.statut === "en_cours");
  const livsFacturees = livsLivrees.filter((l) => l.paiement !== "client");

  const totalMontant = livsFacturees.reduce(
    (s, l) => s + parseFloat(String(l.montant || 0)),
                                            0,
  );

  const aVerser =
  totalMontant - (parseFloat(fbRecup) || 0) - (parseFloat(fbProvince) || 0);

  const hasNonLivrees = livsRetournees.length > 0 || livsReportees.length > 0;

  const handleClose = () => {
    if (onClose) onClose();
    else setFbClient(null);
  };

    const handleGeneratePDF = async () => {
      setGenerating(true);
      try {
        await generateClientPDF(
          clientNom,
          livsClient,
          parseFloat(fbRecup) || 0,
                                parseFloat(fbProvince) || 0,
                                null,
                                currentCompany,
        );
        handleClose();
      } catch (_) {
        /* ignore */
      } finally {
        setGenerating(false);
      }
    };

    const StatBadge = ({ statut }: { statut: string }) => {
      const s = STATUTS[statut];
      if (!s) return null;
      return (
        <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.tailwindBg} ${s.tailwindColor}`}
        >
        {s.label}
        </span>
      );
    };

    return (
      <div
      className="fixed inset-0 z-[500] flex items-end justify-center bg-black/40 animate-fade-in"
      onClick={handleClose}
      >
      <div
      className="flex w-full max-w-[500px] flex-col overflow-hidden rounded-t-[18px] bg-[#121218] shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fade-up max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
      >
      {/* Handle */}
      <div className="mx-auto mt-3 h-1 w-9 rounded bg-[#2a2a32]" />

      {/* Header */}
      <div className="flex shrink-0 items-start justify-between px-5 pb-2 pt-1">
      <div>
      <h2 className="text-lg font-extrabold tracking-tight text-[#e8e8ec]">
      Bilan client
      </h2>
      <div className="mt-1 text-xs text-[#6b6b7b]">
      {clientNom} · {histDate} · {livsClient.length} colis
      </div>
      </div>
      <button
      type="button"
      onClick={handleClose}
      className="border-none bg-transparent p-1 text-xl text-[#6b6b7b] transition-colors hover:text-[#e8e8ec]"
      >
      Fermer
      </button>
      </div>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
      {/* Stats grid */}
      <div className="mb-3.5 grid grid-cols-4 gap-2">
      {[
        { label: "Livrés", count: livsLivrees.length, color: "text-emerald-400", bg: "bg-emerald-500/5" },
        { label: "Retournés", count: livsRetournees.length, color: "text-red-400", bg: "bg-red-500/5" },
        { label: "Reportés", count: livsReportees.length, color: "text-amber-400", bg: "bg-amber-500/5" },
        { label: "En cours", count: livsEnCours.length, color: "text-blue-400", bg: "bg-blue-500/5" },
      ].map((s) => (
        <div key={s.label} className={`rounded-xl py-2 text-center ${s.bg}`}>
        <div className={`text-lg font-extrabold ${s.color}`}>{s.count}</div>
        <div className={`text-[9px] font-semibold ${s.color}`}>{s.label}</div>
        </div>
      ))}
      </div>

      {/* Non livrés */}
      {hasNonLivrees && (
        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
        Colis non livrés ({livsRetournees.length + livsReportees.length})
        </div>
        {[...livsRetournees, ...livsReportees].map((l) => (
          <div key={l.id} className="mb-2 rounded-xl bg-[#16161c] p-3">
          <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-bold text-[#e8e8ec]">{l.colis}</span>
          <StatBadge statut={l.statut ?? ""} />
          </div>
          <div className="mb-1.5 text-[11px] text-[#6b6b7b]">
          {l.destinataire}
          {l.destinataire_lieu ? ` · ${l.destinataire_lieu}` : ""}
          </div>
          {l.remarque ? (
            <div className="rounded-lg border-l-[3px] border-amber-500 bg-[#08080c] px-2.5 py-1.5 text-xs text-[#a0a0b0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Motif :{" "}
            </span>
            {l.remarque}
            </div>
          ) : (
            <div className="text-[11px] italic text-[#6b6b7b]">Aucun motif renseigné</div>
          )}
          </div>
        ))}
        </div>
      )}

      {/* Livrés */}
      {livsLivrees.length > 0 && (
        <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
        Livrés ({livsLivrees.length})
        </div>
        {livsLivrees.map((l) => (
          <div
          key={l.id}
          className="flex items-center justify-between border-b border-emerald-500/10 py-1.5 text-[13px]"
          >
          <div>
          <span className="font-semibold">{l.colis}</span>
          <span className="ml-2 text-[11px] text-[#6b6b7b]">{l.destinataire}</span>
          </div>
          <span
          className={`font-bold ${l.paiement === "client" ? "text-blue-400" : "text-emerald-400"}`}
          >
          {l.paiement === "client"
            ? "Payé client"
            : formatAr(parseFloat(String(l.montant || 0)))}
            </span>
            </div>
        ))}
        </div>
      )}

      {/* Calcul versement */}
      <div className="mb-2 rounded-xl bg-[#08080c] p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[#6b6b7b]">
      Calcul versement
      </div>
      <div className="mb-2.5 flex justify-between text-[13px]">
      <span className="text-[#a0a0b0]">Total livré ({livsFacturees.length})</span>
      <span className="font-bold text-emerald-400">{formatAr(totalMontant)}</span>
      </div>
      <div className="mb-3 flex flex-col gap-2.5">
      <div>
      <label className="mb-1 block text-[11px] font-semibold text-[#a0a0b0]">
      Récupération matinale (Ar)
      </label>
      <input
      type="number"
      className="w-full rounded-lg border border-white/[0.06] bg-[#121218] px-3 py-2 text-sm text-[#e8e8ec] outline-none transition-all placeholder:text-[#3a3a48] focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(201,169,110,0.06)]"
      value={fbRecup}
      onChange={(e) => setFbRecup(e.target.value)}
      placeholder="0"
      />
      </div>
      <div>
      <label className="mb-1 block text-[11px] font-semibold text-[#a0a0b0]">
      Province / déduction (Ar)
      </label>
      <input
      type="number"
      className="w-full rounded-lg border border-white/[0.06] bg-[#121218] px-3 py-2 text-sm text-[#e8e8ec] outline-none transition-all placeholder:text-[#3a3a48] focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(201,169,110,0.06)]"
      value={fbProvince}
      onChange={(e) => setFbProvince(e.target.value)}
      placeholder="0"
      />
      </div>
      </div>
      <div className="flex justify-between border-t border-white/[0.06] pt-3 text-[17px] font-extrabold">
      <span className="text-[#e8e8ec]">À VERSER</span>
      <span className={aVerser >= 0 ? "text-emerald-400" : "text-red-400"}>
      {formatAr(aVerser)}
      </span>
      </div>
      </div>
      </div>

      {/* Sticky footer */}
      <div className="flex shrink-0 gap-2 border-t border-white/[0.06] bg-[#121218] p-4">
      <button
      type="button"
      onClick={handleClose}
      className="flex-1 rounded-xl border border-white/[0.08] bg-[#16161c] px-4 py-3 text-[13px] font-semibold text-[#a0a0b0] transition-colors hover:bg-[#1a1a1e] hover:text-[#e8e8ec]"
      >
      Annuler
      </button>
      <button
      type="button"
      className="flex-[2] rounded-xl bg-blue-500 px-4 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-70"
      onClick={handleGeneratePDF}
      disabled={generating}
      >
      {generating ? "Génération..." : "Imprimer le bilan"}
      </button>
      </div>
      </div>
      </div>
    );
}

export default ClientFeedbackModal;
