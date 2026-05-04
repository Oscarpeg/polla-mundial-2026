import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMatchesStore } from '../store/matchesStore';
import { usePredictionsStore } from '../store/predictionsStore';
import { TeamSelector } from '../components/TeamSelector';
import { TeamFlag } from '../components/TeamFlag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GLOBAL_PICKS_DEADLINE, isPastGlobalDeadline } from '../utils';
import type { Team } from '../types';

const PICKS = [
  { key: 'champion',  label: 'Campeón',     medal: '🥇' },
  { key: 'runnerUp',  label: 'Subcampeón',  medal: '🥈' },
  { key: 'third',     label: '3er puesto',  medal: '🥉' },
  { key: 'fourth',    label: '4° puesto',   medal: '🏅' },
] as const;

type PickKey = typeof PICKS[number]['key'];

function teamById(teams: Team[], id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

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

  const [picks, setPicks] = useState<Record<PickKey, string>>({
    champion: '',
    runnerUp: '',
    third: '',
    fourth: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPicks({
      champion:  globalPrediction?.championId  ?? '',
      runnerUp:  globalPrediction?.runnerUpId  ?? '',
      third:     globalPrediction?.thirdId     ?? '',
      fourth:    globalPrediction?.fourthId    ?? '',
    });
  }, [
    globalPrediction?.id,
    globalPrediction?.championId,
    globalPrediction?.runnerUpId,
    globalPrediction?.thirdId,
    globalPrediction?.fourthId,
  ]);

  const past = isPastGlobalDeadline();
  const exclude = Object.values(picks).filter(Boolean);
  const ready = Object.values(picks).every(Boolean);

  const onSave = async () => {
    setIsSaving(true);
    try {
      await saveGlobalPick({
        championId: picks.champion,
        runnerUpId: picks.runnerUp,
        thirdId:    picks.third,
        fourthId:   picks.fourth,
      });
      toast.success('Picks globales guardados');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Picks globales</h1>
        <p className="text-sm text-muted-foreground">¿Quién ganará el Mundial 2026?</p>
      </div>

      {/* deadline banner */}
      <Card className={past ? 'border-border/40 opacity-70' : ''}>
        <CardContent className="flex items-center justify-between py-3 px-4">
          <div>
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="text-sm font-medium">
              {GLOBAL_PICKS_DEADLINE.toLocaleString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {past
            ? <Badge variant="secondary">Cerrado</Badge>
            : <Badge className="border-green-300 bg-green-500/15 text-green-700">Abierto</Badge>
          }
        </CardContent>
      </Card>

      {/* pick cards 2×2 */}
      {!isLoaded ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {PICKS.map(({ key, label, medal }) => {
            const selected = teamById(teams, picks[key]);
            return (
              <Card key={key}>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="text-xl">{medal}</span>
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {selected ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                      <TeamFlag team={selected} size="sm" />
                      <span className="text-xs font-semibold">{selected.name}</span>
                    </div>
                  ) : (
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                      Sin selección
                    </div>
                  )}
                  <TeamSelector
                    teams={teams}
                    value={picks[key]}
                    onChange={(id) => setPicks((prev) => ({ ...prev, [key]: id }))}
                    disabled={past}
                    excludeIds={exclude}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* save button */}
      <Button
        onClick={onSave}
        disabled={past || !ready || isSaving}
        className="w-full border-0 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 sm:w-auto"
        size="lg"
      >
        {isSaving ? 'Guardando…' : 'Guardar picks globales'}
      </Button>
    </div>
  );
}
