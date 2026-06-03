// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function DepensesPage() {
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateDebut: "",
    dateFin: "",
    categorie: ""
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchDepenses();
    }
  }, []);

  // Fetch depenses based on filters
  const fetchDepenses = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('depenses')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false });

      if (filters.dateDebut) {
        query = query.gte('date', filters.dateDebut);
      }
      if (filters.dateFin) {
        query = query.lte('date', filters.dateFin);
      }
      if (filters.categorie) {
        query = query.eq('categorie', filters.categorie);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setDepenses(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des dépenses");
      setDepenses([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany, filters]);

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handle date changes
  const handleDateChange = (field: string, date: string | null) => {
    setFilters(prev => ({ ...prev, [field]: date || "" }));
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              Gestion des Dépenses
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Du:</label>
                <Input 
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => handleDateChange('dateDebut', e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Au:</label>
                <Input 
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => handleDateChange('dateFin', e.target.value)}
                  className="w-32"
                />
              </div>
              <Select 
                value={filters.categorie}
                onChange={(e) => handleFilterChange('categorie', e.target.value)}
                className="w-40"
              >
                <option value="">Toutes catégories</option>
                <option value="Électricité">Électricité</option>
                <option value="Eau">Eau</option>
                <option value="Transport">Transport</option>
                <option value="Fournitures">Fournitures</option>
                <option value="Communication">Communication</option>
                <option value="Loyer">Loyer</option>
                <option value="Marketing">Marketing</option>
                <option value="Salaires">Salaires</option>
                <option value="Entretien">Entretien</option>
                <option value="Impressions">Impressions</option>
                <option value="Autres">Autres</option>
              </Select>
              <Button 
                onClick={fetchDepenses}
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
            <p className="mt-2 text-muted-foreground">Chargement des dépenses...</p>
          </div>
        ) : depenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune dépense trouvée.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell className="w-20">Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell className="w-20">Catégorie</TableCell>
                <TableCell className="w-20">Montant</TableCell>
                <TableCell className="w-20">Mode paiement</TableCell>
                <TableCell className="w-24">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {depenses.map((dep) => (
                <TableRow key={dep.id}>
                  <TableCell>{dep.date ? new Date(dep.date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell>{dep.description ?? '-'}</TableCell>
                  <TableCell className="text-center">{dep.categorie ?? '-'}</TableCell>
                  <TableCell className="text-right">{formatAr(dep.montant)}</TableCell>
                  <TableCell className="text-center">{dep.mode_paiement ?? '-'}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle view details
                        alert(`Voir détails de la dépense ${dep.description}`);
                      }}
                    >
                      Voir
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle edit
                        alert(`Modifier la dépense ${dep.description}`);
                      }}
                    >
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
