import { useEffect, useMemo } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { MatchCard } from '../components/MatchCard';

export function ResultsPage() {
  const matches = useMatchesStore((s) => s.matches);
  const isLoaded = useMatchesStore((s) => s.isLoaded);
  const fetchAll = useMatchesStore((s) => s.fetchAll);
  const predictions = usePredictionsStore((s) => s.predictions);
  const fetchMyPredictions = usePredictionsStore((s) => s.fetchMyPredictions);

  useEffect(() => {
    if (!isLoaded) void fetchAll();
    void fetchMyPredictions();
  }, [isLoaded, fetchAll, fetchMyPredictions]);

  const finished = useMemo(
    () =>
      matches
        .filter((m) => m.matchStatus === 'FINISHED')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [matches],
  );

  const predByMatch = useMemo(
    () => new Map(predictions.map((p) => [p.matchId, p])),
    [predictions],
  );

  return (
    <div className="page results-page">
      <h1>Resultados</h1>
      {finished.length === 0 ? (
        <p>Aún no hay resultados.</p>
      ) : (
        finished.map((m) => (
          <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id)} showResult />
        ))
      )}
    </div>
  );
}
