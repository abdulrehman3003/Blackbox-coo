import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isSupabaseConfigured } from "../../lib/supabase";

/**
 * Placeholder auth guard — will be wired to Supabase sessions in task 3.
 * For now, env-configured Supabase means "authenticated" so pages are reachable.
 */
export default function ProtectedRoute() {
  const location = useLocation();

  if (!isSupabaseConfigured()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}