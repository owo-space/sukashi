import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({
  children,
  adminOnly = false
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { authed, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        加载中…
      </div>
    );
  }
  if (!authed) {
    const target = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={target} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
