import type { Match, MatchPhase, Prediction } from '../types';
import { MatchCard } from './MatchCard';

interface Props {
  matches: Match[];
  predictions: Prediction[];
  showResult?: boolean;
}

const PHASES: Array<{ phase: MatchPhase; label: string }> = [
  { phase: 'R32', label: 'Ronda de 32' },
  { phase: 'R16', label: 'Octavos (R16)' },
  { phase: 'QF', label: 'Cuartos' },
  { phase: 'SF', label: 'Semifinales' },
  { phase: 'THIRD', label: 'Tercer puesto' },
  { phase: 'FINAL', label: 'Final' },
];

export function BracketTree({ matches, predictions, showResult }: Props) {
  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));
  return (
    <div className="bracket-tree">
      {PHASES.map(({ phase, label }) => {
        const phaseMatches = matches.filter((m) => m.phase === phase);
        if (phaseMatches.length === 0) return null;
        return (
          <section key={phase} className="bracket-column">
            <h3>{label}</h3>
            {phaseMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predByMatch.get(m.id)}
                showResult={showResult}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
