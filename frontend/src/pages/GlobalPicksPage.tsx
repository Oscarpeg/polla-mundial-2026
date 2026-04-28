import { useEffect, useMemo, useState } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { TeamSelector } from '../components/TeamSelector';
import { GLOBAL_PICKS_DEADLINE, isPastGlobalDeadline } from '../utils';
import type { Team } from '../types';

export function GlobalPicksPage() {
  const matches = useMatchesStore((s) => s.matches);
  const isLoaded = useMatchesStore((s) => s.isLoaded);
  const fetchAll = useMatchesStore((s) => s.fetchAll);

  const globalPrediction = usePredictionsStore((s) => s.globalPrediction);
  const fetchGlobalPrediction = usePredictionsStore((s) => s.fetchGlobalPrediction);
  const saveGlobalPick = usePredictionsStore((s) => s.saveGlobalPick);

  useEffect(() => {
    if (!isLoaded) void fetchAll();
    void fetchGlobalPrediction();
  }, [isLoaded, fetchAll, fetchGlobalPrediction]);

  const teams = useMemo<Team[]>(() => {
    const map = new Map<string, Team>();
    for (const m of matches) {
      if (m.homeTeam) map.set(m.homeTeam.id, m.homeTeam);
      if (m.awayTeam) map.set(m.awayTeam.id, m.awayTeam);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const [championId, setChampionId] = useState('');
  const [runnerUpId, setRunnerUpId] = useState('');
  const [thirdId, setThirdId] = useState('');
  const [fourthId, setFourthId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setChampionId(globalPrediction?.championId ?? '');
    setRunnerUpId(globalPrediction?.runnerUpId ?? '');
    setThirdId(globalPrediction?.thirdId ?? '');
    setFourthId(globalPrediction?.fourthId ?? '');
  }, [globalPrediction?.id, globalPrediction?.championId, globalPrediction?.runnerUpId, globalPrediction?.thirdId, globalPrediction?.fourthId]);

  const past = isPastGlobalDeadline();
  const exclude = [championId, runnerUpId, thirdId, fourthId].filter(Boolean);
  const ready = championId && runnerUpId && thirdId && fourthId;

  const onSave = async () => {
    setError(null);
    setSaved(false);
    try {
      await saveGlobalPick({ championId, runnerUpId, thirdId, fourthId });
      setSaved(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al guardar');
    }
  };

  return (
    <div className="page global-picks-page">
      <h1>Picks globales</h1>
      <p>
        <strong>Deadline:</strong> {GLOBAL_PICKS_DEADLINE.toLocaleString('es-CO')}{' '}
        {past && <em>(cerrado)</em>}
      </p>

      <div>
        <label>
          Campeón:{' '}
          <TeamSelector teams={teams} value={championId} onChange={setChampionId} disabled={past} excludeIds={exclude} />
        </label>
      </div>
      <div>
        <label>
          Subcampeón:{' '}
          <TeamSelector teams={teams} value={runnerUpId} onChange={setRunnerUpId} disabled={past} excludeIds={exclude} />
        </label>
      </div>
      <div>
        <label>
          3er puesto:{' '}
          <TeamSelector teams={teams} value={thirdId} onChange={setThirdId} disabled={past} excludeIds={exclude} />
        </label>
      </div>
      <div>
        <label>
          4to puesto:{' '}
          <TeamSelector teams={teams} value={fourthId} onChange={setFourthId} disabled={past} excludeIds={exclude} />
        </label>
      </div>

      <button type="button" onClick={onSave} disabled={past || !ready}>
        Guardar picks globales
      </button>
      {saved && <p>✓ Guardado</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
