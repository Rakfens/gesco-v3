-- ============================================================
-- GesCo-v3 — Schema Supabase (Commerce uniquement)
-- À exécuter dans l'éditeur SQL du nouveau projet Supabase
-- ============================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLE PRINCIPALE : companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'commerce',
  logo_url TEXT
);

-- ============================================================
-- 2. TABLE user_companies (liaison users ↔ companies)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_companies (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

-- ============================================================
-- 3. TABLE produits
-- ============================================================
CREATE TABLE IF NOT EXISTS produits (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  reference TEXT,
  categorie TEXT,
  unite TEXT,
  prix_vente NUMERIC(12,2) NOT NULL DEFAULT 0,
  prix_achat NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantite_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_minimum NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_produits_company ON produits(company_id);

-- ============================================================
-- 4. TABLE ventes
-- ============================================================
CREATE TABLE IF NOT EXISTS ventes (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero_facture TEXT NOT NULL,
  date_vente DATE NOT NULL DEFAULT CURRENT_DATE,
  client_nom TEXT NOT NULL DEFAULT '',
  client_telephone TEXT,
  client_email TEXT,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  remise NUMERIC(12,2) DEFAULT 0,
  montant_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) DEFAULT 0,
  reste_a_payer NUMERIC(12,2) DEFAULT 0,
  statut TEXT DEFAULT 'en_cours',
  type_paiement TEXT NOT NULL DEFAULT 'cash',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ventes_company ON ventes(company_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(date_vente);

-- ============================================================
-- 5. TABLE vente_details
-- ============================================================
CREATE TABLE IF NOT EXISTS vente_details (
  id BIGSERIAL PRIMARY KEY,
  vente_id BIGINT NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite NUMERIC(12,2) NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0,
  remise_ligne NUMERIC(12,2) DEFAULT 0,
  sous_total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vente_details_vente ON vente_details(vente_id);
CREATE INDEX IF NOT EXISTS idx_vente_details_produit ON vente_details(produit_id);

-- ============================================================
-- 6. TABLE achats
-- ============================================================
CREATE TABLE IF NOT EXISTS achats (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero_commande TEXT NOT NULL,
  date_achat DATE NOT NULL DEFAULT CURRENT_DATE,
  fournisseur_nom TEXT NOT NULL DEFAULT '',
  fournisseur_contact TEXT,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) DEFAULT 0,
  montant_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye NUMERIC(12,2) DEFAULT 0,
  statut TEXT DEFAULT 'en_cours',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_achats_company ON achats(company_id);
CREATE INDEX IF NOT EXISTS idx_achats_date ON achats(date_achat);

-- ============================================================
-- 7. TABLE achat_details
-- ============================================================
CREATE TABLE IF NOT EXISTS achat_details (
  id BIGSERIAL PRIMARY KEY,
  achat_id BIGINT NOT NULL REFERENCES achats(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite NUMERIC(12,2) NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0,
  sous_total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_achat_details_achat ON achat_details(achat_id);
CREATE INDEX IF NOT EXISTS idx_achat_details_produit ON achat_details(produit_id);

-- ============================================================
-- 8. TABLE mouvements_stock
-- ============================================================
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantite NUMERIC(12,2) NOT NULL DEFAULT 0,
  prix_unitaire NUMERIC(12,2),
  montant_total NUMERIC(12,2),
  reference_type TEXT,
  reference_id BIGINT,
  notes TEXT,
  date_mouvement DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_mouvements_stock_company ON mouvements_stock(company_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_stock_produit ON mouvements_stock(produit_id);

-- ============================================================
-- 9. TABLE packs
-- ============================================================
CREATE TABLE IF NOT EXISTS packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  prix NUMERIC(12,2) NOT NULL DEFAULT 0,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_company ON packs(company_id);

-- ============================================================
-- 10. TABLE pack_produits
-- ============================================================
CREATE TABLE IF NOT EXISTS pack_produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 1,
  UNIQUE(pack_id, produit_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_produits_pack ON pack_produits(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_produits_produit ON pack_produits(produit_id);

-- ============================================================
-- 11. TABLE depenses
-- ============================================================
CREATE TABLE IF NOT EXISTS depenses (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  categorie TEXT NOT NULL DEFAULT 'autre',
  description TEXT NOT NULL DEFAULT '',
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_depenses_company ON depenses(company_id);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date_depense);

-- ============================================================
-- 12. TABLE config
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cle TEXT NOT NULL,
  valeur TEXT NOT NULL DEFAULT '',
  UNIQUE(company_id, cle)
);

CREATE INDEX IF NOT EXISTS idx_config_company ON config(company_id);

-- ============================================================
-- 13. TABLE inventaires
-- ============================================================
CREATE TABLE IF NOT EXISTS inventaires (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'en_cours',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventaires_company ON inventaires(company_id);

-- ============================================================
-- 14. TABLE inventaire_details
-- ============================================================
CREATE TABLE IF NOT EXISTS inventaire_details (
  id BIGSERIAL PRIMARY KEY,
  inventaire_id BIGINT NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite_theorique NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantite_reelle NUMERIC(12,2) NOT NULL DEFAULT 0,
  ecart NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT DEFAULT 'ok',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventaire_details_inventaire ON inventaire_details(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_inventaire_details_produit ON inventaire_details(produit_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vente_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achat_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventaire_details ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES : companies
-- ============================================================
CREATE POLICY "Users can view their companies" ON companies
  FOR SELECT USING (id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert companies" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their companies" ON companies
  FOR UPDATE USING (id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : user_companies
-- ============================================================
CREATE POLICY "Users can view their user_companies" ON user_companies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert user_companies" ON user_companies
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- POLICIES : produits
-- ============================================================
CREATE POLICY "Users can view their company produits" ON produits
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert produits for their company" ON produits
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company produits" ON produits
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company produits" ON produits
  FOR DELETE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : ventes
-- ============================================================
CREATE POLICY "Users can view their company ventes" ON ventes
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert ventes for their company" ON ventes
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company ventes" ON ventes
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company ventes" ON ventes
  FOR DELETE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : vente_details
-- ============================================================
CREATE POLICY "Users can view their company vente_details" ON vente_details
  FOR SELECT USING (vente_id IN (SELECT id FROM ventes WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert vente_details for their company" ON vente_details
  FOR INSERT WITH CHECK (vente_id IN (SELECT id FROM ventes WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their company vente_details" ON vente_details
  FOR UPDATE USING (vente_id IN (SELECT id FROM ventes WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete their company vente_details" ON vente_details
  FOR DELETE USING (vente_id IN (SELECT id FROM ventes WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- ============================================================
-- POLICIES : achats
-- ============================================================
CREATE POLICY "Users can view their company achats" ON achats
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert achats for their company" ON achats
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company achats" ON achats
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company achats" ON achats
  FOR DELETE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : achat_details
-- ============================================================
CREATE POLICY "Users can view their company achat_details" ON achat_details
  FOR SELECT USING (achat_id IN (SELECT id FROM achats WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert achat_details for their company" ON achat_details
  FOR INSERT WITH CHECK (achat_id IN (SELECT id FROM achats WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their company achat_details" ON achat_details
  FOR UPDATE USING (achat_id IN (SELECT id FROM achats WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete their company achat_details" ON achat_details
  FOR DELETE USING (achat_id IN (SELECT id FROM achats WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- ============================================================
-- POLICIES : mouvements_stock
-- ============================================================
CREATE POLICY "Users can view their company mouvements_stock" ON mouvements_stock
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert mouvements_stock for their company" ON mouvements_stock
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company mouvements_stock" ON mouvements_stock
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : packs
-- ============================================================
CREATE POLICY "Users can view their company packs" ON packs
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert packs for their company" ON packs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company packs" ON packs
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company packs" ON packs
  FOR DELETE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : pack_produits
-- ============================================================
CREATE POLICY "Users can view their pack_produits" ON pack_produits
  FOR SELECT USING (pack_id IN (SELECT id FROM packs WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert pack_produits for their company" ON pack_produits
  FOR INSERT WITH CHECK (pack_id IN (SELECT id FROM packs WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their pack_produits" ON pack_produits
  FOR UPDATE USING (pack_id IN (SELECT id FROM packs WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete their pack_produits" ON pack_produits
  FOR DELETE USING (pack_id IN (SELECT id FROM packs WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- ============================================================
-- POLICIES : depenses
-- ============================================================
CREATE POLICY "Users can view their company depenses" ON depenses
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert depenses for their company" ON depenses
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company depenses" ON depenses
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company depenses" ON depenses
  FOR DELETE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : config
-- ============================================================
CREATE POLICY "Users can view their company config" ON config
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert config for their company" ON config
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company config" ON config
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : inventaires
-- ============================================================
CREATE POLICY "Users can view their company inventaires" ON inventaires
  FOR SELECT USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert inventaires for their company" ON inventaires
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company inventaires" ON inventaires
  FOR UPDATE USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- ============================================================
-- POLICIES : inventaire_details
-- ============================================================
CREATE POLICY "Users can view their company inventaire_details" ON inventaire_details
  FOR SELECT USING (inventaire_id IN (SELECT id FROM inventaires WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert inventaire_details for their company" ON inventaire_details
  FOR INSERT WITH CHECK (inventaire_id IN (SELECT id FROM inventaires WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their company inventaire_details" ON inventaire_details
  FOR UPDATE USING (inventaire_id IN (SELECT id FROM inventaires WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- ============================================================
-- DONNÉES INITIALES : Companies par défaut
-- ============================================================
INSERT INTO companies (name, slug, type) VALUES
  ('Service', 'service', 'service'),
  ('Pomanay', 'pomanay', 'commerce'),
  ('Zazatiana', 'zazatiana', 'commerce')
ON CONFLICT (slug) DO NOTHING;
