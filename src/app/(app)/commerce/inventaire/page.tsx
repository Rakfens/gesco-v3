// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty, Modal, ModalHeader, ModalBody, ModalFooter } from "@/modules/shared/components/ui";

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

  // Modal states
  const [selectedInventaire, setSelectedInventaire] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

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

  // Modal functions
  const openModal = (inv: any, mode: 'view' | 'edit') => {
    setSelectedInventaire(inv);
    setModalMode(mode);
    setEditForm({
      date_debut: inv.date_debut || '',
      date_fin: inv.date_fin || '',
      statut: inv.statut || ''
    });
  };

  const closeModal = () => {
    setSelectedInventaire(null);
    setModalMode(null);
    setEditForm({});
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedInventaire) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('inventaires')
        .update({ ...editForm })
        .eq('id', selectedInventaire.id);
      if (error) throw error;
      await fetchInventaires();
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
                      onClick={() => openModal(inv, 'view')}
                    >
                      Voir
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => openModal(inv, 'edit')}
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

      {/* Modal Voir / Modifier */}
      <Modal open={modalMode !== null} onClose={closeModal}>
        <ModalHeader>
          {modalMode === 'view' ? 'Détails de l\'inventaire' : 'Modifier l\'inventaire'}
        </ModalHeader>
        <ModalBody>
          {selectedInventaire && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date début</label>
                {modalMode === 'view' ? (
                  <p className="text-sm">
                    {selectedInventaire.date_debut
                      ? new Date(selectedInventaire.date_debut).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                ) : (
                  <Input
                    type="date"
                    value={editForm.date_debut || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, date_debut: e.target.value }))}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date fin</label>
                {modalMode === 'view' ? (
                  <p className="text-sm">
                    {selectedInventaire.date_fin
                      ? new Date(selectedInventaire.date_fin).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                ) : (
                  <Input
                    type="date"
                    value={editForm.date_fin || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, date_fin: e.target.value }))}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                {modalMode === 'view' ? (
                  <Badge
                    variant={selectedInventaire.statut === 'en_cours' ? 'secondary' :
                             selectedInventaire.statut === 'termine' ? 'success' :
                             'destructive'}
                  >
                    {selectedInventaire.statut}
                  </Badge>
                ) : (
                  <Select
                    value={editForm.statut || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, statut: e.target.value }))}
                  >
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </Select>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {modalMode === 'edit' ? (
            <>
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </>
          ) : (
            <Button onClick={closeModal}>Fermer</Button>
          )}
        </ModalFooter>
      </Modal>
    </>
  );
}

export const dynamic = "force-dynamic";
