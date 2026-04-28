import { useEffect, useMemo } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { BracketTree } from '../components/BracketTree';

export function BracketPage() {
  const matches = useMatchesStore((s) => s.matches);
  const isLoaded = useMatchesStore((s) => s.isLoaded);
  const fetchAll = useMatchesStore((s) => s.fetchAll);
  const predictions = usePredictionsStore((s) => s.predictions);
  const fetchMyPredictions = usePredictionsStore((s) => s.fetchMyPredictions);

  useEffect(() => {
    if (!isLoaded) void fetchAll();
    void fetchMyPredictions();
  }, [isLoaded, fetchAll, fetchMyPredictions]);

  const knockout = useMemo(
    () => matches.filter((m) => m.phase !== 'GROUPS'),
    [matches],
  );

  const r32Activated = useMemo(
    () => knockout.some((m) => m.phase === 'R32' && (m.homeTeam || m.awayTeam)),
    [knockout],
  );

  return (
    <div className="page bracket-page">
      <h1>Bracket eliminatorio</h1>
      {!r32Activated ? (
        <p>El administrador aún no ha definido los terceros clasificados.</p>
      ) : (
        <BracketTree matches={knockout} predictions={predictions} />
      )}
    </div>
  );
}
