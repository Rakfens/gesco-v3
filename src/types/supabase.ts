// src/types/supabase.ts
// ============================================================
// GesCo — Types de base de données Supabase
// ============================================================
// Généré manuellement.
// TODO : remplacer par `supabase gen types typescript`
// une fois que le CLI Supabase est configuré localement.
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          nom: string;
          salaire: number;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          nom: string;
          salaire?: number;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          nom?: string;
          salaire?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      avances: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          agent_id: number;
          agent_nom: string | null;
          montant: number;
          motif: string | null;
          date: string;
          mois: string;
          annule: boolean;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          agent_id: number;
          agent_nom?: string | null;
          montant: number;
          motif?: string | null;
          date: string;
          mois: string;
          annule?: boolean;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          agent_id?: number;
          agent_nom?: string | null;
          montant?: number;
          motif?: string | null;
          date?: string;
          mois?: string;
          annule?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "avances_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avances_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      companies: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          slug: string;
          type: string;
          logo_url: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          name: string;
          slug: string;
          type: string;
          logo_url?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          name?: string;
          slug?: string;
          type?: string;
          logo_url?: string | null;
        };
        Relationships: [];
      };
      config: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          cle: string;
          valeur: string;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          cle: string;
          valeur: string;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          cle?: string;
          valeur?: string;
        };
        Relationships: [
          {
            foreignKeyName: "config_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      livraisons: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          company_id: number;
          colis: string;
          client_donneur: string;
          destinataire: string;
          destinataire_telephone: string | null;
          destinataire_lieu: string | null;
          agent_id: number | null;
          agent_nom: string | null;
          montant: number;
          frais: number;
          paiement: string;
          date: string;
          statut: string;
          remarque: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id: number;
          colis: string;
          client_donneur: string;
          destinataire: string;
          destinataire_telephone?: string | null;
          destinataire_lieu?: string | null;
          agent_id?: number | null;
          agent_nom?: string | null;
          montant: number;
          frais?: number;
          paiement?: string;
          date: string;
          statut?: string;
          remarque?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id?: number;
          colis?: string;
          client_donneur?: string;
          destinataire?: string;
          destinataire_telephone?: string | null;
          destinataire_lieu?: string | null;
          agent_id?: number | null;
          agent_nom?: string | null;
          montant?: number;
          frais?: number;
          paiement?: string;
          date?: string;
          statut?: string;
          remarque?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "livraisons_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "livraisons_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      recuperations: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          date: string;
          livreur_id: number | null;
          livreur_nom: string | null;
          client_donneur: string;
          frais_recuperation: number;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          date: string;
          livreur_id?: number | null;
          livreur_nom?: string | null;
          client_donneur: string;
          frais_recuperation?: number;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          date?: string;
          livreur_id?: number | null;
          livreur_nom?: string | null;
          client_donneur?: string;
          frais_recuperation?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recuperations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      produits: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          company_id: number;
          nom: string;
          reference: string | null;
          categorie: string | null;
          unite: string | null;
          prix_vente: number;
          prix_achat: number;
          quantite_stock: number;
          stock_minimum: number;
          is_active: boolean;
        };
        Insert: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id: number;
          nom: string;
          reference?: string | null;
          categorie?: string | null;
          unite?: string | null;
          prix_vente: number;
          prix_achat: number;
          quantite_stock?: number;
          stock_minimum?: number;
          is_active?: boolean;
        };
        Update: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id?: number;
          nom?: string;
          reference?: string | null;
          categorie?: string | null;
          unite?: string | null;
          prix_vente?: number;
          prix_achat?: number;
          quantite_stock?: number;
          stock_minimum?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "produits_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      ventes: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          company_id: number;
          numero_facture: string;
          date_vente: string;
          client_nom: string;
          client_telephone: string | null;
          client_email: string | null;
          montant_ht: number;
          remise: number;
          montant_total: number;
          montant_paye: number;
          reste_a_payer: number;
          statut: string;
          type_paiement: string;
          notes: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id: number;
          numero_facture: string;
          date_vente: string;
          client_nom: string;
          client_telephone?: string | null;
          client_email?: string | null;
          montant_ht: number;
          remise?: number;
          montant_total: number;
          montant_paye?: number;
          reste_a_payer?: number;
          statut?: string;
          type_paiement: string;
          notes?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id?: number;
          numero_facture?: string;
          date_vente?: string;
          client_nom?: string;
          client_telephone?: string | null;
          client_email?: string | null;
          montant_ht?: number;
          remise?: number;
          montant_total?: number;
          montant_paye?: number;
          reste_a_payer?: number;
          statut?: string;
          type_paiement?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ventes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      vente_details: {
        Row: {
          id: number;
          vente_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          remise_ligne: number;
          sous_total: number;
        };
        Insert: {
          id?: number;
          vente_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          remise_ligne?: number;
          sous_total: number;
        };
        Update: {
          id?: number;
          vente_id?: number;
          produit_id?: number;
          quantite?: number;
          prix_unitaire?: number;
          remise_ligne?: number;
          sous_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vente_details_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vente_details_vente_id_fkey";
            columns: ["vente_id"];
            isOneToOne: false;
            referencedRelation: "ventes";
            referencedColumns: ["id"];
          }
        ];
      };
      achats: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          company_id: number;
          numero_commande: string;
          date_achat: string;
          fournisseur_nom: string;
          fournisseur_contact: string | null;
          montant_ht: number;
          tva: number;
          montant_total: number;
          montant_paye: number;
          statut: string;
          notes: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id: number;
          numero_commande: string;
          date_achat: string;
          fournisseur_nom: string;
          fournisseur_contact?: string | null;
          montant_ht: number;
          tva?: number;
          montant_total: number;
          montant_paye?: number;
          statut?: string;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          updated_at?: string;
          company_id?: number;
          numero_commande?: string;
          date_achat?: string;
          fournisseur_nom?: string;
          fournisseur_contact?: string | null;
          montant_ht?: number;
          tva?: number;
          montant_total?: number;
          montant_paye?: number;
          statut?: string;
          notes?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "achats_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      achat_details: {
        Row: {
          id: number;
          achat_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          sous_total: number;
        };
        Insert: {
          id?: number;
          achat_id: number;
          produit_id: number;
          quantite: number;
          prix_unitaire: number;
          sous_total: number;
        };
        Update: {
          id?: number;
          achat_id?: number;
          produit_id?: number;
          quantite?: number;
          prix_unitaire?: number;
          sous_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "achat_details_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achat_details_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          }
        ];
      };
      mouvements_stock: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          produit_id: number;
          type: string;
          quantite: number;
          prix_unitaire: number | null;
          montant_total: number | null;
          reference_type: string | null;
          reference_id: number | null;
          notes: string | null;
          date_mouvement: string;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          produit_id: number;
          type: string;
          quantite: number;
          prix_unitaire?: number | null;
          montant_total?: number | null;
          reference_type?: string | null;
          reference_id?: number | null;
          notes?: string | null;
          date_mouvement: string;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          produit_id?: number;
          type?: string;
          quantite?: number;
          prix_unitaire?: number | null;
          montant_total?: number | null;
          reference_type?: string | null;
          reference_id?: number | null;
          notes?: string | null;
          date_mouvement?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          }
        ];
      };
      inventaires: {
        Row: {
          id: number;
          created_at: string;
          company_id: number;
          date_debut: string;
          date_fin: string | null;
          statut: string;
          notes: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          company_id: number;
          date_debut: string;
          date_fin?: string | null;
          statut?: string;
          notes?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          company_id?: number;
          date_debut?: string;
          date_fin?: string | null;
          statut?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventaires_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      inventaire_details: {
        Row: {
          id: number;
          inventaire_id: number;
          produit_id: number;
          quantite_theorique: number;
          quantite_reelle: number;
          ecart: number;
          statut: string;
          notes: string | null;
        };
        Insert: {
          id?: number;
          inventaire_id: number;
          produit_id: number;
          quantite_theorique: number;
          quantite_reelle: number;
          ecart: number;
          statut: string;
          notes?: string | null;
        };
        Update: {
          id?: number;
          inventaire_id?: number;
          produit_id?: number;
          quantite_theorique?: number;
          quantite_reelle?: number;
          ecart?: number;
          statut?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventaire_details_inventaire_id_fkey";
            columns: ["inventaire_id"];
            isOneToOne: false;
            referencedRelation: "inventaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventaire_details_produit_id_fkey";
            columns: ["produit_id"];
            isOneToOne: false;
            referencedRelation: "produits";
            referencedColumns: ["id"];
          }
        ];
      };
      user_companies: {
        Row: {
          user_id: string;
          company_id: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          company_id: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ─── Helpers de type ──────────────────────────────────────────────────

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

// Exemples d'utilisation :
// type Agent = Tables<"agents">;
// type NewAgent = Inserts<"agents">;
// type AgentUpdate = Updates<"agents">;
