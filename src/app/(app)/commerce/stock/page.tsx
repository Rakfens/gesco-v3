// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function StockPage() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    categorie: "",
    search: "",
    stockBas: false
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchProduits();
    }
  }, []);

  // Fetch produits based on filters
  const fetchProduits = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('produits')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nom');

      if (filters.categorie) {
        query = query.eq('categorie', filters.categorie);
      }
      if (filters.search) {
        query = query.or(`nom.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
      }
      if (filters.stockBas) {
        // This is a client-side filter, we'll fetch all and filter
        // For now, we'll fetch all and note that stockBas is a client-side filter
      }

      const { data, error } = await query;
      
      if (error) throw error;
      let produits = data || [];
      
      // Apply stockBas filter client-side
      if (filters.stockBas) {
        produits = produits.filter(p => p.quantite_stock <= p.stock_minimum);
      }
      
      setProduits(produits);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des produits");
      setProduits([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany, filters]);

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handle checkbox change
  const handleStockBasChange = (checked: boolean) => {
    setFilters(prev => ({ ...prev, stockBas: checked }));
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              Gestion du Stock
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select 
                value={filters.categorie}
                onChange={(e) => handleFilterChange('categorie', e.target.value)}
                className="w-40"
              >
                <option value="">Toutes catégories</option>
                <option value="Téléphones">Téléphones</option>
                <option value="Accessoires téléphones">Accessoires téléphones</option>
                <option value="Vêtements bébé">Vêtements bébé</option>
                <option value="Jouets bébé">Jouets bébé</option>
                <option value="Puériculture">Puériculture</option>
                <option value="Alimentation bébé">Alimentation bébé</option>
                <option value="Autres">Autres</option>
              </Select>
              <Input
                type="text"
                placeholder="Rechercher produit ou référence..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-48"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={filters.stockBas}
                    onChange={(e) => handleStockBasChange(e.target.checked)}
                  />
                  Stock bas (≤ seuil)
                </label>
              </div>
              <Button 
                onClick={fetchProduits}
                className="ml-auto"
              >
                Filtrer
              </Button>
            </div>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
            <p className="mt-2 text-muted-foreground">Chargement du stock...</p>
          </div>
        ) : produits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun produit trouvé.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell className="w-20">Catégorie</TableCell>
                <TableCell className="w-16">Unité</TableCell>
                <TableCell className="w-20">Prix achat</TableCell>
                <TableCell className="w-20">Prix vente</TableCell>
                <TableCell className="w-20">Stock</TableCell>
                <TableCell className="w-20">Seuil</TableCell>
                <TableCell className="w-20">État stock</TableCell>
                <TableCell className="w-24">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {produits.map((produit) => {
                const stockStatus = produit.quantite_stock <= produit.stock_minimum ? 
                  "Bas" : 
                  produit.quantite_stock === 0 ? 
                    "Épuisé" : 
                    "OK";
                const stockVariant = produit.quantite_stock <= produit.stock_minimum ? 
                  "destructive" : 
                  produit.quantite_stock === 0 ? 
                    "destructive" : 
                    "success";
                return (
                  <TableRow key={produit.id}>
                    <TableCell>{produit.reference ?? "-"}</TableCell>
                    <TableCell>{produit.nom}</TableCell>
                    <TableCell className="text-center">{produit.categorie ?? "-"}</TableCell>
                    <TableCell className="text-center">{produit.unite ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatAr(produit.prix_achat)}</TableCell>
                    <TableCell className="text-right">{formatAr(produit.prix_vente)}</TableCell>
                    <TableCell className="text-center font-medium">{produit.quantite_stock}</TableCell>
                    <TableCell className="text-center">{produit.stock_minimum}</TableCell>
                    <TableCell>
                      <Badge variant={stockVariant}>
                        {stockStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Handle view details
                          alert(`Voir détails du produit ${produit.nom}`);
                        }}
                      >
                        Voir
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Handle edit
                          alert(`Modifier le produit ${produit.nom}`);
                        }}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
