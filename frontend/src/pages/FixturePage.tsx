import { useEffect, useMemo } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { MatchCard } from '../components/MatchCard';
import type { Match } from '../types';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export function FixturePage() {
  const matches = useMatchesStore((s) => s.matches);
  const isLoaded = useMatchesStore((s) => s.isLoaded);
  const fetchAll = useMatchesStore((s) => s.fetchAll);
  const predictions = usePredictionsStore((s) => s.predictions);
  const fetchMyPredictions = usePredictionsStore((s) => s.fetchMyPredictions);

  useEffect(() => {
    if (!isLoaded) void fetchAll();
    void fetchMyPredictions();
  }, [isLoaded, fetchAll, fetchMyPredictions]);

  const predByMatch = useMemo(
    () => new Map(predictions.map((p) => [p.matchId, p])),
    [predictions],
  );

  const groupMatches = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const g of GROUPS) map.set(g, []);
    for (const m of matches) {
      if (m.phase !== 'GROUPS') continue;
      const g = m.homeTeam?.group;
      if (g) map.get(g)?.push(m);
    }
    return map;
  }, [matches]);

  return (
    <div className="page fixture-page">
      <h1>Fixture — Fase de grupos</h1>
      {GROUPS.map((g) => {
        const list = groupMatches.get(g) ?? [];
        return (
          <section key={g}>
            <h2>Grupo {g}</h2>
            {list.length === 0 ? (
              <p><em>Cargando...</em></p>
            ) : (
              list.map((m) => (
                <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id)} />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
