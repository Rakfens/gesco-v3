// ServiceDashboard.tsx — Professional Design
import { useState, useEffect } from 'react';
import { CardSkeleton } from '@/modules/shared/components/common/Loader';
import { useCompany } from '@/modules/shared/context/CompanyContext';
import { formatAr, TODAY, currentMonth, monthLabel, shouldCountGerantCommission, EXCLUDED_CLIENTS } from '@/modules/shared/utils/constants';
import { badge as badgeStyle, inpSm } from '@/modules/shared/utils/helpers';
import { getRecuperationsByDate } from '../services/recuperationService';
import type { Recuperation, Livraison, Agent } from '@/modules/shared/types';
import { useApp } from '@/modules/shared/context/AppContext';
import { COMMISSION_DEFAUT } from '@/modules/shared/utils/constants';

const agentMatch = (livraison: Livraison, agent: Agent): boolean => {
  if (livraison.agent_id != null && agent.id != null) {
    return Number(livraison.agent_id) === Number(agent.id);
  }
  return livraison.agent_nom === agent.nom;
};

const StatCard = ({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) => (
  <div className="stat-card" style={{ borderLeft: `3px solid ${color}`, textAlign: 'center' }}>
    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
  </div>
);

interface RecupParLivreur {
  livreur: string;
  total: number;
  nb: number;
  details: { client: string; frais: number }[];
}

export default function Dashboard() {
  const { agents, livraisons } = useApp();
  const { currentCompany } = useCompany();
  const commissionGerant = COMMISSION_DEFAUT;
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY());
  const [recuperationsJour, setRecuperationsJour] = useState<Recuperation[]>([]);
  const [loadingRecup, setLoadingRecup] = useState<boolean>(false);

  const enCours = livraisons?.filter(l => l.statut === 'en_cours').length || 0;
  const todayLivs = livraisons?.filter(l => l.date === TODAY()) || [];
  const livsGerant = todayLivs.filter(l => shouldCountGerantCommission(l));
  const gerantGain = livsGerant.length * commissionGerant;
  const excludedToday = todayLivs.filter(l => EXCLUDED_CLIENTS.includes(l.client_donneur?.toUpperCase() || '') && (Number(l.frais) || 0) > 0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadRecuperations = async () => {
      setLoadingRecup(true);
      try {
        const data = await getRecuperationsByDate(selectedDate);
        setRecuperationsJour(data || []);
      } catch (error) {
      } finally {
        setLoadingRecup(false);
      }
    };
    loadRecuperations();
  }, [selectedDate]);

  const totalRecuperationsJour = recuperationsJour.reduce((s, r) => s + (r.frais_recuperation || 0), 0);
  const nbRecuperationsJour = recuperationsJour.length;

  const recuperationsParLivreur: Record<string, RecupParLivreur> = recuperationsJour.reduce((acc, r) => {
    const nom = r.livreur_nom;
    if (!acc[nom]) acc[nom] = { livreur: nom, total: 0, nb: 0, details: [] };
    acc[nom].total += (r.frais_recuperation ?? 0);
    acc[nom].nb += 1;
    acc[nom].details.push({ client: r.client_donneur, frais: r.frais_recuperation ?? 0 });
    return acc;
  }, {} as Record<string, RecupParLivreur>);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }} data-testid="page-title">Tableau de bord</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          {currentCompany?.name || 'HT-GesCom'} · Aperçu de l'activité
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total livraisons" value={livraisons?.length || 0} color="var(--accent)" />
        <StatCard label="En cours" value={enCours} color="var(--orange)" />
        <StatCard label="Livrés" value={livraisons?.filter(l => l.statut === 'livre').length || 0} color="var(--green)" />
        <StatCard label="Retournés" value={livraisons?.filter(l => l.statut === 'retourne').length || 0} color="var(--red)" />
      </div>

      {/* Récupérations */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Récupérations matinales</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--orange)' }}>{formatAr(totalRecuperationsJour)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{nbRecuperationsJour} récupération(s)</div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'block', fontWeight: 600 }}>Date</label>
            <input type="date" style={{ ...inpSm(), background: 'var(--card)' }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </div>

        {loadingRecup && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0', fontSize: 13 }}>Chargement...</div>
        )}

        {!loadingRecup && Object.keys(recuperationsParLivreur).length > 0 ? (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            {Object.values(recuperationsParLivreur).map(rl => (
              <div key={rl.livreur} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{rl.livreur}</span>
                  <span style={{ color: 'var(--orange)', fontSize: 13, fontWeight: 600 }}>{rl.nb} récup. · {formatAr(rl.total)}</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {rl.details.map((d, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderBottom: idx < rl.details.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--text2)' }}>{d.client}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>{formatAr(d.frais)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadingRecup && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0', fontSize: 13 }}>
              Aucune récupération enregistrée pour cette date.
            </div>
          )
        )}
      </div>

      {/* Gérant */}
      <div style={{
        background: '#f5f3ff', border: '1px solid #ddd6fe',
        borderRadius: 14, padding: '20px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700, marginBottom: 4 }}>Gérant — Aujourd'hui ({TODAY()})</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{formatAr(gerantGain)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{livsGerant.length} livraisons × {formatAr(commissionGerant)}</div>
            {excludedToday.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4 }}>
                {excludedToday.length} livraison(s) exclue(s)
              </div>
            )}
          </div>
          <button
            onClick={() => {}}
            style={{
              padding: '10px 18px', background: 'var(--purple)', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Voir détails →
          </button>
        </div>
      </div>

      {/* Récap par agent */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Récap par agent</h2>
        <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '3px 10px', borderRadius: 100, color: 'var(--muted)', fontWeight: 600 }}>Tous temps</span>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents?.map(a => {
            const ls = livraisons?.filter(l => agentMatch(l, a)) || [];
            const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
            const livres = ls.filter(l => l.statut === 'livre').length;
            const retournes = ls.filter(l => l.statut === 'retourne').length;
            const reportes = ls.filter(l => l.statut === 'reporte').length;

            return (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16, color: 'var(--accent)',
                  }}>
                    {a.nom?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ls.length} livraisons</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Livrés', value: livres, color: 'var(--green)' },
                    { label: 'Retournés', value: retournes, color: 'var(--red)' },
                    { label: 'Reportés', value: reportes, color: 'var(--purple)' },
                    { label: 'Frais', value: formatAr(totalFrais), color: 'var(--orange)' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '8px 4px' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${ls.length ? (livres / ls.length) * 100 : 0}%`,
                    height: '100%', background: 'var(--green)', borderRadius: 2, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Agent', 'Total', 'Livrés', 'Retournés', 'Reportés', 'Frais', 'Taux réussite'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', color: 'var(--muted)', fontWeight: 600,
                    textAlign: h === 'Agent' ? 'left' : 'center', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents?.map(a => {
                const ls = livraisons?.filter(l => agentMatch(l, a)) || [];
                const totalFrais = ls.reduce((s, l) => s + (Number(l.frais) || 0), 0);
                const livres = ls.filter(l => l.statut === 'livre').length;
                const retournes = ls.filter(l => l.statut === 'retourne').length;
                const reportes = ls.filter(l => l.statut === 'reporte').length;
                const taux = ls.length ? Math.round((livres / ls.length) * 100) : 0;

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.nom}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>{ls.length}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span className="badge" style={badgeStyle('success')}>{livres}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span className="badge" style={badgeStyle('danger')}>{retournes}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span className="badge" style={badgeStyle('purple')}>{reportes}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--orange)', fontWeight: 600 }}>{formatAr(totalFrais)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${taux}%`, height: '100%', background: taux >= 70 ? 'var(--green)' : taux >= 40 ? 'var(--orange)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>{taux}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
