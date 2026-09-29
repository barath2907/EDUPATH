import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1e33] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-300/60 text-sm">Loading EduPath...</p>
        </div>
      </div>
    );
  }

  // Allow through if student profile, user, or session exists
  if (!profile && !user && !session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
