import { cn } from '@/lib/utils';

interface Props {
  home: number | null | undefined;
  away: number | null | undefined;
  onChange: (home: number, away: number) => void;
  disabled?: boolean;
  homeLabel?: string;
  awayLabel?: string;
  size?: 'default' | 'lg';
}

function parseNonNegative(v: string): number {
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

const baseInput =
  'rounded-lg border border-input bg-background text-center font-bold tabular-nums ' +
  'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export function ScoreInput({ home, away, onChange, disabled, homeLabel, awayLabel, size = 'default' }: Props) {
  const h = home ?? 0;
  const a = away ?? 0;

  const inputCls = cn(
    baseInput,
    size === 'lg'
      ? 'w-14 h-14 text-2xl'
      : 'w-10 h-8 text-sm',
  );

  const sepCls = size === 'lg'
    ? 'text-xl font-bold text-muted-foreground px-0.5'
    : 'text-sm text-muted-foreground';

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={home ?? ''}
        disabled={disabled}
        aria-label={homeLabel ?? 'Local'}
        className={inputCls}
        onChange={(e) => onChange(parseNonNegative(e.target.value), a)}
      />
      <span className={sepCls}>–</span>
      <input
        type="number"
        min={0}
        value={away ?? ''}
        disabled={disabled}
        aria-label={awayLabel ?? 'Visitante'}
        className={inputCls}
        onChange={(e) => onChange(h, parseNonNegative(e.target.value))}
      />
    </div>
  );
}
