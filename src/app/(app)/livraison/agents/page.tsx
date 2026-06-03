// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentCompany } from "@/lib/supabase";
import { formatAr } from "@/modules/shared/utils/constants";
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Table, TableHead, TableBody, TableRow, TableCell, TableEmpty } from "@/modules/shared/components/ui";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({ nom: "", salaire: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch current company on mount
  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      setCurrentCompany(company);
      fetchAgents();
    }
  }, []);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nom');
      
      if (error) throw error;
      setAgents(data || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des agents");
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany]);

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.salaire) {
      setError("Nom et salaire sont requis");
      return;
    }
    
    try {
      if (isEditing && editingId) {
        // Update agent
        const { error } = await supabase
          .from('agents')
          .update({ 
            nom: formData.nom,
            salaire: parseFloat(formData.salaire)
          })
          .eq('id', editingId)
          .eq('company_id', currentCompany?.id);
        
        if (error) throw error;
      } else {
        // Add agent
        const { error } = await supabase
          .from('agents')
          .insert({ 
            nom: formData.nom,
            salaire: parseFloat(formData.salaire),
            company_id: currentCompany?.id
          });
        
        if (error) throw error;
      }
      
      // Reset form
      setFormData({ nom: "", salaire: "" });
      setIsEditing(false);
      setEditingId(null);
      setShowModal(false);
      
      // Refresh list
      fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cet agent ? Cette action est irréversible.")) return;
    
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompany?.id);
      
      if (error) throw error;
      
      fetchAgents();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  // Handle edit
  const handleEdit = (agent: any) => {
    setFormData({ nom: agent.nom, salaire: agent.salaire.toString() });
    setIsEditing(true);
    setEditingId(agent.id);
    setShowModal(true);
  };

  return (
    <>
      <div className="mb-6">
        <Card className="p-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold">
              Gestion des Agents
            </CardTitle>
            <Button 
              onClick={() => {
                setFormData({ nom: "", salaire: "" });
                setIsEditing(false);
                setEditingId(null);
                setShowModal(true);
              }}
              className="ml-auto"
            >
              + Nouvel Agent
            </Button>
          </CardHeader>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalHeader>
          <ModalTitle>{isEditing ? "Modifier l'agent" : "Nouvel Agent"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Nom</label>
                <Input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleFormChange('nom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Salaire (MGA)</label>
                <Input
                  type="number"
                  value={formData.salaire}
                  onChange={(e) => handleFormChange('salaire', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button 
                type="button"
                onClick={() => {
                  setFormData({ nom: "", salaire: "" });
                  setIsEditing(false);
                  setEditingId(null);
                  setShowModal(false);
                }}
                variant="outline"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={loading}
              >
                {isEditing ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </ModalBody>
      </Modal>

      <div className="mt-6">
        <Card className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
              <p className="mt-2 text-muted-foreground">Chargement des agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun agent trouvé.</p>
            </div>
          ) : (
            <Table className="w-full">
              <TableHead>
                <TableRow>
                  <TableCell className="w-20">Nom</TableCell>
                  <TableCell className="w-20">Salaire</TableCell>
                  <TableCell className="w-20">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>{agent.nom}</TableCell>
                    <TableCell className="text-right">{formatAr(agent.salaire)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                      >
                        Modifier
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(agent.id)}
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
