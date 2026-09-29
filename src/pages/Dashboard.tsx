import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calculator, BookOpen, MessageSquare, FileText, ArrowRight,
  TrendingUp, Award, MapPin, Clock, CheckCircle, AlertCircle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getCutoffHistory, type YearlyCutoff } from "../lib/tneaData";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { useAuth } from "../contexts/AuthContext";
import { EduPathAPI } from "../lib/apiClient";
import { useTranslation } from "react-i18next";

const quickActionDefs = [
  { to: "/calculator", icon: Calculator, labelKey: "dashboard.calculateCutoff", descKey: "dashboard.uploadMarksheet", color: "bg-blue-500/15 text-blue-400" },
  { to: "/recommendations", icon: BookOpen, labelKey: "dashboard.viewColleges", descKey: "dashboard.seeRecommendations", color: "bg-purple-500/15 text-purple-400" },
  { to: "/counsellor", icon: MessageSquare, labelKey: "dashboard.askCounsellor", descKey: "dashboard.aiGuidance", color: "bg-amber-500/15 text-amber-400" },
  { to: "/report", icon: FileText, labelKey: "dashboard.getReport", descKey: "dashboard.downloadPdf", color: "bg-green-500/15 text-green-400" },
];

export default function Dashboard() {
  const { user, profile, academicRecord: authAcademic, savedColleges, counsellingHistory } = useAuth();
  const { t } = useTranslation();
  const [academicRecord, setAcademicRecord] = useState<any>(authAcademic);
  const [savedCount, setSavedCount] = useState(savedColleges ? savedColleges.length : 0);
  const [chatCount, setChatCount] = useState(counsellingHistory ? counsellingHistory.length : 0);
  const [loading, setLoading] = useState(!authAcademic);
  const [trendData, setTrendData] = useState<YearlyCutoff[]>([]);

  useEffect(() => {
    getCutoffHistory().then(setTrendData);
  }, []);

  useEffect(() => {
    if (authAcademic) {
      setAcademicRecord(authAcademic);
      setSavedCount(savedColleges ? savedColleges.length : 0);
      setChatCount(counsellingHistory ? counsellingHistory.length : 0);
      setLoading(false);
    } else if (user) {
      EduPathAPI.profile.get()
        .then(account => {
          if (account) {
            setAcademicRecord(account.academicRecord);
            setSavedCount(account.savedColleges?.length ?? 0);
            setChatCount(account.counsellingHistory?.length ?? 0);
          }
        })
        .catch(err => console.warn("Backend profile sync error in dashboard:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, authAcademic, savedColleges, counsellingHistory]);

  const displayName = profile?.display_name ?? "Student";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const cutoff = academicRecord?.cutoff ?? null;
  const daysLeft = 24; // Would come from a schedule table

  const profileSteps = [
    { labelKey: "dashboard.steps.accountCreated", done: true },
    { labelKey: "dashboard.steps.profileCompleted", done: !!profile?.profile_complete },
    { labelKey: "dashboard.steps.marksEntered", done: !!academicRecord },
    { labelKey: "dashboard.steps.cutoffCalculated", done: !!cutoff },
    { labelKey: "dashboard.steps.collegesReviewed", done: savedCount > 0 },
    { labelKey: "dashboard.steps.reportDownloaded", done: false },
  ];
  const completedSteps = profileSteps.filter(s => s.done).length;
  const progress = (completedSteps / profileSteps.length) * 100;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <SyncStatusBanner />
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1">
          {t("dashboard.greeting", { name: displayName.split(" ")[0] })}
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            labelKey: "dashboard.yourCutoff", icon: TrendingUp, color: "text-amber-500",
            value: loading ? "—" : cutoff ? cutoff.toFixed(1) : t("common.notSet"),
            subKey: cutoff ? "dashboard.cutoffSub" : "common.calculateNow",
          },
          {
            labelKey: "dashboard.savedColleges", icon: Award, color: "text-blue-500",
            value: loading ? "—" : String(savedCount),
            subKey: savedCount > 0 ? "dashboard.collegesBookmarked" : "dashboard.noneSaved",
          },
          {
            labelKey: "common.category", icon: MapPin, color: "text-purple-500",
            value: profile?.category ?? "—",
            subKey: null,
            sub: profile?.preferred_district ?? t("dashboard.tamilNadu"),
          },
          {
            labelKey: "dashboard.daysLeft", icon: Clock, color: "text-green-500",
            value: String(daysLeft),
            subKey: "dashboard.daysLeftSub",
          },
        ].map(({ labelKey, value, subKey, sub: staticSub, icon: Icon, color }) => (
          <div key={labelKey} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wide truncate">{t(labelKey)}</span>
              <Icon size={15} className={`${color} shrink-0`} />
            </div>
            <p className="font-display text-xl sm:text-2xl text-[#0f1e33] mb-0.5">{value}</p>
            <p className="text-gray-400 text-[11px] sm:text-xs truncate">{staticSub ?? (subKey ? t(subKey) : "")}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
            <h2 className="font-semibold text-sm sm:text-base text-[#0f1e33] mb-3 sm:mb-4">{t("dashboard.quickActions")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {quickActionDefs.map(({ to, icon: Icon, labelKey, descKey, color }) => (
                <Link key={to} to={to} className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                  <div className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl ${color} flex items-center justify-center`}><Icon size={17} /></div>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#0f1e33] text-center leading-tight">{t(labelKey)}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 text-center leading-tight line-clamp-1">{t(descKey)}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trend chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#0f1e33]">{t("dashboard.cutoffTrends")}</h2>
              <span className="text-xs text-gray-400">{t("dashboard.trendSub")}</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[170, 200]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f1e33", border: "none", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#93c5fd" }} itemStyle={{ color: "#f59e0b" }} />
                  <Line type="monotone" dataKey="avgCutoff" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Avg Cutoff" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {cutoff && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-amber-600 text-xs font-medium">
                  {cutoff > 181.7 ? t("dashboard.yourScoreAbove", { score: cutoff.toFixed(1), avg: "181.7" }) : t("dashboard.yourScoreBelow", { score: cutoff.toFixed(1), avg: "181.7" })}
                </p>
              </div>
            )}
          </div>

          {/* Next step CTA */}
          {!cutoff && (
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1e3a5f] rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-2">{t("dashboard.startCalculator")}</h3>
              <p className="text-blue-300/70 text-sm mb-4">{t("dashboard.startCalculatorDesc")}</p>
              <Link to="/calculator" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
                {t("common.calculateNow")} <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0f1e33] flex items-center justify-center shrink-0">
                <span className="text-amber-400 font-semibold text-sm">{initials}</span>
              </div>
              <div>
                <p className="font-semibold text-[#0f1e33] text-sm">{displayName}</p>
                <p className="text-gray-400 text-xs">{profile?.phone ?? "Phone login"}</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mb-4">{completedSteps}/{profileSteps.length} {t("dashboard.progress")}</p>
            <div className="space-y-2">
              {profileSteps.map(({ labelKey, done }) => (
                <div key={labelKey} className="flex items-center gap-2.5">
                  {done ? <CheckCircle size={14} className="text-green-500 shrink-0" /> : <AlertCircle size={14} className="text-gray-300 shrink-0" />}
                  <span className={`text-xs ${done ? "text-[#0f1e33]" : "text-gray-400"}`}>{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cutoff card */}
          {academicRecord && (
            <div className="bg-[#0f1e33] rounded-2xl p-5 text-white">
              <h3 className="font-semibold mb-4">{t("dashboard.yourCutoffCard")}</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { s: "Maths", v: academicRecord.maths, m: 100 },
                  { s: "Physics", v: academicRecord.physics, m: 100 },
                  { s: "Chemistry", v: academicRecord.chemistry, m: 100 },
                ].map(({ s, v, m }) => (
                  <div key={s} className="bg-white/5 rounded-xl p-2.5 text-center">
                    <p className="text-blue-300/60 text-[9px] uppercase tracking-wide mb-1">{s}</p>
                    <p className="text-white font-mono font-semibold text-sm">{v ?? "—"}<span className="text-blue-400 text-[10px]">/{m}</span></p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-blue-300/70 text-sm">{t("dashboard.totalCutoff")}</span>
                <span className="font-display text-2xl text-amber-400">{cutoff?.toFixed(1) ?? "—"}</span>
              </div>
            </div>
          )}

          {/* AI Counsellor CTA */}
          <Link to="/counsellor" className="block bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white hover:opacity-90 transition-opacity">
            <MessageSquare size={22} className="mb-3 text-blue-300" />
            <h3 className="font-semibold mb-1">{t("dashboard.askAICounsellor")}</h3>
            <p className="text-blue-300/80 text-sm mb-3">{t("dashboard.aiDesc")}</p>
            <div className="flex items-center gap-1 text-sm font-medium">{t("dashboard.startConversation")} <ArrowRight size={14} /></div>
            {chatCount > 0 && <p className="text-blue-400/60 text-xs mt-2">{t("dashboard.messagesInHistory", { count: chatCount })}</p>}
          </Link>
        </div>
      </div>
    </div>
  );
}
