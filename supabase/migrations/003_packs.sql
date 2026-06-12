-- Migration: Création des tables packs et pack_produits
-- À exécuter dans l'éditeur SQL de Supabase

-- Table packs
CREATE TABLE IF NOT EXISTS packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  prix NUMERIC(12, 2) NOT NULL DEFAULT 0,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pack_produits (liaison pack → produits avec quantités)
-- Note: produit_id est bigint pour correspondre à la table produits
CREATE TABLE IF NOT EXISTS pack_produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  produit_id BIGINT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL DEFAULT 1,
  UNIQUE(pack_id, produit_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_packs_company ON packs(company_id);
CREATE INDEX IF NOT EXISTS idx_pack_produits_pack ON pack_produits(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_produits_produit ON pack_produits(produit_id);

-- RLS (Row Level Security)
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_produits ENABLE ROW LEVEL SECURITY;

-- Policies packs
CREATE POLICY "Users can view their company packs" ON packs
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert packs for their company" ON packs
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their company packs" ON packs
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their company packs" ON packs
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Policies pack_produits
CREATE POLICY "Users can view their pack produits" ON pack_produits
  FOR SELECT USING (pack_id IN (
    SELECT id FROM packs WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert pack produits" ON pack_produits
  FOR INSERT WITH CHECK (pack_id IN (
    SELECT id FROM packs WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update their pack produits" ON pack_produits
  FOR UPDATE USING (pack_id IN (
    SELECT id FROM packs WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete their pack produits" ON pack_produits
  FOR DELETE USING (pack_id IN (
    SELECT id FROM packs WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));
