import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@heroui/react";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

/**
 * Gate a route on the auth state. While `useAuth` is bootstrapping, render
 * a centred spinner instead of bouncing through /login.
 */
export function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { loading, authed, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (!authed) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
