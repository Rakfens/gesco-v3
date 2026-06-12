// src/modules/shared/types/index.ts — Types partagés de l'application (source unique)

export interface Company {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  nom: string;
  salaire: number;
  company_id: string;
  created_at?: string;
}

export interface Avance {
  id: string;
  agent_id?: string;
  agent_nom?: string;
  montant: number;
  motif?: string;
  date: string;
  mois?: string;
  annule?: boolean;
  statut?: string;
  company_id: string;
}

export interface Livraison {
  id: string;
  colis: string;
  client_donneur: string;
  destinataire: string;
  destinataire_telephone?: string;
  destinataire_lieu?: string;
  agent_id?: string;
  agent_nom?: string;
  montant?: number;
  frais?: number;
  paiement?: string;
  date: string;
  statut?: string;
  remarque?: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recuperation {
  id: string;
  date: string;
  livreur_id?: string;
  livreur_nom: string;
  client_donneur: string;
  frais_recuperation?: number;
  company_id: string;
}

export interface Produit {
  id: string;
  nom: string;
  reference?: string;
  prix_achat?: number;
  prix_vente?: number;
  quantite_stock?: number;
  stock_minimum?: number;
  categorie?: string;
  unite?: string;
  is_active?: boolean;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vente {
  id: string;
  numero_facture?: string;
  client_nom?: string;
  client_telephone?: string;
  client_email?: string;
  montant_ht?: number;
  remise?: number;
  montant_total?: number;
  montant_paye?: number;
  reste_a_payer?: number;
  statut?: string;
  type_paiement?: string;
  notes?: string;
  date_vente?: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface VenteDetail {
  id?: string;
  vente_id?: string;
  produit_id?: string;
  quantite: number;
  prix_unitaire: number;
  remise_ligne?: number;
  sous_total: number;
  produit?: Produit;
}

export interface Achat {
  id: string;
  numero_commande?: string;
  fournisseur_nom?: string;
  fournisseur_contact?: string;
  montant_ht?: number;
  tva?: number;
  montant_total?: number;
  montant_paye?: number;
  statut?: string;
  notes?: string;
  date_achat?: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
  details?: Array<{
    produit_id?: string;
    quantite?: number;
    prix_unitaire?: number;
    sous_total?: number;
    produit?: { nom?: string };
  }>;
}

export interface AchatDetail {
  id?: string;
  achat_id?: string;
  produit_id?: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
}

export interface Depense {
  id: string;
  montant: number;
  categorie?: string;
  description?: string;
  motif?: string;
  date?: string;
  date_depense?: string;
  company_id: string;
  created_at?: string;
}

export interface MouvementStock {
  id?: string;
  produit_id: string;
  type: "entree" | "sortie" | "achat" | "vente" | "inventaire" | "ajustement";
  quantite: number;
  prix_unitaire?: number;
  montant_total?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  date_mouvement?: string;
  company_id: string;
  created_at?: string;
}

export interface Inventaire {
  id: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  notes?: string;
  company_id: string;
  created_at?: string;
}

export interface InventaireDetail {
  id?: string;
  inventaire_id?: string;
  produit_id?: string;
  quantite_theorique?: number;
  quantite_reelle?: number;
  ecart?: number;
  statut?: string;
  notes?: string;
}

// ── PACKS ──────────────────────────────────────────────────────────────

export interface PackProduit {
  id?: string;
  pack_id: string;
  produit_id: string;
  quantite: number;
  produit?: Produit;
}

export interface Pack {
  id: string;
  nom: string;
  description?: string;
  prix: number;
  company_id: string;
  created_at?: string;
  updated_at?: string;
  produits?: PackProduit[];
}
