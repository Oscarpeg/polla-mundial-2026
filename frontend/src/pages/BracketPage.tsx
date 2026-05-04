import { useEffect, useMemo } from 'react';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { BracketTree } from '../components/BracketTree';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function BracketSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {[16, 8, 4, 2, 1].map((n, i) => (
        <div key={i} className="flex shrink-0 flex-col gap-3" style={{ minWidth: 210 }}>
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: Math.ceil(n / 2) }, (_, j) => (
            <Skeleton key={j} className="h-[72px] rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bracket eliminatorio</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tus pronósticos para la fase eliminatoria
        </p>
      </div>

      {!isLoaded ? (
        <BracketSkeleton />
      ) : !r32Activated ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            El administrador aún no ha definido los cruces de la Ronda de 32.
          </CardContent>
        </Card>
      ) : (
        <BracketTree matches={knockout} predictions={predictions} />
      )}
    </div>
  );
}
