import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, Calculator, BookOpen, MessageSquare,
  FileText, BarChart2, LogOut, Menu, X, GraduationCap, Bell,
  ChevronRight, WifiOff, ShieldCheck, ArrowLeft, Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { SUPPORTED_LANGUAGES, setLanguage, type LangCode } from "../i18n";
import { EduPathAPI } from "../lib/apiClient";

const NAV_DEFS = [
  { path: "/dashboard",       icon: LayoutDashboard, key: "nav.dashboard" },
  { path: "/profile",         icon: User,            key: "nav.profile" },
  { path: "/calculator",      icon: Calculator,      key: "nav.calculator" },
  { path: "/recommendations", icon: BookOpen,        key: "nav.recommendations" },
  { path: "/counsellor",      icon: MessageSquare,   key: "nav.counsellor" },
  { path: "/report",          icon: FileText,        key: "nav.report" },
  { path: "/compare",         icon: BarChart2,       key: "nav.compare" },
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { isLocalMode } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    EduPathAPI.notifications.get().then(setNotifications).catch(() => {});
  }, []);

  const handleLangChange = (code: LangCode) => setLanguage(code);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile?.display_name ?? "Student";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0f1e33] z-30 flex flex-col transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl text-white leading-none">EduPath</h1>
              <p className="text-[10px] text-blue-300 mt-0.5 tracking-wider uppercase">{t("nav.tnea")}</p>
            </div>
          </div>
        </div>

        {/* Student info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <span className="text-amber-400 font-semibold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-blue-300 text-xs truncate font-mono">{profile?.phone ?? "Phone login"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-blue-400/60 text-[10px] font-semibold tracking-widest uppercase px-3 mb-2">{t("nav.menu")}</p>
          {NAV_DEFS.map(({ path, icon: Icon, key }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 group transition-all duration-200
                  ${active
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                    : "text-blue-200/70 hover:bg-white/8 hover:text-white"
                  }`}
              >
                <Icon size={17} className={active ? "text-white" : "text-blue-400/70 group-hover:text-white"} />
                <span className="text-sm font-medium">{t(key)}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Language switcher + Admin + Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          {/* Language toggle */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <Globe size={14} className="text-blue-400/60 shrink-0" />
            <div className="flex gap-1 flex-1">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code as LangCode)}
                  className={`flex-1 text-xs py-1 rounded-lg font-medium transition-all
                    ${i18n.language === lang.code
                      ? "bg-amber-500 text-white"
                      : "text-blue-300/60 hover:text-white hover:bg-white/10"}`}
                >
                  {lang.native}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all duration-200
              ${location.pathname === "/admin"
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                : "text-blue-200/70 hover:bg-white/8 hover:text-white"
              }`}
          >
            <ShieldCheck size={17} className={location.pathname === "/admin" ? "text-white" : "text-blue-400/70 group-hover:text-white"} />
            <span className="text-sm font-medium">{t("nav.dataImport")}</span>
            {location.pathname === "/admin" && <ChevronRight size={14} className="ml-auto" />}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-300/60 hover:text-red-400 hover:bg-red-400/10 w-full transition-all duration-200"
          >
            <LogOut size={17} />
            <span className="text-sm font-medium">{t("common.signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          {/* Left: hamburger (mobile) + back button */}
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Back button — hidden on dashboard */}
            {location.pathname !== "/dashboard" && (
              <button
                onClick={() => {
                  if (window.history.length > 2) navigate(-1);
                  else navigate("/dashboard");
                }}
                className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#0f1e33] transition-colors"
                title="Go back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            {/* Dashboard icon shortcut (desktop, non-dashboard pages) */}
            {location.pathname !== "/dashboard" && (
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden lg:flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#0f1e33] transition-colors"
                title="Dashboard"
              >
                <LayoutDashboard size={16} />
              </button>
            )}
          </div>

          {/* Breadcrumb / page title */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-[#0f1e33]">
              {NAV_DEFS.find(n => n.path === location.pathname)
                ? t(NAV_DEFS.find(n => n.path === location.pathname)!.key)
                : location.pathname === "/admin" ? t("nav.dataImport") : "EduPath"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <ShieldCheck size={13} className="text-amber-500" /> {t("nav.dataImport")}
            </Link>
            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="TNEA Notifications"
              >
                <Bell size={18} />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                )}
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-amber-500" />
                      <h4 className="font-semibold text-sm text-[#0f1e33]">TNEA Official Alerts</h4>
                    </div>
                    <span className="text-[11px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                      Live Backend Feed
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto mt-2 space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className="pt-2 text-xs">
                        <div className="flex items-center justify-between font-medium text-[#0f1e33] mb-0.5">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-gray-400">{n.date}</span>
                        </div>
                        <p className="text-gray-500 text-[11px] leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Visible only on mobile/tablet screens < lg) */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0f1e33]/95 backdrop-blur-md border-t border-white/10 lg:hidden px-2 py-1.5 flex items-center justify-around shadow-2xl">
          {[
            { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
            { path: "/calculator", icon: Calculator, label: "Cutoff" },
            { path: "/recommendations", icon: BookOpen, label: "Colleges" },
            { path: "/counsellor", icon: MessageSquare, label: "AI Chat" },
            { path: "/profile", icon: User, label: "Profile" },
          ].map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px]
                  ${isActive ? "text-amber-400 font-semibold" : "text-blue-300/60 hover:text-white"}`}
              >
                <Icon size={19} className={isActive ? "text-amber-400 scale-110 transition-transform" : "text-blue-300/60"} />
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
