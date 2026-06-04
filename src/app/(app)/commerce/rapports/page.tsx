// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

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

  // Modal states
  const [selectedRapport, setSelectedRapport] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

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

  // Modal functions
  const openModal = (rapport: any, mode: 'view' | 'edit') => {
    setSelectedRapport(rapport);
    setModalMode(mode);
    setEditForm({
      type: rapport.type || '',
      reference: rapport.reference || '',
      date: rapport.date || '',
      client: rapport.client || '',
      montant: rapport.montant || 0,
      statut: rapport.statut || ''
    });
  };

  const closeModal = () => {
    setSelectedRapport(null);
    setModalMode(null);
    setEditForm({});
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedRapport) return;
    setSaving(true);
    try {
      // Determine source table based on type
      const tableMap: Record<string, string> = { 'Vente': 'ventes', 'Achat': 'achats', 'Livraison': 'livraisons' };
      const table = tableMap[selectedRapport.type];
      if (table) {
        const { error } = await supabase.from(table).update({ statut: editForm.statut }).eq('id', selectedRapport.id);
        if (error) throw error;
      }
      await fetchRapports();
      closeModal();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
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
                    <TableCell className="w-24">Actions</TableCell>
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
                      <TableCell className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openModal(rapport, 'view')}>Voir</Button>
                        <Button variant="outline" size="sm" onClick={() => openModal(rapport, 'edit')}>Modifier</Button>
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

      {/* Modal Voir / Modifier */}
      {modalMode && selectedRapport && (
        <Modal open={true} onClose={closeModal}>
          <ModalHeader>
            {modalMode === 'view' ? 'Détails du rapport' : 'Modifier le statut'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
                <p>{selectedRapport.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Référence</label>
                <p>{selectedRapport.reference}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                <p>{selectedRapport.date ? new Date(selectedRapport.date).toLocaleDateString('fr-FR') : '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Client/Fournisseur</label>
                <p>{selectedRapport.client}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Montant</label>
                <p className="font-semibold">{formatAr(selectedRapport.montant)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Statut</label>
                {modalMode === 'view' ? (
                  <Badge variant={selectedRapport.statut === 'paye' || selectedRapport.statut === 'termine' || selectedRapport.statut === 'livre' ? 'success' : selectedRapport.statut === 'annule' ? 'destructive' : 'secondary'}>
                    {selectedRapport.statut}
                  </Badge>
                ) : (
                  <Select value={editForm.statut || ''} onChange={(e) => setEditForm((prev: any) => ({ ...prev, statut: e.target.value }))}>
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="paye">Payé</option>
                    <option value="termine">Terminé</option>
                    <option value="livre">Livré</option>
                    <option value="annule">Annulé</option>
                  </Select>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {modalMode === 'edit' ? (
              <>
                <Button variant="outline" onClick={closeModal} disabled={saving}>Annuler</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeModal}>Fermer</Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
