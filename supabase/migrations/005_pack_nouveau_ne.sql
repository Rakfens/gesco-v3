-- Insertion du pack Nouveau-né pour la société Zazatiana
-- Note : company_id = celui de Zazatiana à remplacer

-- 1. Créer le pack
INSERT INTO packs (nom, description, prix, company_id)
VALUES (
  'Pack Nouveau-né',
  'Pack complet nouveau-né (19 articles)',
  300000,
  (SELECT id FROM companies WHERE slug = 'zazatiana' LIMIT 1)
);

-- 2. Ajouter les produits du pack
INSERT INTO pack_produits (pack_id, produit_id, quantite) VALUES
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 60, 1),   -- LAMBAN-JAZA POLAIRE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 22, 1),   -- BRASSIERE CULOTTE (2P MANIFY)
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 23, 1),   -- BRASSIERE 3P MANIFY
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 33, 1),   -- PELUCHE 6 PIECE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 12, 1),   -- COUCHE 6 PIECES
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 85, 1),   -- LANGE CARRE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 41, 1),   -- CHAUSSETTE 3D
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 109, 1),  -- MOUFFLE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 57, 1),   -- BANDE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 69, 1),   -- BODOFOTSY SIMPLE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 81, 1),   -- SORTIE DE BAIN
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 73, 1),   -- BAVOIR IMPORTE DETAIL
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 63, 1),   -- BIBERON EN VERRE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 42, 1),   -- BA KIRARO IMPORTE (chaussette importé)
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 1, 1),    -- NOUNOURS (ensemble polaire)
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 48, 1),   -- BONNET MANIFY
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 9, 1),    -- DOUDOUNE TSARA
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 31, 1),   -- LAFIKA IMPORTE (DODO BE)
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 82, 1),   -- PORTE BEBE SIMPLE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 75, 1),   -- MOUSTIQUAIRE SIMPLE
  ((SELECT id FROM packs WHERE nom = 'Pack Nouveau-né' LIMIT 1), 7, 1);    -- ENSEMBLE 5 PIECES
