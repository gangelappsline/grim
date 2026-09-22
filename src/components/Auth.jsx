import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';

/**
 * Ruta protegida: si NO hay token, redirige a /login
 * Se usa con `<Route element={<ProtectedRoute />}>` y `<Outlet />`
 */
export function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/**
 * Ruta pública (login): si YA hay token, redirige a /
 */
export function PublicRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}