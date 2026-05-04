import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Match, MatchStatus, PickInput, Prediction } from '../types';
import { ScoreInput } from './ScoreInput';
import { TeamFlag } from './TeamFlag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePredictionsStore } from '../store/predictionsStore';
import { formatDateTime, isMatchLocked, useDebouncedCallback } from '../utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  showResult?: boolean;
}

function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === 'LIVE') {
    return (
      <Badge className="gap-1 border-green-300 bg-green-500/15 text-green-700">
        <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
        EN VIVO
      </Badge>
    );
  }
  if (status === 'FINISHED') {
    return <Badge variant="secondary">Finalizado</Badge>;
  }
  return <Badge variant="outline">Programado</Badge>;
}

// ── component ─────────────────────────────────────────────────────────────────

export function MatchCard({ match, prediction, showResult }: Props) {
  const savePick = usePredictionsStore((s) => s.savePick);
  const locked = isMatchLocked(match.scheduledAt, match.lockedAt);
  const finished = match.matchStatus === 'FINISHED';
  const isKnockout = match.phase !== 'GROUPS';
  const tbd = !match.homeTeam || !match.awayTeam;

  const [home, setHome] = useState<number | null>(prediction?.pickHome90 ?? null);
  const [away, setAway] = useState<number | null>(prediction?.pickAway90 ?? null);
  const [homeET, setHomeET] = useState<number | null>(prediction?.pickHomeET ?? null);
  const [awayET, setAwayET] = useState<number | null>(prediction?.pickAwayET ?? null);
  const [homePen, setHomePen] = useState<number | null>(prediction?.pickHomePen ?? null);
  const [awayPen, setAwayPen] = useState<number | null>(prediction?.pickAwayPen ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHome(prediction?.pickHome90 ?? null);
    setAway(prediction?.pickAway90 ?? null);
    setHomeET(prediction?.pickHomeET ?? null);
    setAwayET(prediction?.pickAwayET ?? null);
    setHomePen(prediction?.pickHomePen ?? null);
    setAwayPen(prediction?.pickAwayPen ?? null);
  }, [
    prediction?.id,
    prediction?.pickHome90, prediction?.pickAway90,
    prediction?.pickHomeET, prediction?.pickAwayET,
    prediction?.pickHomePen, prediction?.pickAwayPen,
  ]);

  const draw90 = home !== null && away !== null && home === away;
  const showET = isKnockout && draw90;
  const showPen = showET && homeET === 0 && awayET === 0;

  const buildPayload = (
    h: number, a: number,
    hE: number | null, aE: number | null,
    hP: number | null, aP: number | null,
  ): PickInput => {
    const payload: PickInput = { pickHome90: h, pickAway90: a };
    if (isKnockout && h === a) {
      payload.pickHomeET = hE ?? 0;
      payload.pickAwayET = aE ?? 0;
      if (payload.pickHomeET === 0 && payload.pickAwayET === 0 && hP !== null && aP !== null) {
        payload.pickHomePen = hP;
        payload.pickAwayPen = aP;
      }
    }
    return payload;
  };

  const doSave = async (
    h: number, a: number,
    hE: number | null, aE: number | null,
    hP: number | null, aP: number | null,
  ) => {
    if (locked || tbd) return;
    setError(null);
    try {
      await savePick(match.id, buildPayload(h, a, hE, aE, hP, aP));
      toast.success('Guardado', { duration: 1500 });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const text = msg ?? 'Error al guardar';
      setError(text);
      toast.error(text);
    }
  };

  const debouncedSave = useDebouncedCallback(doSave, 800);

  const onScore90 = (h: number, a: number) => {
    setHome(h); setAway(a);
    debouncedSave(h, a, homeET, awayET, homePen, awayPen);
  };
  const onScoreET = (h: number, a: number) => {
    setHomeET(h); setAwayET(a);
    if (home !== null && away !== null) debouncedSave(home, away, h, a, homePen, awayPen);
  };
  const onScorePen = (h: number, a: number) => {
    setHomePen(h); setAwayPen(a);
    if (home !== null && away !== null) debouncedSave(home, away, homeET, awayET, h, a);
  };

  const canEdit = !locked && !tbd;

  return (
    <Card
      className={cn(
        'transition-opacity',
        locked && !finished && 'opacity-60 ring-border/30',
      )}
    >
      <CardContent className="space-y-3 p-4">

        {/* ── meta row ── */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={match.matchStatus} />
          <span className="text-xs text-muted-foreground">
            {formatDateTime(match.scheduledAt)}
            {match.venue ? ` · ${match.venue}` : ''}
          </span>
        </div>

        {/* ── teams + score ── */}
        <div className="flex items-center gap-3">
          {/* home: flag + name, right-aligned */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right text-sm font-semibold leading-tight">
              {match.homeTeam?.name ?? 'TBD'}
            </span>
            <TeamFlag team={match.homeTeam} />
          </div>

          {/* score inputs */}
          <div className="shrink-0">
            <ScoreInput
              home={home}
              away={away}
              onChange={onScore90}
              disabled={!canEdit}
              size="lg"
            />
          </div>

          {/* away: flag + name, left-aligned */}
          <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
            <TeamFlag team={match.awayTeam} />
            <span className="truncate text-sm font-semibold leading-tight">
              {match.awayTeam?.name ?? 'TBD'}
            </span>
          </div>
        </div>

        {/* ── extra time ── */}
        {showET && (
          <div className="space-y-1">
            <p className="text-center text-xs text-muted-foreground">Prórroga (acumulado)</p>
            <div className="flex justify-center">
              <ScoreInput home={homeET} away={awayET} onChange={onScoreET} disabled={!canEdit} />
            </div>
          </div>
        )}

        {/* ── penalties ── */}
        {showPen && (
          <div className="space-y-1">
            <p className="text-center text-xs text-muted-foreground">Penales</p>
            <div className="flex justify-center">
              <ScoreInput home={homePen} away={awayPen} onChange={onScorePen} disabled={!canEdit} />
            </div>
          </div>
        )}

        {/* ── save button (manual fallback) ── */}
        {canEdit && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              disabled={home === null || away === null}
              onClick={() => {
                if (home !== null && away !== null)
                  void doSave(home, away, homeET, awayET, homePen, awayPen);
              }}
            >
              Guardar ahora
            </Button>
          </div>
        )}

        {/* ── inline error ── */}
        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}

        {/* ── locked notice ── */}
        {locked && !finished && (
          <p className="text-center text-xs text-muted-foreground">
            Cerrado para ediciones
          </p>
        )}

        {/* ── result + points ── */}
        {finished && showResult && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-center text-sm font-medium">
              {match.resultHome90} – {match.resultAway90}
              {match.resultHomeET != null && (
                <span className="text-muted-foreground">
                  {' '}(ET {match.resultHomeET}–{match.resultAwayET})
                </span>
              )}
              {match.resultHomePen != null && (
                <span className="text-muted-foreground">
                  {' '}(PEN {match.resultHomePen}–{match.resultAwayPen})
                </span>
              )}
            </p>
            {prediction && (
              <div className="flex flex-wrap justify-center gap-1.5">
                <Badge variant="secondary">Ganador +{prediction.ptsWinner}</Badge>
                <Badge variant="secondary">Exacto +{prediction.ptsExact}</Badge>
                {isKnockout && (
                  <>
                    <Badge variant="secondary">
                      ET +{prediction.ptsET + prediction.ptsETExact}
                    </Badge>
                    <Badge variant="secondary">
                      PEN +{prediction.ptsPen + prediction.ptsPenExact}
                    </Badge>
                  </>
                )}
                <Badge className="bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent-border)]">
                  Total {prediction.ptsTotal}
                </Badge>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
