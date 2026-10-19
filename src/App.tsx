import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import SplashScreen from "./components/SplashScreen";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CutoffCalculator from "./pages/CutoffCalculator";
import Recommendations from "./pages/Recommendations";
import Counsellor from "./pages/Counsellor";
import Report from "./pages/Report";
import CollegeComparison from "./pages/CollegeComparison";
import CutoffTrends from "./pages/CutoffTrends";
import Insights from "./pages/Insights";
import Admin from "./pages/Admin";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

// Show splash safely once per browser session
function checkSplashSeen(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage?.getItem("edupath_splash") === "1";
  } catch {
    return true; // if storage blocked, don't block user with splash
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(!checkSplashSeen());

  const handleSplashDone = () => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage?.setItem("edupath_splash", "1");
      }
    } catch {}
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashDone} duration={2800} />}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes — require Supabase session */}
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
            <Route path="/calculator" element={<ProtectedLayout><CutoffCalculator /></ProtectedLayout>} />
            <Route path="/recommendations" element={<ProtectedLayout><Recommendations /></ProtectedLayout>} />
            <Route path="/counsellor" element={<ProtectedLayout><Counsellor /></ProtectedLayout>} />
            <Route path="/report" element={<ProtectedLayout><Report /></ProtectedLayout>} />
            <Route path="/compare" element={<ProtectedLayout><CollegeComparison /></ProtectedLayout>} />
            <Route path="/trends" element={<ProtectedLayout><CutoffTrends /></ProtectedLayout>} />
            <Route path="/insights" element={<ProtectedLayout><Insights /></ProtectedLayout>} />

            <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}
