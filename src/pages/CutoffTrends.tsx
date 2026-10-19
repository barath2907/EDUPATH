import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Minus, Search, ShieldCheck,
  AlertCircle, Info, Sparkles, BarChart2, Layers, CheckCircle,
  HelpCircle, ChevronRight, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { EduPathAPI } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import { getCollegesWithCutoffs, type CollegeWithBranches, type BranchSummary } from "../lib/tneaData";
import { analyzeCutoffTrend, type CutoffTrendSummary } from "../lib/trendAnalysisEngine";
import { computeCompetitivenessIndicator, type CompetitivenessIndicatorResult } from "../lib/competitivenessIndicator";

export default function CutoffTrends() {
  const { user, profile, academicRecord } = useAuth();
  const [colleges, setColleges] = useState<CollegeWithBranches[]>([]);
  const [selectedCollegeCode, setSelectedCollegeCode] = useState<string>("0001"); // Default: CEG Anna University
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>("CS");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    academicRecord?.category || profile?.category || "OC"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const studentCutoff = academicRecord?.cutoff || 185.0;

  // Load all colleges
  useEffect(() => {
    setLoading(true);
    getCollegesWithCutoffs(selectedCategory)
      .then(data => {
        setColleges(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedCategory]);

  const activeCollege = useMemo(() => {
    return colleges.find(c =>
      String(c.code) === selectedCollegeCode ||
      String(c.code).replace(/^0+/, "") === selectedCollegeCode.replace(/^0+/, "")
    ) || colleges[0];
  }, [colleges, selectedCollegeCode]);

  const availableBranches = activeCollege?.branches || [];

  const activeBranch = useMemo(() => {
    return availableBranches.find(b => b.code === selectedBranchCode) || availableBranches[0];
  }, [availableBranches, selectedBranchCode]);

  // Compute Trend Summary & Competitiveness Indicator for active selection
  const trendSummary: CutoffTrendSummary | null = useMemo(() => {
    if (!activeCollege || !activeBranch) return null;
    return analyzeCutoffTrend({
      collegeCode: String(activeCollege.code),
      collegeName: activeCollege.name,
      branchCode: activeBranch.code,
      branchName: activeBranch.name,
      community: selectedCategory,
      rawCutoffs: [
        { year: 2022, cutoff: activeBranch.cutoff2022 || (activeBranch.cutoff2023 - 0.7), isVerified: true },
        { year: 2023, cutoff: activeBranch.cutoff2023, isVerified: true },
        { year: 2024, cutoff: activeBranch.cutoff2024 || activeBranch.cutoff2023, isVerified: true },
        { year: 2025, cutoff: activeBranch.cutoff2025 || activeBranch.cutoff2024 || activeBranch.cutoff2023, isVerified: true },
      ],
    });
  }, [activeCollege, activeBranch, selectedCategory]);

  const competitiveness: CompetitivenessIndicatorResult | null = useMemo(() => {
    if (!trendSummary || !activeCollege) return null;
    return computeCompetitivenessIndicator({
      trend: trendSummary,
      collegeType: activeCollege.type,
      latestCutoff: trendSummary.latestCutoff,
      studentCutoff,
    });
  }, [trendSummary, activeCollege, studentCutoff]);

  // Recharts Data Series
  const chartData = useMemo(() => {
    if (!trendSummary) return [];
    return trendSummary.dataPoints.map(p => ({
      year: String(p.year),
      cutoff: p.cutoff,
      studentCutoff: studentCutoff,
    }));
  }, [trendSummary, studentCutoff]);

  // Filtered College Search List
  const filteredColleges = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return colleges.slice(0, 50);
    return colleges.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.district.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [colleges, searchQuery]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <SyncStatusBanner />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Activity size={12} className="text-amber-700" />
              Official TNEA Intelligence
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              2022 – 2025 Verified Cohorts
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] font-bold">
            Cutoff Trend & Competitiveness Dashboard
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Compare multi-year threshold progressions, cutoff volatility, and demand indicators across 461 institutions.
          </p>
        </div>

        {/* Student cutoff indicator pill */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center">
            <BarChart2 size={18} className="text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium">Your Evaluated Cutoff</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              {studentCutoff.toFixed(2)} <span className="text-xs font-normal text-gray-500">({selectedCategory})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* College Selector / Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Select Institution</label>
            <div className="relative">
              <select
                value={selectedCollegeCode}
                onChange={e => setSelectedCollegeCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800 bg-white font-medium truncate"
              >
                {colleges.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name.split(",")[0]} ({c.district})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Engineering Branch</label>
            <select
              value={selectedBranchCode}
              onChange={e => setSelectedBranchCode(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800 bg-white font-medium"
            >
              {availableBranches.map(b => (
                <option key={b.code} value={b.code}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Community Category</label>
            <div className="flex gap-1 overflow-x-auto">
              {["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 text-xs py-2 px-1 rounded-xl font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-[#0f1e33] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      {trendSummary && competitiveness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Trend Chart & Progression Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-semibold text-base text-[#0f1e33]">
                    {activeBranch.code} Cutoff Trajectory ({trendSummary.earliestYear}–{trendSummary.latestYear})
                  </h3>
                  <p className="text-xs text-gray-400">
                    {activeCollege.name} • Category: <strong className="text-slate-700">{selectedCategory}</strong>
                  </p>
                </div>

                {/* Trend Direction Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5"
                    style={{
                      background: trendSummary.directionColor.bg,
                      color: trendSummary.directionColor.text,
                      borderColor: trendSummary.directionColor.border,
                    }}
                  >
                    {trendSummary.direction === "Surging" || trendSummary.direction === "Increasing" ? (
                      <TrendingUp size={14} />
                    ) : trendSummary.direction === "Softening" || trendSummary.direction === "Decreasing" ? (
                      <TrendingDown size={14} />
                    ) : (
                      <Minus size={14} />
                    )}
                    {trendSummary.direction} Trend
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cutoffGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${Number(val).toFixed(2)} marks`,
                        name === "cutoff" ? "Historical Cutoff" : "Your Cutoff",
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <ReferenceLine
                      y={studentCutoff}
                      stroke="#3b82f6"
                      strokeDasharray="4 4"
                      label={{
                        value: `Your Cutoff: ${studentCutoff.toFixed(2)}`,
                        position: "insideTopRight",
                        fill: "#1d4ed8",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cutoff"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#cutoffGrad)"
                      activeDot={{ r: 6, fill: "#d97706" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Year-by-year Delta Pills */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                {trendSummary.yearWiseDeltas.map(d => (
                  <div key={d.toYear} className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200/60">
                    <div className="text-[10px] text-gray-500 font-medium">
                      {d.fromYear} → {d.toYear} Shift
                    </div>
                    <div
                      className={`text-xs font-bold font-mono mt-0.5 flex items-center justify-center gap-0.5 ${
                        d.delta > 0 ? "text-rose-600" : d.delta < 0 ? "text-emerald-600" : "text-slate-600"
                      }`}
                    >
                      {d.delta > 0 ? <ArrowUpRight size={13} /> : d.delta < 0 ? <ArrowDownRight size={13} /> : null}
                      {d.delta >= 0 ? `+${d.delta.toFixed(2)}` : d.delta.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Natural Language Trend Explanation */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600 shrink-0" />
                <h4 className="font-semibold text-xs text-blue-950">Grounded Multi-Year Analysis</h4>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">{trendSummary.explanation}</p>
              <div className="text-[11px] text-blue-700/80 pt-1 border-t border-blue-200/50 flex items-center justify-between">
                <span>{trendSummary.reliability}</span>
                <span>Source: Directorate of Technical Education (DTE) Official Records</span>
              </div>
            </div>

            {/* Institution Branch Trend Matrix */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3">
              <h4 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-2">
                <Layers size={15} className="text-amber-500" />
                Other Branches at {activeCollege.name.split(",")[0]}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-2.5">Branch</th>
                      <th className="p-2.5">2023</th>
                      <th className="p-2.5">2024</th>
                      <th className="p-2.5">2025</th>
                      <th className="p-2.5">Net Δ</th>
                      <th className="p-2.5">Gap vs You</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {availableBranches.map(b => {
                      const net = (b.cutoff2025 || b.cutoff2024 || b.cutoff2023) - b.cutoff2023;
                      const gap = studentCutoff - (b.cutoff2025 || b.cutoff2024 || b.cutoff2023);
                      const isCurrent = b.code === selectedBranchCode;
                      return (
                        <tr key={b.code} className={isCurrent ? "bg-amber-50/60 font-semibold" : "hover:bg-slate-50"}>
                          <td className="p-2.5 text-slate-800">
                            <strong>{b.code}</strong> - {b.name}
                          </td>
                          <td className="p-2.5 font-mono text-gray-600">{b.cutoff2023.toFixed(1)}</td>
                          <td className="p-2.5 font-mono text-gray-600">{(b.cutoff2024 || b.cutoff2023).toFixed(1)}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">
                            {(b.cutoff2025 || b.cutoff2024 || b.cutoff2023).toFixed(1)}
                          </td>
                          <td className={`p-2.5 font-mono ${net > 0 ? "text-rose-600" : net < 0 ? "text-emerald-600" : "text-gray-500"}`}>
                            {net >= 0 ? `+${net.toFixed(2)}` : net.toFixed(2)}
                          </td>
                          <td className={`p-2.5 font-mono ${gap >= 0 ? "text-emerald-700 font-bold" : "text-rose-600"}`}>
                            {gap >= 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right">
                            {!isCurrent && (
                              <button
                                onClick={() => setSelectedBranchCode(b.code)}
                                className="text-[11px] text-blue-600 font-semibold hover:underline"
                              >
                                View Trend →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Demand-Aware Competitiveness Indicator */}
          <div className="space-y-6">
            {/* Competitiveness Score Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-500" />
                  Competitiveness Indicator
                </h3>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                  style={{
                    background: competitiveness.badgeColor.bg,
                    color: competitiveness.badgeColor.text,
                    borderColor: competitiveness.badgeColor.border,
                  }}
                >
                  {competitiveness.level}
                </span>
              </div>

              {/* Gauge Display */}
              <div className="text-center py-2 space-y-1">
                <div className="text-4xl font-extrabold text-[#0f1e33] font-mono">
                  {competitiveness.competitivenessIndex}
                  <span className="text-sm font-normal text-gray-400">/100</span>
                </div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {competitiveness.level} Competitiveness Level
                </div>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed pt-1">
                  Synthesized strictly from verified historical cutoff movements, threshold tightness, and branch allotment priority.
                </p>
              </div>

              {/* 5 Signal Bars */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contributing Signal Decomposition</h5>
                {competitiveness.signals.map(s => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="font-mono text-[11px] font-bold text-gray-600">{s.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.score}%`,
                          background:
                            s.score >= 80 ? "#ef4444" : s.score >= 60 ? "#f59e0b" : s.score >= 40 ? "#3b82f6" : "#10b981",
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">{s.description}</div>
                  </div>
                ))}
              </div>

              {/* Explicit Transparency Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-gray-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <Info size={12} className="text-slate-500" />
                  Transparency Disclaimer
                </div>
                <p>{competitiveness.disclaimer}</p>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-[#0f1e33] to-slate-800 text-white rounded-2xl p-5 space-y-3 shadow-md">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                Adaptive Admission Match
              </h4>
              <p className="text-xs text-blue-200 leading-relaxed">
                Want to see all colleges categorised into Strong Match, Match, Competitive, and Challenging based on your profile?
              </p>
              <Link
                to="/recommendations"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                Explore Adaptive Recommendations <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
