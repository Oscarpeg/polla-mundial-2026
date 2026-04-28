import { useEffect, useState } from 'react';
import type { Match, PickInput, Prediction } from '../types';
import { ScoreInput } from './ScoreInput';
import { usePredictionsStore } from '../store/predictionsStore';
import { formatDateTime, isMatchLocked, useDebouncedCallback } from '../utils';

interface Props {
  match: Match;
  prediction?: Prediction;
  showResult?: boolean;
}

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

  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHome(prediction?.pickHome90 ?? null);
    setAway(prediction?.pickAway90 ?? null);
    setHomeET(prediction?.pickHomeET ?? null);
    setAwayET(prediction?.pickAwayET ?? null);
    setHomePen(prediction?.pickHomePen ?? null);
    setAwayPen(prediction?.pickAwayPen ?? null);
  }, [prediction?.id, prediction?.pickHome90, prediction?.pickAway90, prediction?.pickHomeET, prediction?.pickAwayET, prediction?.pickHomePen, prediction?.pickAwayPen]);

  const draw90 = home !== null && away !== null && home === away;
  const showET = isKnockout && draw90;
  const showPen = showET && homeET === 0 && awayET === 0;

  const buildPayload = (h: number, a: number, hE: number | null, aE: number | null, hP: number | null, aP: number | null): PickInput => {
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

  const doSave = async (h: number, a: number, hE: number | null, aE: number | null, hP: number | null, aP: number | null) => {
    if (locked || tbd) return;
    setError(null);
    try {
      await savePick(match.id, buildPayload(h, a, hE, aE, hP, aP));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al guardar');
    }
  };

  const debouncedSave = useDebouncedCallback(doSave, 800);

  const onScore90 = (h: number, a: number) => {
    setHome(h);
    setAway(a);
    debouncedSave(h, a, homeET, awayET, homePen, awayPen);
  };

  const onScoreET = (h: number, a: number) => {
    setHomeET(h);
    setAwayET(a);
    if (home !== null && away !== null) {
      debouncedSave(home, away, h, a, homePen, awayPen);
    }
  };

  const onScorePen = (h: number, a: number) => {
    setHomePen(h);
    setAwayPen(a);
    if (home !== null && away !== null) {
      debouncedSave(home, away, homeET, awayET, h, a);
    }
  };

  const onClickSave = () => {
    if (home === null || away === null) return;
    void doSave(home, away, homeET, awayET, homePen, awayPen);
  };

  const canEdit = !locked && !tbd;

  return (
    <div className="match-card">
      <div className="match-meta">
        <small>{formatDateTime(match.scheduledAt)}{match.venue ? ` · ${match.venue}` : ''}</small>
      </div>
      <div className="teams">
        <span className="team home">
          {match.homeTeam?.flagUrl ? <img src={match.homeTeam.flagUrl} alt="" width={20} /> : null}
          {match.homeTeam?.name ?? 'TBD'}
        </span>
        <span className="vs">vs</span>
        <span className="team away">
          {match.awayTeam?.name ?? 'TBD'}
          {match.awayTeam?.flagUrl ? <img src={match.awayTeam.flagUrl} alt="" width={20} /> : null}
        </span>
      </div>

      <ScoreInput home={home} away={away} onChange={onScore90} disabled={!canEdit} />

      {showET && (
        <div className="extra-time">
          <small>Prórroga (acumulado):</small>
          <ScoreInput home={homeET} away={awayET} onChange={onScoreET} disabled={!canEdit} />
        </div>
      )}

      {showPen && (
        <div className="penalties">
          <small>Penales:</small>
          <ScoreInput home={homePen} away={awayPen} onChange={onScorePen} disabled={!canEdit} />
        </div>
      )}

      {canEdit && (
        <button type="button" onClick={onClickSave} disabled={home === null || away === null}>
          Guardar
        </button>
      )}
      {savedFlash && <span className="flash">✓ Guardado</span>}
      {error && <span className="error">{error}</span>}
      {locked && !finished && <small className="locked">Cerrado para ediciones</small>}

      {finished && showResult && (
        <div className="result">
          <strong>
            Resultado: {match.resultHome90}-{match.resultAway90}
            {match.resultHomeET !== null && match.resultHomeET !== undefined &&
              ` (ET ${match.resultHomeET}-${match.resultAwayET})`}
            {match.resultHomePen !== null && match.resultHomePen !== undefined &&
              ` (PEN ${match.resultHomePen}-${match.resultAwayPen})`}
          </strong>
          {prediction && (
            <div className="points">
              <span>Ganador (+{prediction.ptsWinner})</span>
              <span> · Marcador exacto (+{prediction.ptsExact})</span>
              {isKnockout && (
                <>
                  <span> · Prórroga (+{prediction.ptsET + prediction.ptsETExact})</span>
                  <span> · Penales (+{prediction.ptsPen + prediction.ptsPenExact})</span>
                </>
              )}
              <strong> · Total: {prediction.ptsTotal}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
