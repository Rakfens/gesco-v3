"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Badge, Button, Card, Input, Modal, ModalBody, ModalFooter, ModalHeader,
  StatCard, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from "@/modules/shared/components/ui";
import { useApp } from "@/modules/shared/context/AppContext";
import { useCompany } from "@/modules/shared/context/CompanyContext";
import { useIsMobile } from "@/modules/shared/hooks/useIsMobile";
import type { Pack, Produit } from "@/modules/shared/types";
import { formatAr } from "@/modules/shared/utils/constants";
import {
  fetchPacks, fetchPackWithProduits, createPack, updatePack, deletePack, checkPackStock, isPackAvailable,
} from "@/modules/commerce/services/packService";
import { fetchProduits } from "@/modules/commerce/services/produitService";

/* ─── SVG Icons ─── */
import { Icon } from "@/modules/shared/components/ui";

/* ─── Types ─── */
interface PackProduitForm { produit_id: string; quantite: number; }
interface PackWithAvailability extends Pack { disponible?: boolean; valeurAchat?: number; marge?: number; }

/* ═══════════════════════════════════════════════════════════
   PAGE PACKS
   ═══════════════════════════════════════════════════════════ */
export default function PacksPage() {
  const { currentCompany, success: toastSuccess, error: toastError, warn: toastWarn } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();

  const [packs, setPacks] = useState<PackWithAvailability[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDisponible, setFilterDisponible] = useState<"tous" | "disponible" | "indisponible">("tous");
  const [mounted, setMounted] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [detailPack, setDetailPack] = useState<PackWithAvailability | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<Array<{ nom: string; quantite: number; stock: number; suffisant: boolean }>>([]);

  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrix, setFormPrix] = useState("");
  const [formProduits, setFormProduits] = useState<PackProduitForm[]>([]);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    if (currentCompany?.type === "service") { router.push("/commerce/dashboard"); }
  }, [currentCompany, router]);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [p, pr] = await Promise.all([fetchPacks(), fetchProduits({ isActive: true })]);
      const packsWithAvailability: PackWithAvailability[] = [];
      for (const pack of p) {
        const packComplet = await fetchPackWithProduits(pack.id);
        const disponible = await isPackAvailable(pack.id);
        let valeurAchat = 0;
        if (packComplet?.produits) {
          for (const pp of packComplet.produits) {
            const produit = pp.produit as Produit | undefined;
            valeurAchat += (produit?.prix_achat || 0) * pp.quantite;
          }
        }
        packsWithAvailability.push({ ...pack, disponible, valeurAchat, marge: pack.prix - valeurAchat, produits: packComplet?.produits });
      }
      setPacks(packsWithAvailability);
      setProduits(pr);
    } catch { toastError("Erreur lors du chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [currentCompany]);

  const packsFiltres = useMemo(() => {
    let result = packs;
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((p) => p.nom.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)); }
    if (filterDisponible === "disponible") result = result.filter((p) => p.disponible);
    else if (filterDisponible === "indisponible") result = result.filter((p) => !p.disponible);
    return result;
  }, [packs, search, filterDisponible]);

  const stats = useMemo(() => ({
    total: packs.length,
    disponibles: packs.filter((p) => p.disponible).length,
    indisponibles: packs.filter((p) => !p.disponible).length,
    margeTotal: packs.reduce((s, p) => s + (p.marge || 0), 0),
  }), [packs]);

  const resetForm = () => { setFormNom(""); setFormDescription(""); setFormPrix(""); setFormProduits([]); setEditMode(false); setSelectedPack(null); };
  const openCreateModal = () => { resetForm(); setFormProduits([{ produit_id: "", quantite: 1 }]); setShowModal(true); }

  const openEditModal = async (pack: Pack) => {
    const packComplet = await fetchPackWithProduits(pack.id);
    if (!packComplet) return;
    setEditMode(true); setSelectedPack(pack);
    setFormNom(pack.nom); setFormDescription(pack.description || ""); setFormPrix(String(pack.prix));
    setFormProduits((packComplet.produits || []).map((pp) => ({ produit_id: String(pp.produit_id), quantite: pp.quantite })));
    setShowModal(true);
  };

  const addProduitLine = () => setFormProduits([...formProduits, { produit_id: "", quantite: 1 }]);
  const removeProduitLine = (index: number) => setFormProduits(formProduits.filter((_, i) => i !== index));
  const updateProduitLine = (index: number, field: "produit_id" | "quantite", value: string | number) => {
    setFormProduits(formProduits.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    if (!formNom.trim()) { toastWarn("Le nom du pack est requis"); return; }
    if (!formPrix || parseFloat(formPrix) <= 0) { toastWarn("Le prix doit être > 0"); return; }
    if (formProduits.length === 0 || formProduits.some((p) => !p.produit_id)) { toastWarn("Ajoutez au moins un produit valide"); return; }
    setSaving(true);
    try {
      const produitsData = formProduits.filter((p) => p.produit_id).map((p) => ({ produit_id: p.produit_id, quantite: p.quantite }));
      if (editMode && selectedPack) { await updatePack(selectedPack.id, formNom, formDescription, parseFloat(formPrix), produitsData); toastSuccess("Pack modifié"); }
      else { await createPack(formNom, formDescription, parseFloat(formPrix), produitsData); toastSuccess("Pack créé"); }
      setShowModal(false); resetForm(); loadData();
    } catch (e: unknown) { toastError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try { await deletePack(showDeleteModal); toastSuccess("Pack supprimé"); setShowDeleteModal(null); loadData(); }
    catch { toastError("Erreur lors de la suppression"); }
  };

  const openDetailModal = async (packId: string) => {
    setDetailLoading(true); setShowDetailModal(packId);
    try {
      const pack = await fetchPackWithProduits(packId);
      setDetailPack(pack);
      if (pack) { const stock = await checkPackStock(pack.id); setDetailStock(stock.map((s) => ({ nom: s.nom, quantite: s.quantite_necessaire, stock: s.quantite_stock, suffisant: s.suffisant }))); }
    } catch { toastError("Erreur lors du chargement des détails"); }
    finally { setDetailLoading(false); }
  };

  const sectionStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--gold)" }} />
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement des packs...</span>
    </div>
  );

  return (
    <div className="pb-8">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl p-5" style={{ ...sectionStyle(0), background: "linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(139,92,246,0.03) 100%)", border: "1px solid rgba(201,169,110,0.08)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(201,169,110,0.05)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid rgba(201,169,110,0.2)", background: "linear-gradient(135deg, rgba(17,17,20,0.9), rgba(28,28,34,0.7))", boxShadow: "0 0 20px rgba(201,169,110,0.06)" }}>
              <Image src="/logo.png" alt="HT-GesCom" width={32} height={32} priority className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Packs</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{currentCompany?.name} · {packs.length} pack{packs.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/commerce/ventes")}>← Ventes</Button>
            <Button variant="primary" onClick={openCreateModal} icon={<Icon d="M12 5v19M5 12h19" size={14} />}>Nouveau pack</Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATS
          ═══════════════════════════════════════════════════════ */}
      <div className={`grid gap-3 mb-5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`} style={sectionStyle(0.1)}>
        <StatCard label="Total packs" value={stats.total} color="accent" icon={<Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={18} />} />
        <StatCard label="Disponibles" value={stats.disponibles} color="success" icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} />} />
        <StatCard label="Indisponibles" value={stats.indisponibles} color="danger" icon={<Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" size={18} />} />
        <StatCard label="Marge totale" value={formatAr(stats.margeTotal)} color="accent" icon={<Icon d="M2 5h20v14H2zM2 10h20" size={18} />} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          FILTRES
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-5 rounded-xl p-4" style={{ ...sectionStyle(0.15), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.08)", color: "var(--gold)" }}>
            <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" size={14} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Filtres</span>
        </div>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
          <Input placeholder="Rechercher un pack..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-1.5">
            {(["tous", "disponible", "indisponible"] as const).map((f) => (
              <button key={f} onClick={() => setFilterDisponible(f)} className="py-1.5 px-3 rounded-lg text-[11px] font-semibold btn-press transition-all" style={{ background: filterDisponible === f ? "var(--gold)" : "var(--bg-elevated)", color: filterDisponible === f ? "var(--bg-primary)" : "var(--text-muted)", border: `1px solid ${filterDisponible === f ? "var(--gold)" : "var(--border-subtle)"}` }}>
                {f === "tous" ? "Tous" : f === "disponible" ? "✅ Disponibles" : "❌ Indisponibles"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LISTE DES PACKS
          ═══════════════════════════════════════════════════════ */}
      {packsFiltres.length === 0 ? (
        <div className="rounded-2xl py-14 text-center" style={{ ...sectionStyle(0.2), border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div className="text-4xl mb-3">📦</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {packs.length === 0 ? 'Aucun pack créé. Cliquez sur "Nouveau pack" pour commencer.' : "Aucun pack ne correspond à votre recherche."}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3" style={sectionStyle(0.2)}>
          {packsFiltres.map((pack, idx) => (
            <div key={pack.id} className="rounded-2xl overflow-hidden transition-all duration-200" style={{ ...sectionStyle(0.25 + idx * 0.03), border: `1px solid ${pack.disponible ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)"}`, background: "var(--bg-card)" }}>
              <div className="p-4 lg:p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0" style={{ background: pack.disponible ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)" }}>
                      <span className="text-xl">{pack.disponible ? "📦" : "⚠️"}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{pack.nom}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: pack.disponible ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", color: pack.disponible ? "var(--success)" : "var(--danger)" }}>
                          {pack.disponible ? "Disponible" : "Indisponible"}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {pack.produits?.length || 0} produit{pack.produits?.length !== 1 ? "s" : ""} · {pack.description || "Pas de description"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-extrabold" style={{ color: "var(--gold)" }}>{formatAr(pack.prix)}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        Achat: {formatAr(pack.valeurAchat || 0)} · Marge: <span style={{ color: (pack.marge || 0) >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(pack.marge || 0)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="success" size="sm" onClick={() => router.push("/commerce/ventes")} icon={<Icon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h21M16 10a4 4 0 01-8 0" size={12} />}>Vendre</Button>
                      <Button variant="secondary" size="sm" onClick={() => openDetailModal(pack.id)} icon={<Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z" size={12} />}>Détails</Button>
                      <Button variant="primary" size="sm" onClick={() => openEditModal(pack)} icon={<Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={12} />}>Modifier</Button>
                      <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(pack.id)} icon={<Icon d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" size={12} />}>Supprimer</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODAL CRÉER/ÉDITER PACK
          ═══════════════════════════════════════════════════════ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} width={isMobile ? 480 : 700}>
        <ModalHeader title={editMode ? "Modifier le pack" : "Nouveau pack"} onClose={() => { setShowModal(false); resetForm(); }} />
        <ModalBody>
          <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <Input label="Nom du pack *" placeholder="Ex: Pack Mahampy" value={formNom} onChange={(e) => setFormNom(e.target.value)} />
            <Input label="Prix de vente (Ar) *" type="number" placeholder="120000" value={formPrix} onChange={(e) => setFormPrix(e.target.value)} />
          </div>
          <div className="mb-4">
            <Input label="Description" placeholder="Description du pack..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
              <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={12} />
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Produits du pack ({formProduits.length})</span>
          </div>
          <div className="flex flex-col gap-2 mb-3">
            {formProduits.map((fp, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select value={fp.produit_id} onChange={(e) => updateProduitLine(index, "produit_id", e.target.value)} className="flex-1 py-2.5 px-3 rounded-lg text-[13px] outline-none" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                  <option value="">-- Choisir un produit --</option>
                  {produits.map((p) => (<option key={p.id} value={p.id}>{p.nom} (Stock: {p.quantite_stock})</option>))}
                </select>
                <input type="number" min={1} value={fp.quantite} onChange={(e) => updateProduitLine(index, "quantite", parseInt(e.target.value) || 1)} className="w-[60px] py-2.5 px-2 rounded-lg text-[13px] text-center outline-none" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
                <button onClick={() => removeProduitLine(index)} className="w-8 h-8 rounded-lg flex items-center justify-center btn-press" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "var(--danger)" }}>✕</button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addProduitLine} icon={<Icon d="M12 5v19M5 12h19" size={14} />}>Ajouter un produit</Button>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={saving}>{editMode ? "Modifier" : "Créer"}</Button>
        </ModalFooter>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL DÉTAILS PACK
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!showDetailModal} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} width={isMobile ? 480 : 600}>
        <ModalHeader title={detailPack?.nom || "Détails du pack"} onClose={() => { setShowDetailModal(null); setDetailPack(null); setDetailStock([]); }} />
        <ModalBody>
          {detailLoading ? (
            <div className="text-center p-10" style={{ color: "var(--text-muted)" }}>Chargement...</div>
          ) : detailPack ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="py-3 px-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Prix de vente</div>
                  <div className="text-lg font-extrabold" style={{ color: "var(--gold)" }}>{formatAr(detailPack.prix)}</div>
                </div>
                <div className="py-3 px-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Nb produits</div>
                  <div className="text-lg font-extrabold" style={{ color: "var(--info)" }}>{detailPack.produits?.length || 0}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="py-3 px-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Valeur d'achat</div>
                  <div className="text-base font-bold" style={{ color: "var(--warning)" }}>{formatAr(detailPack.valeurAchat || 0)}</div>
                </div>
                <div className="py-3 px-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Marge</div>
                  <div className="text-base font-bold" style={{ color: (detailPack.marge || 0) >= 0 ? "var(--success)" : "var(--danger)" }}>{formatAr(detailPack.marge || 0)}</div>
                </div>
              </div>
              {detailPack.description && (
                <div className="py-3 px-4 rounded-xl mb-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Description</div>
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>{detailPack.description}</div>
                </div>
              )}
              {(() => { const bg = detailPack.disponible ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)"; const border = detailPack.disponible ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"; const textColor = detailPack.disponible ? "var(--success)" : "var(--danger)"; const icon = detailPack.disponible ? "✅" : "❌"; const msg = detailPack.disponible ? "Pack disponible — Stock suffisant" : "Pack indisponible — Stock insuffisant"; return (
                <div className="py-3 px-4 rounded-lg mb-4 flex items-center gap-2" style={{ background: bg, border: `1px solid ${border}` }}>
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-semibold" style={{ color: textColor }}>{msg}</span>
                </div>
              ); })()}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(201,169,110,0.1)", color: "var(--gold)" }}>
                  <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" size={12} />
                </div>
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Composition du pack</span>
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="col-lg">Produit</TableHeader>
                    <TableHeader className="col-sm" align="center">Qté nécessaire</TableHeader>
                    <TableHeader className="col-sm" align="right">Stock actuel</TableHeader>
                    <TableHeader className="col-sm" align="center">Statut</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailStock.map((ds, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="col-lg font-semibold"><span style={{ color: "var(--text-primary)" }}>{ds.nom}</span></TableCell>
                      <TableCell className="col-sm" align="center"><span style={{ color: "var(--text-primary)" }}>{ds.quantite}</span></TableCell>
                      <TableCell className="col-sm" align="right"><span style={{ color: ds.suffisant ? "var(--text-primary)" : "var(--danger)" }}>{ds.stock}</span></TableCell>
                      <TableCell className="col-sm" align="center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: ds.suffisant ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", color: ds.suffisant ? "var(--success)" : "var(--danger)" }}>
                          {ds.suffisant ? "✅ OK" : "❌ Insuffisant"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="text-center p-10" style={{ color: "var(--text-muted)" }}>Pack introuvable</div>
          )}
        </ModalBody>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          MODAL SUPPRESSION
          ═══════════════════════════════════════════════════════ */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)}>
        <ModalHeader title="Supprimer le pack ?" onClose={() => setShowDeleteModal(null)} />
        <ModalBody>
          <p className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>Cette action est irréversible. Le pack sera supprimé définitivement.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
