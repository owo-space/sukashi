import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { loading, authed, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Spin size="large" />
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
