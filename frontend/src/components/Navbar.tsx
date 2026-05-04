import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV_LINKS = [
  { to: '/fixture', label: 'Fixture' },
  { to: '/bracket', label: 'Bracket' },
  { to: '/global-picks', label: 'Picks globales' },
  { to: '/preview', label: 'Preview' },
  { to: '/results', label: 'Resultados' },
  { to: '/leaderboard', label: 'Leaderboard' },
] as const;

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]'
        : 'text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--surface)]',
    ].join(' ');

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-4 h-14">
        <span className="font-bold text-[var(--text-h)] shrink-0 mr-2">⚽ PM26</span>

        <nav
          className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
          aria-label="Navegación principal"
        >
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}
          {user.isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]"
            title={user.username}
          >
            {initials}
          </div>
          <span className="hidden sm:block text-sm text-[var(--text)] max-w-[120px] truncate">
            {user.username}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] text-[var(--text)] hover:text-[var(--text-h)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
