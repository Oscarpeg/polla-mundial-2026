import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import { TeamFlag } from '../components/TeamFlag';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { isMatchLocked } from '../utils';
import type { MatchPhase, Prediction, PreviewResponse } from '../types';

const PHASE_LABELS: Record<MatchPhase, string> = {
  GROUPS: 'Fase de grupos',
  R32: 'Ronda de 32',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinales',
  THIRD: 'Tercer puesto',
  FINAL: 'Final',
};

function targetForPhase(phase: MatchPhase): string {
  return phase === 'GROUPS' ? '/fixture' : '/bracket';
}

// ── compact prediction row ────────────────────────────────────────────────────

function PredictionRow({ prediction }: { prediction: Prediction }) {
  const match = prediction.match;
  if (!match) return null;

  const locked = isMatchLocked(match.scheduledAt, match.lockedAt);
  const finished = match.matchStatus === 'FINISHED';
  const phase = match.phase;

  return (
    <div className="flex items-center gap-2 border-b border-border/50 py-2 last:border-0">
      {/* home */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span className="truncate text-right text-xs font-medium">
          {match.homeTeam?.name ?? 'TBD'}
        </span>
        <TeamFlag team={match.homeTeam} size="sm" />
      </div>

      {/* pick */}
      <div className="shrink-0 text-center text-sm font-bold tabular-nums">
        {prediction.pickHome90}
        <span className="mx-0.5 text-muted-foreground">–</span>
        {prediction.pickAway90}
        {prediction.pickHomeET != null && (
          <span className="block text-[10px] font-normal text-muted-foreground">
            ET {prediction.pickHomeET}–{prediction.pickAwayET}
          </span>
        )}
      </div>

      {/* away */}
      <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
        <TeamFlag team={match.awayTeam} size="sm" />
        <span className="truncate text-xs font-medium">
          {match.awayTeam?.name ?? 'TBD'}
        </span>
      </div>

      {/* status */}
      <div className="shrink-0">
        {finished ? (
          <Badge variant="secondary" className="text-[10px]">
            +{prediction.ptsTotal}
          </Badge>
        ) : !locked ? (
          <Link
            to={targetForPhase(phase)}
            className="text-[10px] font-medium text-[var(--accent)] hover:underline"
          >
            Editar
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function PhaseSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </CardContent>
    </Card>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

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

  const phases = Object.keys(PHASE_LABELS) as MatchPhase[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis predicciones</h1>
        <p className="text-sm text-muted-foreground">Resumen de todos tus pronósticos</p>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* ── global picks summary ── */}
      {!data ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Picks globales</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.globalPrediction ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {(
                  [
                    ['🥇 Campeón', data.globalPrediction.champion],
                    ['🥈 Subcampeón', data.globalPrediction.runnerUp],
                    ['🥉 3er puesto', data.globalPrediction.third],
                    ['4° puesto', data.globalPrediction.fourth],
                  ] as const
                ).map(([label, team]) => (
                  <div key={label} className="flex items-center gap-2">
                    <TeamFlag team={team} size="sm" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-xs font-semibold">{team?.name ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no guardaste tus picks globales.{' '}
                <Link to="/global-picks" className="font-medium text-[var(--accent)] hover:underline">
                  Ir ahora
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── predictions by phase ── */}
      {!data ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <PhaseSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => {
            const items = data.groups[phase] ?? [];
            if (items.length === 0) return null;
            return (
              <Card key={phase}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{PHASE_LABELS[phase]}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {items.map((p) => (
                    <PredictionRow key={p.id} prediction={p} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
