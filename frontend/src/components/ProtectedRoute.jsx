import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (user === undefined) return null; // still loading

  if (!user) return <Navigate to="/" replace />;

  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;

  return children;
}
