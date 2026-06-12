-- Insertion du pack Mahampy pour la société Zazatiana
-- Prix du pack : 120.000 Ar
-- Note : company_id à adapter selon votre société Zazatiana

-- 1. Créer le pack (company_id = celui de Zazatiana à remplacer)
INSERT INTO packs (nom, description, prix, company_id)
VALUES (
  'Pack Mahampy',
  'Pack complet ensemble nounours + accessoires bébé (10 articles)',
  120000,
  (SELECT id FROM companies WHERE slug = 'zazatiana' LIMIT 1)
)
RETURNING id;

-- 2. Ajouter les produits du pack (le pack_id sera celui retourné ci-dessus)
-- Note : Adapter le pack_id selon le résultat de la requête ci-dessus
INSERT INTO pack_produits (pack_id, produit_id, quantite) VALUES
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 1, 1),   -- NOUNOURS
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 41, 1),  -- CHAUSSETTE 3D
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 69, 1),  -- BODOFOTSY SIMPLE
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 12, 1),  -- COUCHE 6 PIECES
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 60, 1),  -- LAMBAN-JAZA POLAIRE
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 57, 1),  -- BANDE
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 18, 1),  -- BRASSIERE ENSEMBLE 2P MATEVINA
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 23, 1),  -- BRASSIERE 3P MANIFY
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 81, 1),  -- SORTIE DE BAIN
  ((SELECT id FROM packs WHERE nom = 'Pack Mahampy' LIMIT 1), 2, 1);   -- DOUDOUNE
