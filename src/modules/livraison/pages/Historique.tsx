import { useState, useMemo, useEffect } from 'react';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { STATUTS, PAIE_MODES, formatAr, TODAY } from '@/modules/shared/utils/constants';
import { exportToCSV } from '@/modules/shared/utils/csvExport';
import { printAgentList } from '@/modules/shared/utils/pdfExport';
import { ClientFeedbackModal } from '@/modules/shared/components/Modals/ClientFeedbackModal';
import type { Livraison, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';
import {
  Button, Input, Select, Badge, Card, Modal, ModalHeader, ModalBody, ModalFooter,
  Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty,
} from '@/modules/shared/components/ui';

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

const statusBadge = (statut: string) => {
  const map: Record<string, string> = {
    livre: 'success', en_cours: 'warning', retourne: 'danger',
    reporte: 'purple', livre_partiel: 'warning',
  };
  const labels: Record<string, string> = {
    livre: 'Livré', en_cours: 'En cours', retourne: 'Retourné',
    reporte: 'Reporté', livre_partiel: 'Partiel',
  };
  return <Badge variant={(map[statut] || 'default') as any} size="sm">{labels[statut] || statut}</Badge>;
};

const STATUT_OPTIONS = Object.entries(STATUTS).map(([k, v]) => ({ value: k, label: v.label }));
const PAIE_OPTIONS = Object.entries(PAIE_MODES).map(([k, v]) => ({ value: k, label: v.label }));

interface ClientStat {
  client: string;
  livs: Livraison[];
  totalMontant: number;
  totalFrais: number;
}

export default function Historique() {
  const { livraisons, agents, showToast, updateLivraison: onUpdateLivraison, deleteLivraison: onDeleteLivraison } = useApp();
  const { currentCompany } = useCompany();
  const logoUrl = currentCompany?.logo_url ? String(currentCompany.logo_url) : null;
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const [histDate, setHistDate] = useState<string>(TODAY());
  const [histAgent, setHistAgent] = useState<string>('tous');
  const [histStatut, setHistStatut] = useState<string>('tous');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Livraison>>({});
  const [fbClient, setFbClient] = useState<string | null>(null);
  const [fbRecup, setFbRecup] = useState<number>(0);
  const [fbProvince, setFbProvince] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const agentOptions = [
    { value: 'tous', label: 'Tous' },
    ...agents.map(a => ({ value: a.nom, label: a.nom })),
  ];

  const livsFiltered = useMemo(() => livraisons.filter(l =>
    l.date === histDate &&
    (histAgent === 'tous' || l.agent_nom === histAgent) &&
    (histStatut === 'tous' || l.statut === histStatut)
  ), [livraisons, histDate, histAgent, histStatut]);

  const statsByClient: ClientStat[] = useMemo(() => {
    const map: Record<string, ClientStat> = {};
    livsFiltered.forEach(l => {
      const client = l.client_donneur;
      if (!map[client]) map[client] = { client, livs: [], totalMontant: 0, totalFrais: 0 };
      map[client].livs.push(l);
      if (l.paiement !== 'client') map[client].totalMontant += Number(l.montant) || 0;
      map[client].totalFrais += Number(l.frais) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalMontant - a.totalMontant);
  }, [livsFiltered]);

  const handleExportCSV = () => {
    if (!livsFiltered.length) return;
    const keys = ['date', 'colis', 'client_donneur', 'destinataire', 'destinataire_lieu', 'agent_nom', 'montant', 'frais', 'paiement', 'statut'];
    const csv = [keys, ...livsFiltered.map(l => keys.map(k => '"' + ((l as unknown as Record<string, unknown>)[k] || '') + '"'))].map(r => r.join(',')).join('\n');
    const b = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'livraisons_' + histDate + '.csv';
    a.click();
    URL.revokeObjectURL(u);
  };

  const handleUpdate = async () => {
    const montant = editData.paiement === 'client' ? 0 : parseFloat(String(editData.montant)) || 0;
    await onUpdateLivraison(editId!, { ...editData, montant, frais: parseFloat(String(editData.frais)) || 0 });
    setEditId(null);
    showToast('Livraison mise à jour');
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    await onDeleteLivraison(id);
    showToast('Livraison supprimée', 'warn');
  };

  return (
    <div>
      <ClientFeedbackModal
        fbClient={fbClient as any} setFbClient={setFbClient as any} histDate={histDate}
        fbRecup={String(fbRecup)} setFbRecup={setFbRecup as any} fbProvince={String(fbProvince)} setFbProvince={setFbProvince as any}
        livraisons={livsFiltered} onClose={() => setFbClient(null)}
      />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <ModalHeader title="Supprimer la livraison ?" onClose={() => setConfirmDelete(null)} />
        <ModalBody>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            Cette action est irréversible. L'enregistrement sera définitivement supprimé.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
          <Button variant="danger" onClick={executeDelete}>Supprimer</Button>
        </ModalFooter>
      </Modal>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Historique</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{currentCompany?.name}</p>
        </div>
        <Button variant="success" size="sm" onClick={handleExportCSV} data-testid="btn-export-csv">
          Exporter CSV
        </Button>
      </div>

      {/* Filtres */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <Input type="date" label="Date" value={histDate} onChange={e => setHistDate(e.target.value)} />
          <Select label="Agent" value={histAgent} onChange={e => setHistAgent(e.target.value)} options={agentOptions} />
          {!isMobile && <Select label="Statut" value={histStatut} onChange={e => setHistStatut(e.target.value)} options={[{ value: 'tous', label: 'Tous' }, ...STATUT_OPTIONS]} />}
          <Badge variant="primary">{livsFiltered.length} résultat{livsFiltered.length > 1 ? 's' : ''}</Badge>
        </div>
        {isMobile && (
          <div style={{ marginTop: 12 }}>
            <Select label="Statut" value={histStatut} onChange={e => setHistStatut(e.target.value)} options={[{ value: 'tous', label: 'Tous' }, ...STATUT_OPTIONS]} />
          </div>
        )}
      </Card>

      {/* Impression liste livreur */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Imprimer liste livreur
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {agents.map(a => {
            const lsDate = livsFiltered.filter(l => agentMatch(l, a));
            const lsEnCours = livraisons.filter(l => agentMatch(l, a) && l.statut === 'en_cours');
            const lsToShow = lsDate.length > 0 ? lsDate : lsEnCours;
            const label = lsDate.length > 0
              ? `${a.nom} — ${histDate} (${lsDate.length})`
              : lsEnCours.length > 0
              ? `${a.nom} — En cours (${lsEnCours.length})`
              : null;
            if (!label) return null;
            const dateLabel = lsDate.length > 0 ? histDate : 'en cours';
            return (
              <Button key={a.id} variant="secondary" size="sm"
                onClick={() => printAgentList(a, lsToShow, dateLabel, logoUrl, currentCompany)}
              >
                {label}
              </Button>
            );
          })}
          {agents.every(a => {
            const lsDate = livsFiltered.filter(l => agentMatch(l, a));
            const lsEnCours = livraisons.filter(l => agentMatch(l, a) && l.statut === 'en_cours');
            return lsDate.length === 0 && lsEnCours.length === 0;
          }) && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Aucune livraison disponible pour cette date.</span>
          )}
        </div>
      </Card>

      {livsFiltered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 0', fontSize: 14 }}>
          Aucune livraison pour cette date.
        </div>
      )}

      {livsFiltered.length > 0 && (
        <div>
          {/* Frais par agent */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Frais par agent
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
            {agents.map(a => {
              const ls = livsFiltered.filter(l => agentMatch(l, a));
              if (!ls.length) return null;
              return (
                <Card key={a.id}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{a.nom}</div>
                  <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>
                    Frais : {formatAr(ls.reduce((s, l) => s + (Number(l.frais) || 0), 0))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ls.length} livraison(s)</div>
                </Card>
              );
            })}
          </div>

          {/* Versement par client donneur */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Versement par client donneur
          </div>
          {statsByClient.map(cl => (
            <Card key={cl.client} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 15 }}>{cl.client}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>{formatAr(cl.totalMontant)}</span>
                  <Button variant="primary" size="sm" onClick={() => { setFbClient(cl.client); setFbRecup(0); setFbProvince(0); }}>
                    PDF
                  </Button>
                </div>
              </div>
              {cl.livs.map(l => (
                <div key={l.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  {editId === l.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                      {[['colis', 'Colis'], ['client_donneur', 'Client donneur'], ['destinataire', 'Destinataire'], ['destinataire_lieu', 'Lieu livraison']].map(([k, lb]) => (
                        <div key={k}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lb}</label>
                          <input style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                            value={String((editData as Record<string, unknown>)[k] || '')} onChange={e => setEditData({ ...editData, [k]: e.target.value })} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Montant (Ar)</label>
                        <input type="number" style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                          value={String(editData.montant || '')} onChange={e => setEditData({ ...editData, montant: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Frais (Ar)</label>
                        <input type="number" style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                          value={String(editData.frais || '')} onChange={e => setEditData({ ...editData, frais: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Paiement</label>
                        <select style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                          value={String(editData.paiement || '')} onChange={e => setEditData({ ...editData, paiement: e.target.value })}>
                          {PAIE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Statut</label>
                        <select style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                          value={String(editData.statut || '')} onChange={e => setEditData({ ...editData, statut: e.target.value })}>
                          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      {(editData.statut === 'retourne' || editData.statut === 'reporte') && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                            {editData.statut === 'retourne' ? 'Motif du retour' : 'Motif du report'}
                          </label>
                          <textarea style={{ width: '100%', minHeight: 60, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'var(--font)', boxSizing: 'border-box' }}
                            value={String(editData.remarque || '')}
                            onChange={e => setEditData({ ...editData, remarque: e.target.value })}
                            placeholder={editData.statut === 'retourne' ? 'Ex: Destinataire absent, adresse incorrecte...' : 'Ex: Reporté au lendemain, client demande de revenir...'}
                          />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, gridColumn: '1/-1' }}>
                        <Button variant="success" onClick={handleUpdate} style={{ flex: 1 }}>Sauver</Button>
                        <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{l.colis}</div>
                        <div style={{ fontSize: 11, color: 'var(--subtle)' }}>
                          {l.client_donneur} → {l.destinataire}
                          {l.destinataire_lieu && ` • ${l.destinataire_lieu}`}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>Livreur : {l.agent_nom}</div>
                        {(l.statut === 'retourne' || l.statut === 'reporte') && l.remarque && (
                          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--orange)', background: 'var(--orange-dim)', borderRadius: 6, padding: '4px 8px', borderLeft: '2px solid var(--orange)' }}>
                            {l.remarque}
                          </div>
                        )}
                        {(l.statut === 'retourne' || l.statut === 'reporte') && !l.remarque && (
                          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
                            Aucun motif — cliquer Modifier pour ajouter
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        {l.paiement === 'client' ? (
                          <Badge variant="primary" size="sm">Payé client</Badge>
                        ) : (
                          <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>{formatAr(Number(l.montant) || 0)}</span>
                        )}
                        {statusBadge(l.statut ?? "")}
                        <Button variant="secondary" size="sm" onClick={() => { setEditId(l.id); setEditData(l); }}>Modifier</Button>
                        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(l.id)}>Supprimer</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          ))}

          {/* Total du jour */}
          <Card style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: 'var(--subtle)', fontWeight: 700, fontSize: 13 }}>TOTAL DU JOUR</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                {formatAr(livsFiltered.filter(l => l.paiement !== 'client').reduce((s, l) => s + (Number(l.montant) || 0), 0))}
              </span>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>
                Frais : {formatAr(livsFiltered.reduce((s, l) => s + (Number(l.frais) || 0), 0))}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
