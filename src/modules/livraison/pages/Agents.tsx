// Agents.tsx — Design system professionnel
import { useState, useEffect, useCallback } from 'react';
import { formatAr, currentMonth, monthLabel } from '@/modules/shared/utils/constants';
import { getRecuperationsByLivreurNom, getTotalRecuperationsByLivreurNom } from '../services/recuperationService';
import { Button, Input, Select, Badge, Card, CardHeader, CardTitle, Modal, ModalHeader, ModalBody, ModalFooter, Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty } from '@/modules/shared/components/ui';
import type { Recuperation, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';

interface RecupMois {
  total: number;
  count: number;
  details: Recuperation[];
}

interface RecupCumul {
  total: number;
  count: number;
}

export default function Agents() {
  const { agents, addAgent: onAddAgent, updateAgent: onUpdateAgent, deleteAgent: onDeleteAgent, showToast } = useApp();
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const [newNom, setNewNom] = useState<string>('');
  const [newSalaire, setNewSalaire] = useState<string>('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ nom: string; salaire: string }>({ nom: '', salaire: '' });
  const [month, setMonth] = useState<string>(currentMonth());
  const [recupsMois, setRecupsMois] = useState<Record<string, RecupMois>>({});
  const [recupsCumul, setRecupsCumul] = useState<Record<string, RecupCumul>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);

  const uniqueMonths = [...new Set([currentMonth()])].sort().reverse();

  const loadRecuperations = useCallback(async () => {
    if (!agents.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        agents.map(async (agent: Agent) => {
          const [dataMois, { total: totalCumul, count: countCumul }] = await Promise.all([
            getRecuperationsByLivreurNom(agent.nom, month),
            getTotalRecuperationsByLivreurNom(agent.nom),
          ]);
          return {
            id: agent.id,
            mois: { total: dataMois.reduce((s: number, r: Recuperation) => s + (r.frais_recuperation || 0), 0), count: dataMois.length, details: dataMois },
            cumul: { total: totalCumul, count: countCumul },
          };
        })
      );
      const moisMap: Record<string, RecupMois> = {};
      const cumulMap: Record<string, RecupCumul> = {};
      results.forEach((r: { id: string; mois: RecupMois; cumul: RecupCumul }) => { moisMap[r.id] = r.mois; cumulMap[r.id] = r.cumul; });
      setRecupsMois(moisMap);
      setRecupsCumul(cumulMap);
    } catch (_) {}
    finally { setLoading(false); }
  }, [agents, month]);

  useEffect(() => { loadRecuperations(); }, [loadRecuperations]);

  const handleAdd = async () => {
    if (!newNom.trim() || !newSalaire) { showToast('Nom et salaire requis', 'error'); return; }
    await onAddAgent(newNom, newSalaire);
    setNewNom(''); setNewSalaire('');
    showToast('Agent ajouté');
  };

  const handleUpdate = async () => {
    if (!editData.nom || !editData.salaire) return;
    await onUpdateAgent(editId!, { nom: editData.nom, salaire: parseFloat(editData.salaire) });
    setEditId(null);
    showToast('Agent modifié');
  };

  const handleDelete = (agent: Agent) => { setConfirmDel({ id: agent.id, name: agent.nom }); };
  const executeDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setConfirmDel(null);
    await onDeleteAgent(id);
    showToast('Agent supprimé', 'warn');
  };

  const monthOptions = uniqueMonths.map(m => ({ value: m, label: monthLabel(m) }));

  return (
    <div data-testid="agents-page">
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <ModalHeader title="Supprimer l'agent ?" onClose={() => setConfirmDel(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            {confirmDel?.name} et toutes ses données seront supprimés définitivement.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDel(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete}>Supprimer</Button>
        </ModalFooter>
      </Modal>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Agents</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{agents.length} agent(s) enregistré(s)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            value={month}
            onChange={e => setMonth(e.target.value)}
            options={monthOptions}
            style={{ width: 'auto' }}
          />
          <Button variant="secondary" size="sm" onClick={loadRecuperations} loading={loading} data-testid="btn-refresh">
            Actualiser
          </Button>
        </div>
      </div>

      {/* Formulaire ajout */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>
          <CardTitle>Ajouter un agent</CardTitle>
        </CardHeader>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Input
            placeholder="Nom complet"
            value={newNom}
            onChange={e => setNewNom(e.target.value)}
          />
          <Input
            type="number"
            placeholder="250000"
            value={newSalaire}
            onChange={e => setNewSalaire(e.target.value)}
          />
        </div>
        <Button variant="primary" fullWidth onClick={handleAdd} data-testid="btn-add-agent">
          Ajouter l'agent
        </Button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 13 }}>
          Chargement des récupérations...
        </div>
      )}

      {/* Liste des agents */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Liste des agents ({agents.length})
      </div>

      {agents.map(a => {
        const rm = recupsMois[a.id] || { total: 0, count: 0, details: [] };
        const rc = recupsCumul[a.id] || { total: 0, count: 0 };
        return (
          <Card key={a.id} style={{ marginBottom: 10 }} data-testid={`agent-card-${a.id}`}>
            {editId === a.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <Input
                    value={editData.nom}
                    onChange={e => setEditData({ ...editData, nom: e.target.value })}
                  />
                  <Input
                    type="number"
                    value={editData.salaire}
                    onChange={e => setEditData({ ...editData, salaire: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="success" onClick={handleUpdate} style={{ flex: 1 }}>Sauver</Button>
                  <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div>
                {/* Ligne principale */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18, color: '#fff', flexShrink: 0,
                  }}>
                    {a.nom.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{a.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{formatAr(Number(a.salaire) || 0)} / mois</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(a.id); setEditData({ nom: a.nom, salaire: String(a.salaire ?? 0) }); }} data-testid={`btn-edit-${a.id}`}>
                      Modifier
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(a)} data-testid={`btn-delete-${a.id}`}>
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* Récupérations du mois */}
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rm.details?.length ? 8 : 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>{monthLabel(month)}</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rm.count} récup.</span>
                      <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{formatAr(rm.total)}</span>
                    </div>
                  </div>
                  {rm.details?.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                      {rm.details.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', padding: '3px 0' }}>
                          <span>{r.date}</span>
                          <span>{r.client_donneur}</span>
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatAr(r.frais_recuperation)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cumul total */}
                <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>Cumul total</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rc.count} récup.</span>
                    <span style={{ fontSize: 14, color: 'var(--yellow)', fontWeight: 800 }}>{formatAr(rc.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
