// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function RapportsPage() {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: "ventes",
    dateDebut: "",
    dateFin: ""
  });
  const [currentCompany, setCurrentCompany] = useState<any>(null);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchRapports();
    }
  }, []);

  // Fetch rapports based on filters
  const fetchRapports = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data = [];
      if (filters.type === "ventes") {
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

        const { data: ventesData, error } = await query;
        if (error) throw error;
        data = ventesData.map(v => ({
          id: v.id,
          type: "Vente",
          reference: v.numero_facture,
          date: v.date_vente,
          client: v.client_nom,
          montant: v.montant_total,
          statut: v.statut
        }));
      } else if (filters.type === "achats") {
        let query = supabase
          .from('achats')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('date_achat', { ascending: false });

        if (filters.dateDebut) {
          query = query.gte('date_achat', filters.dateDebut);
        }
        if (filters.dateFin) {
          query = query.lte('date_achat', filters.dateFin);
        }

        const { data: achatsData, error } = await query;
        if (error) throw error;
        data = achatsData.map(a => ({
          id: a.id,
          type: "Achat",
          reference: a.numero_commande,
          date: a.date_achat,
          client: a.fournisseur_nom,
          montant: a.montant_total,
          statut: a.statut
        }));
      } else if (filters.type === "livraisons") {
        let query = supabase
          .from('livraisons')
          .select('*')
          .eq('company_id', currentCompany.id)
          .order('date', { ascending: false });

        if (filters.dateDebut) {
          query = query.gte('date', filters.dateDebut);
        }
        if (filters.dateFin) {
          query = query.lte('date', filters.dateFin);
        }

        const { data: livraisonsData, error } = await query;
        if (error) throw error;
        data = livraisonsData.map(l => ({
          id: l.id,
          type: "Livraison",
          reference: l.colis,
          date: l.date,
          client: l.destinataire,
          montant: l.montant,
          statut: l.statut
        }));
      }

      setRapports(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des rapports");
      setRapports([]);
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
              Rapports et Statistiques
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select 
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-36"
              >
                <option value="ventes">Ventes</option>
                <option value="achats">Achats</option>
                <option value="livraisons">Livraisons</option>
              </Select>
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
              <Button 
                onClick={fetchRapports}
                className="ml-auto"
              >
                Générer
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
            <p className="mt-2 text-muted-foreground">Génération des rapports...</p>
          </div>
        ) : rapports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun rapport trouvé pour les critères sélectionnés.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHead>
                  <TableRow>
                    <TableCell className="w-20">Type</TableCell>
                    <TableCell className="w-20">Référence</TableCell>
                    <TableCell className="w-20">Date</TableCell>
                    <TableCell>Client/Fournisseur</TableCell>
                    <TableCell className="w-20">Montant</TableCell>
                    <TableCell className="w-20">Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rapports.map((rapport) => (
                    <TableRow key={rapport.id}>
                      <TableCell>{rapport.type}</TableCell>
                      <TableCell>{rapport.reference}</TableCell>
                      <TableCell>{rapport.date ? new Date(rapport.date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell>{rapport.client}</TableCell>
                      <TableCell className="text-right font-medium">{formatAr(rapport.montant)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={rapport.statut === 'paye' || rapport.statut === 'termine' || rapport.statut === 'livre' ? 'success' : 
                                   rapport.statut === 'annule' || rapport.statut === 'non_paye' ? 'destructive' : 'secondary'}
                        >
                          {rapport.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Ventes</p>
                    <p className="text-2xl font-bold">{formatAr(rapports.filter(r => r.type === "Vente").reduce((sum, r) => sum + (r.montant || 0), 0))}</p>
                  </div>
                  <div className="text-primary h-10 w-10">
                    {/* Icon could go here */}
                    #</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Achats</p>
                    <p className="text-2xl font-bold">{formatAr(rapports.filter(r => r.type === "Achat").reduce((sum, r) => sum + (r.montant || 0), 0))}</p>
                  </div>
                  <div className="text-success h-10 w-10">
                    #</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Livraisons</p>
                    <p className="text-2xl font-bold">{formatAr(rapports.filter(r => r.type === "Livraison").reduce((sum, r) => sum + (r.montant || 0), 0))}</p>
                  </div>
                  <div className="text-accent h-10 w-10">
                    #</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nombre de rapports</p>
                    <p className="text-2xl font-bold">{rapports.length}</p>
                  </div>
                  <div className="text-muted h-10 w-10">
                    #</div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
