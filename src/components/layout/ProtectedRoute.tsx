import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "../ui/Spinner";

/**
 * Auth guard — redirects to /login when there's no active session,
 * and to /onboarding when the user hasn't set up a company yet.
 * Shows a full-screen loader while the session is being restored.
 */
export default function ProtectedRoute() {
  const { user, loading, onboardingRequired } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Users without a company must complete onboarding first.
  // The onboarding route itself is exempt from this redirect.
  if (onboardingRequired && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Users who already have a company shouldn't see onboarding.
  if (!onboardingRequired && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}