/**
 * PageFlow — reusable bottom navigation bar for sequential EduPath workflow.
 *
 * Workflow order:
 *  Dashboard → Profile → Calculator → Recommendations → Compare → Counsellor → Report
 *
 * Drop <PageFlow /> at the bottom of any page content to get
 * contextual ← Back and Next → buttons that follow this sequence.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";

const WORKFLOW = [
  { path: "/dashboard",      label: "Dashboard" },
  { path: "/profile",        label: "My Profile" },
  { path: "/calculator",     label: "Cutoff Calculator" },
  { path: "/recommendations",label: "Recommendations" },
  { path: "/compare",        label: "Compare Colleges" },
  { path: "/counsellor",     label: "AI Counsellor" },
  { path: "/report",         label: "My Report" },
] as const;

interface PageFlowProps {
  /** Override the "next" destination. Defaults to the next step in WORKFLOW. */
  nextPath?: string;
  nextLabel?: string;
  /** Override the "back" destination. Defaults to previous step or /dashboard. */
  backPath?: string;
  /** Hide the next button (e.g. last step). */
  hideNext?: boolean;
  /** Hide the back button. */
  hideBack?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
}

export default function PageFlow({
  nextPath,
  nextLabel,
  backPath,
  hideNext = false,
  hideBack = false,
  className = "",
}: PageFlowProps) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const currentIdx = WORKFLOW.findIndex(s => s.path === pathname);

  // Resolve back destination
  const resolvedBack = backPath
    ?? (currentIdx > 0 ? WORKFLOW[currentIdx - 1].path : "/dashboard");

  // Resolve next destination
  const nextStep = currentIdx >= 0 && currentIdx < WORKFLOW.length - 1
    ? WORKFLOW[currentIdx + 1]
    : null;
  const resolvedNextPath  = nextPath  ?? nextStep?.path;
  const resolvedNextLabel = nextLabel ?? (nextStep ? `${nextStep.label}` : "");

  const goBack = () => {
    // Use browser history if available; fall back to resolved path
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(resolvedBack);
    }
  };

  const isFirst = pathname === "/dashboard";
  const isLast  = currentIdx === WORKFLOW.length - 1;

  return (
    <div className={`border-t border-gray-100 bg-white px-6 py-4 flex items-center gap-3 ${className}`}>
      {/* Back */}
      {!hideBack && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <ArrowLeft size={15} />
          {isFirst ? "Home" : "Back"}
        </button>
      )}

      {/* Dashboard shortcut (always present) */}
      {pathname !== "/dashboard" && (
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#0f1e33] transition-colors px-2 py-2"
        >
          <LayoutDashboard size={13} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
      )}

      <div className="flex-1" />

      {/* Step indicator */}
      {currentIdx >= 0 && (
        <div className="hidden sm:flex items-center gap-1.5">
          {WORKFLOW.map((step, i) => (
            <button
              key={step.path}
              onClick={() => navigate(step.path)}
              title={step.label}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIdx
                  ? "bg-amber-500 w-4"
                  : i < currentIdx
                  ? "bg-amber-200"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1 sm:flex-none" />

      {/* Next */}
      {!hideNext && !isLast && resolvedNextPath && (
        <button
          onClick={() => navigate(resolvedNextPath)}
          className="flex items-center gap-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-amber-200"
        >
          <span className="hidden sm:inline">Next: {resolvedNextLabel}</span>
          <span className="sm:hidden">Next</span>
          <ArrowRight size={15} />
        </button>
      )}

      {/* Last step — done state */}
      {!hideNext && isLast && (
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-semibold bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl transition-all"
        >
          <LayoutDashboard size={15} />
          Back to Dashboard
        </button>
      )}
    </div>
  );
}
