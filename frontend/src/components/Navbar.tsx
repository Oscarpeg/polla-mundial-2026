import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/fixture">Fixture</Link>
        <Link to="/bracket">Bracket</Link>
        <Link to="/global-picks">Picks globales</Link>
        <Link to="/preview">Preview</Link>
        <Link to="/results">Resultados</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        {user.isAdmin && <Link to="/admin">Admin</Link>}
      </div>
      <div className="nav-user">
        <span>{user.username}</span>
        <button type="button" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </nav>
  );
}
