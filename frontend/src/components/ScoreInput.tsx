interface Props {
  home: number | null | undefined;
  away: number | null | undefined;
  onChange: (home: number, away: number) => void;
  disabled?: boolean;
  homeLabel?: string;
  awayLabel?: string;
}

function parseNonNegative(v: string): number {
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export function ScoreInput({ home, away, onChange, disabled, homeLabel, awayLabel }: Props) {
  const h = home ?? 0;
  const a = away ?? 0;
  return (
    <div className="score-input">
      <input
        type="number"
        min={0}
        value={home ?? ''}
        disabled={disabled}
        aria-label={homeLabel ?? 'Local'}
        onChange={(e) => onChange(parseNonNegative(e.target.value), a)}
      />
      <span>-</span>
      <input
        type="number"
        min={0}
        value={away ?? ''}
        disabled={disabled}
        aria-label={awayLabel ?? 'Visitante'}
        onChange={(e) => onChange(h, parseNonNegative(e.target.value))}
      />
    </div>
  );
}
