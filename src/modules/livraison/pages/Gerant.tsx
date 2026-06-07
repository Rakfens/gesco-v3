// Gerant.tsx — Design system professionnel
import { useState, useMemo, useEffect } from 'react';
import { COMMISSION_DEFAUT, CURRENT_MONTH, monthLabel, shouldCountGerantCommission, EXCLUDED_CLIENTS } from '@/modules/shared/utils/constants';
import { useApp } from '@/modules/shared/context/AppContext';
import { Button, Input, Select, Badge, type BadgeVariant, Card, Modal, ModalHeader, ModalBody, ModalFooter, Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty } from '@/modules/shared/components/ui';
import { formatAr } from '@/modules/shared/utils/constants';
import type { Livraison } from '@/modules/shared/types';

const StatValue = ({ value, label, color }: { value: string | number; label: string; color?: string }) => (
  <Card>
    <div style={{ fontSize: 17, fontWeight: 800, color: color || 'var(--text)', marginBottom: 3 }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
  </Card>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
    {children}
  </div>
);

export default function Gerant() {
  const { livraisons, showToast } = useApp();
  const commissionGerant = COMMISSION_DEFAUT;

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [editCommission, setEditCommission] = useState<boolean>(false);
  const [tmpCommission, setTmpCommission] = useState<number>(commissionGerant);
  const [gerantTab, setGerantTab] = useState<string>('jour');
  const [gerantDate, setGerantDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gerantMonth, setGerantMonth] = useState<string>(CURRENT_MONTH());
  const [localCommission, setLocalCommission] = useState<number>(commissionGerant);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    setLocalCommission(commissionGerant);
    setTmpCommission(commissionGerant);
  }, [commissionGerant]);

  const livsGerant = (arr: Livraison[]) => arr.filter(l => shouldCountGerantCommission(l));

  const gerantDayLivs = useMemo(() => livsGerant((livraisons as Livraison[]).filter(l => l.date === gerantDate)), [livraisons, gerantDate]);
  const gerantDayCount = gerantDayLivs.length;
  const gerantDayGain = gerantDayCount * localCommission;
  const gerantDayFraisTotal = gerantDayLivs.reduce((s, l: Livraison) => s + parseFloat(String(l.frais || 0)), 0);
  const gerantDayNet = gerantDayFraisTotal - gerantDayGain;

  const gerantDayExcluded = useMemo(() => {
    return (livraisons as Livraison[]).filter(l =>
      l.date === gerantDate &&
      EXCLUDED_CLIENTS.includes((l.client_donneur || '').toUpperCase()) &&
      parseFloat(String(l.frais || 0)) > 0
    );
  }, [livraisons, gerantDate]);

  const months = useMemo(() => {
    const s = new Set((livraisons as Livraison[]).map(l => l.date?.slice(0, 7)).filter(Boolean));
    s.add(CURRENT_MONTH());
    return [...s].sort().reverse();
  }, [livraisons]);

  const gerantMonthLivs = useMemo(() => livsGerant((livraisons as Livraison[]).filter(l => l.date && l.date.startsWith(gerantMonth))), [livraisons, gerantMonth]);
  const gerantMonthCount = gerantMonthLivs.length;
  const gerantMonthGain = gerantMonthCount * localCommission;
  const gerantMonthFrais = gerantMonthLivs.reduce((s, l: Livraison) => s + parseFloat(String(l.frais || 0)), 0);

  const gerantMonthByDay = useMemo(() => {
    const map: Record<string, { date: string; count: number; gain: number }> = {};
    gerantMonthLivs.forEach(l => {
      if (!map[l.date]) map[l.date] = { date: l.date, count: 0, gain: 0 };
      map[l.date].count++;
      map[l.date].gain += localCommission;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [gerantMonthLivs, localCommission]);

  const handleUpdateCommission = async () => {
    setLocalCommission(tmpCommission);
    setEditCommission(false);
    if (showToast) showToast('Commission mise à jour');
  };

  const statutBadge = (statut: string) => {
    const variants: Record<string, BadgeVariant> = {
      livre: 'success', en_cours: 'primary', retourne: 'danger',
      reporte: 'default', livre_partiel: 'warning',
    };
    const labels: Record<string, string> = {
      livre: 'Livré', en_cours: 'En cours', retourne: 'Retourné',
      reporte: 'Reporté', livre_partiel: 'Partiel',
    };
    return <Badge variant={variants[statut] || 'default'}>{labels[statut] || statut}</Badge>;
  };

  const monthOptions = months.map(m => ({ value: m, label: monthLabel(m) }));

  return (
    <div data-testid="gerant-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Gérant</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Commission : {formatAr(localCommission)} par livraison (dès que les frais sont payés)
        </p>
        {EXCLUDED_CLIENTS.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--orange)', marginTop: 4 }}>
            Clients exclus : {EXCLUDED_CLIENTS.join(', ')} (pas de commission)
          </p>
        )}
      </div>

      {/* Commission card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Commission par livraison
            </div>
            {editCommission ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Input
                  type="number"
                  value={String(tmpCommission)}
                  onChange={e => setTmpCommission(parseFloat(e.target.value) || 0)}
                  style={{ width: 140 }}
                />
                <Button variant="success" size="sm" onClick={handleUpdateCommission}>Sauver</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditCommission(false)}>Annuler</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--pink)' }}>{formatAr(localCommission)}</span>
                <Button variant="ghost" size="sm" onClick={() => { setTmpCommission(localCommission); setEditCommission(true); }}>
                  Modifier
                </Button>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
            <div>Commission sur toutes les livraisons</div>
            <div>Dès que les frais sont payés (montant &gt; 0)</div>
            <div>Sauf pour les clients : {EXCLUDED_CLIENTS.join(', ')}</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--card)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
        {[
          { key: 'jour', label: 'Par jour' },
          { key: 'mois', label: 'Par mois' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setGerantTab(tab.key)}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 9,
              background: gerantTab === tab.key ? 'var(--accent)' : 'transparent',
              color: gerantTab === tab.key ? '#fff' : 'var(--subtle)',
              fontWeight: gerantTab === tab.key ? 700 : 500,
              cursor: 'pointer', fontSize: 13, transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====== TAB JOUR ====== */}
      {gerantTab === 'jour' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Input
              label="Sélectionner une date"
              type="date"
              value={gerantDate}
              onChange={e => setGerantDate(e.target.value)}
              style={isMobile ? undefined : { maxWidth: 220 }}
            />
          </div>

          {gerantDayExcluded.length > 0 && (
            <div style={{ background: 'var(--orange-dim)', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 600 }}>
                {gerantDayExcluded.length} livraison(s) exclue(s) de la commission (clients {EXCLUDED_CLIENTS.join(', ')})
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridColumn: '1/-1' }}><Card style={{ background: 'linear-gradient(135deg, var(--card2), var(--bg))', border: '1px solid var(--purple)', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700, marginBottom: 6 }}>
                GAIN DU GÉRANT — {gerantDate}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{formatAr(gerantDayGain)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{gerantDayCount} livraisons × {formatAr(localCommission)}</div>
            </Card></div>
            <StatValue value={gerantDayCount} label="Livraisons avec commission" color="var(--blue)" />
            <StatValue value={formatAr(gerantDayGain)} label="Gain gérant" color="var(--pink)" />
            <StatValue value={formatAr(gerantDayFraisTotal)} label="Frais collectés" color="var(--orange)" />
            <StatValue value={formatAr(gerantDayNet)} label="Frais nets (frais - commission)" color={gerantDayNet >= 0 ? 'var(--green)' : 'var(--red)'} />
          </div>

          {gerantDayLivs.length > 0 && (
            <div>
              <SectionTitle>Détail des livraisons avec commission — {gerantDate}</SectionTitle>
              <Table>
                <TableHead>
                  <TableHeader>#</TableHeader>
                  <TableHeader>Colis</TableHeader>
                  <TableHeader>Client donneur</TableHeader>
                  <TableHeader>Destinataire</TableHeader>
                  <TableHeader>Agent</TableHeader>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader align="right">Frais</TableHeader>
                  <TableHeader align="right">Commission</TableHeader>
                </TableHead>
                <TableBody>
                  {gerantDayLivs.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{l.colis}</TableCell>
                      <TableCell>{l.client_donneur}</TableCell>
                      <TableCell>{l.destinataire}</TableCell>
                      <TableCell>{l.agent_nom}</TableCell>
                      <TableCell>{statutBadge(String(l.statut))}</TableCell>
                      <TableCell align="right" style={{ color: 'var(--orange)' }}>{formatAr(parseFloat(String(l.frais || 0)))}</TableCell>
                      <TableCell align="right">{formatAr(localCommission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border2)' }}>
                    <td colSpan={6} style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>TOTAL</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{formatAr(gerantDayFraisTotal)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--pink)' }}>{formatAr(gerantDayGain)}</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
          {gerantDayLivs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
              Aucune livraison avec commission ce jour.
            </div>
          )}
        </div>
      )}

      {/* ====== TAB MOIS ====== */}
      {gerantTab === 'mois' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Sélectionner un mois"
              value={gerantMonth}
              onChange={e => setGerantMonth(e.target.value)}
              options={monthOptions}
              style={isMobile ? undefined : { maxWidth: 220 }}
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 700, marginBottom: 4 }}>
                  GAIN TOTAL GÉRANT — {monthLabel(gerantMonth)}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{formatAr(gerantMonthGain)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{gerantMonthCount} livraisons × {formatAr(localCommission)}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                <div>Frais collectés: <b style={{ color: 'var(--orange)' }}>{formatAr(gerantMonthFrais)}</b></div>
                <div>Frais nets: <b style={{ color: 'var(--green)' }}>{formatAr(gerantMonthFrais - gerantMonthGain)}</b></div>
              </div>
            </div>
          </Card>

          {gerantMonthByDay.length > 0 && (
            <div>
              <SectionTitle>Détail jour par jour — {monthLabel(gerantMonth)}</SectionTitle>
              <Table>
                <TableHead>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Livraisons avec commission</TableHeader>
                  <TableHeader align="right">Gain gérant</TableHeader>
                </TableHead>
                <TableBody>
                  {gerantMonthByDay.map((d, i) => (
                    <TableRow key={d.date}>
                      <TableCell style={{ fontWeight: 600 }}>{d.date}</TableCell>
                      <TableCell><Badge variant="info">{d.count}</Badge></TableCell>
                      <TableCell align="right">
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--pink)' }}>{formatAr(d.gain)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border2)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--muted)', fontSize: 11 }}>TOTAL DU MOIS</td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--blue)' }}>{gerantMonthCount}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--pink)', fontSize: 15 }}>{formatAr(gerantMonthGain)}</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
          {gerantMonthByDay.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
              Aucune livraison avec commission ce mois.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
