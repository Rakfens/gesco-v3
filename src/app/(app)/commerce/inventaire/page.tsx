// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function InventairePage() {
  const [inventaires, setInventaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateDebut: "",
    dateFin: "",
    statut: ""
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchInventaires();
    }
  }, []);

  // Fetch inventaires based on filters
  const fetchInventaires = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('inventaires')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('date_debut', { ascending: false });

      if (filters.dateDebut) {
        query = query.gte('date_debut', filters.dateDebut);
      }
      if (filters.dateFin) {
        query = query.lte('date_fin', filters.dateFin);
      }
      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setInventaires(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des inventaires");
      setInventaires([]);
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
              Gestion des Inventaires
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
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                className="w-40"
              >
                <option value="">Tous les statuts</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
              </Select>
              <Button 
                onClick={fetchInventaires}
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
            <p className="mt-2 text-muted-foreground">Chargement des inventaires...</p>
          </div>
        ) : inventaires.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun inventaire trouvé.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell className="w-20">Date début</TableCell>
                <TableCell className="w-20">Date fin</TableCell>
                <TableCell>Produits concernés</TableCell>
                <TableCell className="w-20">Statut</TableCell>
                <TableCell className="w-24">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventaires.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.date_debut ? new Date(inv.date_debut).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell>{inv.date_fin ? new Date(inv.date_fin).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell>
                    {/* In a real app, we'd fetch inventory details to show count */}
                    Détails
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={inv.statut === 'en_cours' ? 'secondary' : 
                               inv.statut === 'termine' ? 'success' : 
                               'destructive'}
                    >
                      {inv.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle view details
                        alert(`Voir détails de l'inventaire du ${inv.date_debut}`);
                      }}
                    >
                      Voir
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle edit
                        alert(`Modifier l'inventaire du ${inv.date_debut}`);
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
