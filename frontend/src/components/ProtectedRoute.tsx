import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/fixture" replace />;
  return <Outlet />;
}
