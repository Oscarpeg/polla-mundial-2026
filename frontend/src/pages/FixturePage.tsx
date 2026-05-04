import { useEffect, useMemo } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { MatchCard } from '../components/MatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Match } from '../types';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-20" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </CardContent>
    </Card>
  );
}

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fixture — Fase de grupos</h1>
        <p className="text-sm text-muted-foreground">Ingresa tu pronóstico antes de que cada partido se cierre</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {!isLoaded
          ? Array.from({ length: 6 }, (_, i) => <GroupSkeleton key={i} />)
          : GROUPS.map((g) => {
              const list = groupMatches.get(g) ?? [];
              if (list.length === 0) return null;
              return (
                <Card key={g}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Grupo {g}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {list.map((m) => (
                      <MatchCard key={m.id} match={m} prediction={predByMatch.get(m.id)} />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
