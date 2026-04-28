import type { Team } from '../types';

interface Props {
  teams: Team[];
  value: string | null | undefined;
  onChange: (teamId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
}

export function TeamSelector({ teams, value, onChange, placeholder, disabled, excludeIds = [] }: Props) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
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
