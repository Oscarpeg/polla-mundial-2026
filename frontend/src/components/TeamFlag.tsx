import type { Team } from '../types';

interface Props {
  team: Team | null | undefined;
  size?: 'sm' | 'md';
}

export function TeamFlag({ team, size = 'md' }: Props) {
  const [w, h] = size === 'sm' ? [22, 16] : [28, 20];
  if (!team?.code) {
    return <div style={{ width: w, height: h }} className="rounded-sm bg-muted" />;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${team.code.toLowerCase()}.png`}
      alt={team.name}
      width={w}
      height={h}
      className="rounded-sm object-cover shadow-sm"
      loading="lazy"
    />
  );
}
