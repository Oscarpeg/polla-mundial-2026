import { cn } from '@/lib/utils';
import type { Team } from '../types';

interface Props {
  teams: Team[];
  value: string | null | undefined;
  onChange: (teamId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
  className?: string;
}

export function TeamSelector({ teams, value, onChange, placeholder, disabled, excludeIds = [], className }: Props) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm',
        'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <option value="">{placeholder ?? 'Seleccionar equipo'}</option>
      {teams.map((t) => {
        const blocked = excludeIds.includes(t.id) && t.id !== value;
        return (
          <option key={t.id} value={t.id} disabled={blocked}>
            {t.name} ({t.code})
          </option>
        );
      })}
    </select>
  );
}
