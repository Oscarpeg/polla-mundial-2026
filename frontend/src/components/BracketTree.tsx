import type { Match, MatchPhase, Prediction } from '../types';
import { BracketCard } from './BracketCard';

// ── phase definitions ─────────────────────────────────────────────────────────

const MAIN_PHASES: { phase: MatchPhase; label: string }[] = [
  { phase: 'R32',   label: 'Ronda 32' },
  { phase: 'R16',   label: 'Octavos'  },
  { phase: 'QF',    label: 'Cuartos'  },
  { phase: 'SF',    label: 'Semis'    },
  { phase: 'FINAL', label: 'Final'    },
];

// Third place is shown separately (not in the main bracket flow)
const THIRD_PHASE: { phase: MatchPhase; label: string } = {
  phase: 'THIRD',
  label: '3er lugar',
};

// ── helpers ───────────────────────────────────────────────────────────────────

/** Split a flat array into sequential pairs. */
function toPairs<T>(items: T[]): [T, T | undefined][] {
  const result: [T, T | undefined][] = [];
  for (let i = 0; i < items.length; i += 2) {
    result.push([items[i], items[i + 1]]);
  }
  return result;
}

// ── sub-components ────────────────────────────────────────────────────────────

interface BracketColumnProps {
  label: string;
  matches: Match[];
  predByMatch: Map<string, Prediction>;
  showResult?: boolean;
  /** When true the right-side connector is NOT rendered (last column). */
  isLast?: boolean;
}

function BracketColumn({ label, matches, predByMatch, showResult, isLast }: BracketColumnProps) {
  if (matches.length === 0) return null;

  const pairs = toPairs(matches);

  return (
    <div className="flex shrink-0 flex-col" style={{ minWidth: 210 }}>
      {/* column header */}
      <p className="mb-3 text-sm font-semibold text-muted-foreground">{label}</p>

      {/* pairs */}
      <div className="flex flex-col gap-6">
        {pairs.map(([m1, m2], idx) => {
          const hasPair = !!m2;

          return (
            <div key={idx} className="flex items-stretch">
              {/* match cards */}
              <div className={`flex flex-1 min-w-0 flex-col${hasPair ? ' gap-2' : ''}`}>
                <BracketCard
                  match={m1}
                  prediction={predByMatch.get(m1.id)}
                  showResult={showResult}
                />
                {m2 && (
                  <BracketCard
                    match={m2}
                    prediction={predByMatch.get(m2.id)}
                    showResult={showResult}
                  />
                )}
              </div>

              {/*
                ── CSS connector ──────────────────────────────────────────────
                Two flex-1 divs fill equal halves of the pair's total height.
                border-r + border-b on top half draws ╗
                border-r + border-t on bottom half draws ╝
                Together: two cards visually "fork" into one winner slot.
              */}
              {hasPair && !isLast && (
                <div className="ml-1 flex w-4 shrink-0 flex-col">
                  <div className="flex-1 border-b border-r border-border/50" />
                  <div className="flex-1 border-r border-t border-border/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── public component ──────────────────────────────────────────────────────────

interface Props {
  matches: Match[];
  predictions: Prediction[];
  showResult?: boolean;
}

export function BracketTree({ matches, predictions, showResult }: Props) {
  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const byPhase = (phase: MatchPhase) => matches.filter((m) => m.phase === phase);

  const thirdMatches = byPhase(THIRD_PHASE.phase);

  return (
    /* G2 — horizontal scroll on mobile */
    <div className="w-full overflow-x-auto">
      <div className="flex gap-5 pb-6" style={{ minWidth: 'max-content' }}>

        {/* ── main bracket columns ─────────────────────────────────────── */}
        {MAIN_PHASES.map(({ phase, label }, colIdx) => {
          const phaseMatches = byPhase(phase);
          if (phaseMatches.length === 0) return null;

          const isLast = colIdx === MAIN_PHASES.length - 1;

          return (
            <BracketColumn
              key={phase}
              label={label}
              matches={phaseMatches}
              predByMatch={predByMatch}
              showResult={showResult}
              isLast={isLast}
            />
          );
        })}

        {/* ── third-place match (separate from main bracket) ───────────── */}
        {thirdMatches.length > 0 && (
          <>
            {/* visual separator */}
            <div className="w-px self-stretch bg-border/40 mx-1" />
            <BracketColumn
              label={THIRD_PHASE.label}
              matches={thirdMatches}
              predByMatch={predByMatch}
              showResult={showResult}
              isLast
            />
          </>
        )}

      </div>
    </div>
  );
}
