// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function VentesPage() {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateDebut: "",
    dateFin: "",
    statut: "",
    search: ""
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchVentes();
    }
  }, []);

  // Fetch ventes based on filters
  const fetchVentes = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('ventes')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('date_vente', { ascending: false });

      if (filters.dateDebut) {
        query = query.gte('date_vente', filters.dateDebut);
      }
      if (filters.dateFin) {
        query = query.lte('date_vente', filters.dateFin);
      }
      if (filters.statut) {
        query = query.eq('statut', filters.statut);
      }
      if (filters.search) {
        query = query.or(`client_nom.ilike.%${filters.search}%,numero_facture.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setVentes(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des ventes");
      setVentes([]);
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
              Gestion des Ventes
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
                <option value="en_attente">En attente</option>
                <option value="paye">Payé</option>
                <option value="credit">Crédit</option>
                <option value="annule">Annulé</option>
              </Select>
              <Input
                type="text"
                placeholder="Rechercher client ou facture..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-48"
              />
              <Button 
                onClick={fetchVentes}
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
            <p className="mt-2 text-muted-foreground">Chargement des ventes...</p>
          </div>
        ) : ventes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucune vente trouvée.</p>
          </div>
        ) : (
          <Table className="w-full">
            <TableHead>
              <TableRow>
                <TableCell className="w-20">Facture</TableCell>
                <TableCell className="w-24">Date</TableCell>
                <TableCell>Client</TableCell>
                <TableCell className="w-20">Montant HT</TableCell>
                <TableCell className="w-20">Remise</TableCell>
                <TableCell className="w-20">Total</TableCell>
                <TableCell className="w-20">Payé</TableCell>
                <TableCell className="w-20">Statut</TableCell>
                <TableCell className="w-24">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventes.map((vente) => (
                <TableRow key={vente.id}>
                  <TableCell>{vente.numero_facture}</TableCell>
                  <TableCell>{new Date(vente.date_vente).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{vente.client_nom}</TableCell>
                  <TableCell className="text-right">{formatAr(vente.montant_ht)}</TableCell>
                  <TableCell className="text-right">{formatAr(vente.remise || 0)}</TableCell>
                  <TableCell className="text-right font-medium">{formatAr(vente.montant_total)}</TableCell>
                  <TableCell className="text-right">{formatAr(vente.montant_paye)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={vente.statut === 'paye' ? 'success' : 
                               vente.statut === 'annule' ? 'destructive' : 
                               vente.statut === 'credit' ? 'secondary' : 'default'}
                    >
                      {vente.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle view details
                        alert(`Voir détails de la vente ${vente.numero_facture}`);
                      }}
                    >
                      Voir
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Handle edit
                        alert(`Modifier la vente ${vente.numero_facture}`);
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
