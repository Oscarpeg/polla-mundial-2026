import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Match, PickInput, Prediction } from '../types';
import { ScoreInput } from './ScoreInput';
import { TeamFlag } from './TeamFlag';
import { cn } from '@/lib/utils';
import { usePredictionsStore } from '../store/predictionsStore';
import { isMatchLocked, useDebouncedCallback } from '../utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  showResult?: boolean;
}

export function BracketCard({ match, prediction, showResult }: Props) {
  const savePick = usePredictionsStore((s) => s.savePick);
  const locked = isMatchLocked(match.scheduledAt, match.lockedAt);
  const finished = match.matchStatus === 'FINISHED';
  const tbd = !match.homeTeam || !match.awayTeam;

  const [home, setHome] = useState<number | null>(prediction?.pickHome90 ?? null);
  const [away, setAway] = useState<number | null>(prediction?.pickAway90 ?? null);
  const [homeET, setHomeET] = useState<number | null>(prediction?.pickHomeET ?? null);
  const [awayET, setAwayET] = useState<number | null>(prediction?.pickAwayET ?? null);
  const [homePen, setHomePen] = useState<number | null>(prediction?.pickHomePen ?? null);
  const [awayPen, setAwayPen] = useState<number | null>(prediction?.pickAwayPen ?? null);

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
  const showET = draw90;
  const showPen = showET && homeET === 0 && awayET === 0;

  const buildPayload = (
    h: number, a: number,
    hE: number | null, aE: number | null,
    hP: number | null, aP: number | null,
  ): PickInput => {
    const payload: PickInput = { pickHome90: h, pickAway90: a };
    if (h === a) {
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
    try {
      await savePick(match.id, buildPayload(h, a, hE, aE, hP, aP));
      toast.success('Guardado', { duration: 1200 });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al guardar');
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
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-2 space-y-1.5 transition-opacity',
        locked && !finished && 'border-border/30 opacity-60',
      )}
    >
      {/* ── main score row ── */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span className="truncate text-right text-xs font-medium leading-tight">
            {match.homeTeam?.name ?? 'TBD'}
          </span>
          <TeamFlag team={match.homeTeam} size="sm" />
        </div>

        <ScoreInput
          home={home}
          away={away}
          onChange={onScore90}
          disabled={!canEdit}
        />

        <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
          <TeamFlag team={match.awayTeam} size="sm" />
          <span className="truncate text-xs font-medium leading-tight">
            {match.awayTeam?.name ?? 'TBD'}
          </span>
        </div>
      </div>

      {/* ── ET row ── */}
      {showET && canEdit && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-muted-foreground">ET</span>
          <ScoreInput home={homeET} away={awayET} onChange={onScoreET} disabled={!canEdit} />
        </div>
      )}

      {/* ── Penalties row ── */}
      {showPen && canEdit && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-muted-foreground">PEN</span>
          <ScoreInput home={homePen} away={awayPen} onChange={onScorePen} disabled={!canEdit} />
        </div>
      )}

      {/* ── Result (finished) ── */}
      {finished && showResult && (
        <div className="border-t border-border/50 pt-1 text-center text-[10px] text-muted-foreground">
          {match.resultHome90}–{match.resultAway90}
          {match.resultHomeET != null && (
            <span> · ET {match.resultHomeET}–{match.resultAwayET}</span>
          )}
          {match.resultHomePen != null && (
            <span> · PEN {match.resultHomePen}–{match.resultAwayPen}</span>
          )}
          {prediction && (
            <span className="ml-1.5 font-semibold text-[var(--accent)]">
              +{prediction.ptsTotal}pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}
