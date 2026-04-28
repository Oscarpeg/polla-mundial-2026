import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { MatchPhase, PreviewResponse } from '../types';

const PHASE_LABELS: Record<MatchPhase, string> = {
  GROUPS: 'Fase de grupos',
  R32: 'Ronda de 32',
  R16: 'Octavos (R16)',
  QF: 'Cuartos',
  SF: 'Semifinales',
  THIRD: 'Tercer puesto',
  FINAL: 'Final',
};

function targetForPhase(phase: MatchPhase): string {
  return phase === 'GROUPS' ? '/fixture' : '/bracket';
}

export function PreviewPage() {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPredictionsPreview()
      .then(setData)
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'Error al cargar');
      });
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Cargando...</p>;

  const phases = Object.keys(PHASE_LABELS) as MatchPhase[];

  return (
    <div className="page preview-page">
      <h1>Mis predicciones</h1>

      <section>
        <h2>Picks globales</h2>
        {data.globalPrediction ? (
          <ul>
            <li>Campeón: {data.globalPrediction.champion?.name ?? '—'}</li>
            <li>Subcampeón: {data.globalPrediction.runnerUp?.name ?? '—'}</li>
            <li>3°: {data.globalPrediction.third?.name ?? '—'}</li>
            <li>4°: {data.globalPrediction.fourth?.name ?? '—'}</li>
          </ul>
        ) : (
          <p>Aún no has guardado tus picks globales. <Link to="/global-picks">Ir</Link></p>
        )}
      </section>

      {phases.map((phase) => {
        const items = data.groups[phase] ?? [];
        if (items.length === 0) return null;
        return (
          <section key={phase}>
            <h2>{PHASE_LABELS[phase]}</h2>
            <ul>
              {items.map((p) => {
                const home = p.match?.homeTeam?.name ?? 'TBD';
                const away = p.match?.awayTeam?.name ?? 'TBD';
                const lockedAt = p.match?.lockedAt;
                const scheduledAt = p.match?.scheduledAt;
                const locked = (lockedAt && new Date(lockedAt).getTime() <= Date.now()) ||
                  (scheduledAt && new Date(scheduledAt).getTime() <= Date.now());
                return (
                  <li key={p.id}>
                    <span>
                      {home} {p.pickHome90}-{p.pickAway90} {away}
                      {p.pickHomeET !== null && p.pickHomeET !== undefined && ` (ET ${p.pickHomeET}-${p.pickAwayET})`}
                      {p.pickHomePen !== null && p.pickHomePen !== undefined && ` (PEN ${p.pickHomePen}-${p.pickAwayPen})`}
                    </span>
                    {!locked && (
                      <Link to={targetForPhase(phase)} style={{ marginLeft: 8 }}>
                        Editar
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
