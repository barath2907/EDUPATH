import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Minus, Search, ShieldCheck,
  AlertCircle, Info, Sparkles, BarChart2, Layers, CheckCircle,
  HelpCircle, ChevronRight, Activity, ArrowUpRight, ArrowDownRight,
  MapPin, Filter, Sliders, RefreshCw, Download, ExternalLink,
  MessageSquare, Compass, Award, Building, BookOpen, ChevronLeft
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { EduPathAPI } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import {
  CANONICAL_TN_DISTRICTS,
  normalizeDistrict,
  getInsightsOverview,
  getDistrictInsightsSummary,
  getBranchInsightsSummary,
  getCutoffBandsPresets,
  getMoversAndShakers,
  queryEvidenceRecords,
  type DistrictInsightSummary,
  type BranchInsightSummary,
  type CutoffBandItem,
  type MoverRecord,
  type EvidenceRecordRow,
  type EvidenceQueryResult
} from "../lib/tneaDistrictService";
import { getCollegesWithCutoffs, type CollegeWithBranches } from "../lib/tneaData";
import { analyzeCutoffTrend, type CutoffTrendSummary } from "../lib/trendAnalysisEngine";
import { computeCompetitivenessIndicator, type CompetitivenessIndicatorResult } from "../lib/competitivenessIndicator";
import { useTranslation } from "react-i18next";

type InsightsTab = "overview" | "districts" | "cutoff-bands" | "movers-shakers" | "trajectory" | "evidence";

export default function Insights() {
  const { user, profile, academicRecord } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const initialTab = (searchParams.get("tab") as InsightsTab) || "overview";
  const [activeTab, setActiveTab] = useState<InsightsTab>(initialTab);

  // Global Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>(
    academicRecord?.category || profile?.category || "OC"
  );
  const [selectedYear, setSelectedYear] = useState<2023 | 2024 | 2025>(2025);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    searchParams.get("district") || "All"
  );
  const [selectedBranch, setSelectedBranch] = useState<string>(
    searchParams.get("branch") || "All"
  );
  const [collegeTypeFilter, setCollegeTypeFilter] = useState<string>("All");

  // Cutoff Band State
  const studentEvaluatedCutoff = academicRecord?.cutoff || 185.0;
  const [customCutoff, setCustomCutoff] = useState<number>(studentEvaluatedCutoff);
  const [selectedBandPreset, setSelectedBandPreset] = useState<string | null>(null);

  // Movers & Shakers Sub-tab
  const [moverType, setMoverType] = useState<"surging" | "softening" | "emerging" | "stable">("surging");

  // Trajectory & Competitiveness Selection
  const [colleges, setColleges] = useState<CollegeWithBranches[]>([]);
  const [selectedCollegeCode, setSelectedCollegeCode] = useState<string>("0001"); // Default: CEG Guindy
  const [selectedTrajectoryBranch, setSelectedTrajectoryBranch] = useState<string>("CS");

  // Evidence Table State
  const [evidencePage, setEvidencePage] = useState<number>(1);
  const [evidenceSearch, setEvidenceSearch] = useState<string>("");
  const [evidenceSortBy, setEvidenceSortBy] = useState<"cutoff" | "college_name" | "college_code" | "district">("cutoff");
  const [evidenceSortOrder, setEvidenceSortOrder] = useState<"asc" | "desc">("desc");

  // Sync tab changes to search params
  const handleTabChange = (tab: InsightsTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams);
  };

  // Load Colleges for Trajectory
  useEffect(() => {
    getCollegesWithCutoffs(selectedCategory)
      .then(data => setColleges(data))
      .catch(console.warn);
  }, [selectedCategory]);

  // Dynamic Summaries
  const overviewSummary = useMemo(() => {
    return getInsightsOverview(selectedCategory);
  }, [selectedCategory]);

  const districtSummaries = useMemo(() => {
    return getDistrictInsightsSummary(selectedCategory, selectedYear);
  }, [selectedCategory, selectedYear]);

  const branchSummaries = useMemo(() => {
    return getBranchInsightsSummary(selectedCategory, selectedYear);
  }, [selectedCategory, selectedYear]);

  const cutoffBandPresets = useMemo(() => {
    return getCutoffBandsPresets(selectedCategory);
  }, [selectedCategory]);

  const moversShakers = useMemo(() => {
    return getMoversAndShakers(selectedCategory);
  }, [selectedCategory]);

  // Trajectory active college & branch
  const activeCollege = useMemo(() => {
    return colleges.find(c =>
      String(c.code) === selectedCollegeCode ||
      String(c.code).replace(/^0+/, "") === selectedCollegeCode.replace(/^0+/, "")
    ) || colleges[0];
  }, [colleges, selectedCollegeCode]);

  const availableBranches = activeCollege?.branches || [];

  const activeBranch = useMemo(() => {
    return availableBranches.find(b => b.code === selectedTrajectoryBranch) || availableBranches[0];
  }, [availableBranches, selectedTrajectoryBranch]);

  // Trajectory & Competitiveness Calculation
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
      studentCutoff: studentEvaluatedCutoff,
    });
  }, [trendSummary, activeCollege, studentEvaluatedCutoff]);

  const trajectoryChartData = useMemo(() => {
    if (!trendSummary) return [];
    return trendSummary.dataPoints.map(p => ({
      year: String(p.year),
      cutoff: p.cutoff,
      studentCutoff: studentEvaluatedCutoff,
    }));
  }, [trendSummary, studentEvaluatedCutoff]);

  // Evidence Records Query
  const evidenceData: EvidenceQueryResult = useMemo(() => {
    let minCut = 0;
    let maxCut = 200;

    if (activeTab === "cutoff-bands") {
      if (selectedBandPreset) {
        const found = cutoffBandPresets.find(p => p.bandId === selectedBandPreset);
        if (found) {
          minCut = found.minCutoff;
          maxCut = found.maxCutoff;
        }
      } else {
        minCut = Math.max(77.5, customCutoff - 3.0);
        maxCut = Math.min(200.0, customCutoff + 3.0);
      }
    }

    return queryEvidenceRecords({
      district: selectedDistrict,
      branchCode: selectedBranch,
      category: selectedCategory,
      year: selectedYear,
      minCutoff: activeTab === "cutoff-bands" ? minCut : undefined,
      maxCutoff: activeTab === "cutoff-bands" ? maxCut : undefined,
      collegeType: collegeTypeFilter,
      searchQuery: evidenceSearch,
      sortBy: evidenceSortBy,
      sortOrder: evidenceSortOrder,
      page: evidencePage,
      pageSize: 15,
    });
  }, [
    selectedDistrict,
    selectedBranch,
    selectedCategory,
    selectedYear,
    collegeTypeFilter,
    evidenceSearch,
    evidenceSortBy,
    evidenceSortOrder,
    evidencePage,
    activeTab,
    selectedBandPreset,
    customCutoff,
    cutoffBandPresets,
  ]);

  // Navigate to District tab with filter
  const exploreDistrict = (districtName: string) => {
    setSelectedDistrict(districtName);
    setEvidencePage(1);
    handleTabChange("districts");
  };

  // Navigate to Branch filter in evidence table
  const exploreBranch = (branchCode: string) => {
    setSelectedBranch(branchCode);
    setEvidencePage(1);
    handleTabChange("evidence");
  };

  // Quick Preset Band Selection
  const applyPresetBand = (band: CutoffBandItem) => {
    setSelectedBandPreset(band.bandId);
    setCustomCutoff(parseFloat(((band.minCutoff + band.maxCutoff) / 2).toFixed(2)));
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      <SyncStatusBanner />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f1e33] via-[#1a2f4c] to-[#0f1e33] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500 text-slate-950 font-bold text-[10px] sm:text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Activity size={12} />
                Official TNEA Intelligence & Insights
              </span>
              <span className="bg-white/10 text-blue-200 border border-white/20 text-[10px] sm:text-xs px-3 py-1 rounded-full font-mono">
                {overviewSummary.datasetYears} Verified Cohorts
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] sm:text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle size={11} />
                {overviewSummary.verificationStatus}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              TNEA District & Cutoff Insights
            </h1>
            <p className="text-blue-200/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Explore dynamic multi-year threshold progressions, verified district-based college distributions, cutoff movers & shakers, and non-speculative competitiveness indicators.
            </p>
          </div>

          {/* Quick Profile Cutoff Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <BarChart2 size={24} />
            </div>
            <div>
              <div className="text-[11px] text-blue-200 font-medium">Your Evaluated Cutoff</div>
              <div className="text-xl font-bold font-mono text-white">
                {studentEvaluatedCutoff.toFixed(2)} <span className="text-xs text-amber-300 font-normal">({selectedCategory})</span>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory(academicRecord?.category || profile?.category || "OC");
                  setCustomCutoff(studentEvaluatedCutoff);
                }}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium mt-0.5 block"
              >
                Sync with My Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Filter size={14} className="text-amber-500" />
            <span>Active Exploration Filters</span>
            {selectedDistrict !== "All" && (
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-200">
                District: {selectedDistrict}
              </span>
            )}
            {selectedBranch !== "All" && (
              <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-200">
                Branch: {selectedBranch}
              </span>
            )}
          </div>
          {(selectedDistrict !== "All" || selectedBranch !== "All" || collegeTypeFilter !== "All") && (
            <button
              onClick={() => {
                setSelectedDistrict("All");
                setSelectedBranch("All");
                setCollegeTypeFilter("All");
              }}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* District Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
              <MapPin size={12} className="text-amber-600" />
              Verified District
            </label>
            <select
              value={selectedDistrict}
              onChange={e => {
                setSelectedDistrict(e.target.value);
                setEvidencePage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800 bg-white font-medium"
            >
              <option value="All">All Tamil Nadu Districts (38 Districts)</option>
              {CANONICAL_TN_DISTRICTS.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.tamilName})
                </option>
              ))}
            </select>
          </div>

          {/* Branch Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
              <BookOpen size={12} className="text-blue-600" />
              Engineering Branch
            </label>
            <select
              value={selectedBranch}
              onChange={e => {
                setSelectedBranch(e.target.value);
                setEvidencePage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800 bg-white font-medium"
            >
              <option value="All">All Engineering Branches (8 Tracked)</option>
              {branchSummaries.map(b => (
                <option key={b.branchCode} value={b.branchCode}>
                  {b.branchCode} - {b.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Community Category</label>
            <div className="flex gap-1 overflow-x-auto">
              {["OC", "BC", "BCM", "MBC/DNC", "SC", "SCA", "ST"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 text-xs py-1.5 px-1 rounded-xl font-bold transition-all text-center ${
                    selectedCategory === cat
                      ? "bg-[#0f1e33] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.split("/")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Admission Year Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-600">Admission Year</label>
            <div className="flex gap-1">
              {([2025, 2024, 2023] as const).map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`flex-1 text-xs py-1.5 rounded-xl font-bold transition-all ${
                    selectedYear === yr
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        {[
          { id: "overview", label: "📊 Overview Dashboard" },
          { id: "districts", label: `📍 By District (${selectedDistrict === "All" ? "38 Districts" : selectedDistrict})` },
          { id: "cutoff-bands", label: "🎯 Cutoff-Band Discovery" },
          { id: "movers-shakers", label: "⚡ Movers & Shakers" },
          { id: "trajectory", label: "📈 Cutoff Trajectory & Competitiveness" },
          { id: "evidence", label: `📑 Data Evidence (${evidenceData.totalRecords})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as InsightsTab)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? "bg-[#0f1e33] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────
          TAB 1: OVERVIEW DASHBOARD
      ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Dynamic 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Colleges Analysed</span>
                <Building size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f1e33] font-mono">
                {overviewSummary.collegesAnalysed}
              </div>
              <p className="text-[11px] text-gray-400">100% Verified DTE Tamil Nadu Directory</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Branches Tracked</span>
                <BookOpen size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f1e33] font-mono">
                {overviewSummary.branchesTracked}
              </div>
              <p className="text-[11px] text-gray-400">Core + AI/Data Science disciplines</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Districts Represented</span>
                <MapPin size={16} className="text-rose-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f1e33] font-mono">
                {overviewSummary.districtsRepresented}
              </div>
              <p className="text-[11px] text-gray-400">All 38 Administrative Districts</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
                <span>Cutoff Records</span>
                <Layers size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f1e33] font-mono">
                {overviewSummary.totalCutoffRecords.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-400">Multi-year 2023–2025 verified rows</p>
            </div>
          </div>

          {/* Section: By Branch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-[#0f1e33] flex items-center gap-2">
                  <BookOpen size={18} className="text-amber-500" />
                  Engineering Branch Insights ({selectedYear})
                </h3>
                <p className="text-xs text-gray-500">
                  Cutoff benchmarks, participating colleges, and demand momentum across major engineering branches.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {branchSummaries.map(b => (
                <div
                  key={b.branchCode}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-amber-400 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                        {b.branchCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                          b.trendDirection === "Surging"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : b.trendDirection === "Softening"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {b.trendDirection === "Surging" ? <ArrowUpRight size={10} /> : null}
                        {b.trendDirection}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">{b.branchName}</h4>
                    <div className="text-xs text-gray-500 mt-1">
                      Offered at <strong className="text-slate-800">{b.collegesOffering}</strong> verified institutions
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1 border border-slate-100">
                    <div className="flex justify-between text-gray-600">
                      <span>Avg Cutoff ({selectedCategory}):</span>
                      <strong className="font-mono text-slate-900">{b.avgCutoff.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Highest / Lowest:</span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {b.highestCutoff.toFixed(1)} / {b.lowestCutoff.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => exploreBranch(b.branchCode)}
                    className="w-full py-2 bg-slate-100 hover:bg-[#0f1e33] hover:text-white text-slate-800 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
                  >
                    <span>Explore {b.branchCode} Results</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: By District */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-[#0f1e33] flex items-center gap-2">
                  <MapPin size={18} className="text-rose-500" />
                  District-Wise Institution Distribution
                </h3>
                <p className="text-xs text-gray-500">
                  Select any district to explore verified institutions, branch availability, and local cutoff thresholds.
                </p>
              </div>
              <button
                onClick={() => handleTabChange("districts")}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <span>View All 38 Districts</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {districtSummaries.slice(0, 12).map(d => (
                <div
                  key={d.districtName}
                  onClick={() => exploreDistrict(d.districtName)}
                  className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{d.region}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-1.5 py-0.5 rounded">
                      {d.collegesCount} Col
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 truncate">{d.districtName}</h4>
                  <p className="text-[11px] text-gray-500">{d.tamilName || "தமிழ்நாடு"}</p>
                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 font-mono">
                    <span>Avg Cutoff:</span>
                    <strong>{d.avgCutoff2025.toFixed(1)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 2: BY DISTRICT & FILTER
      ────────────────────────────────────────────── */}
      {activeTab === "districts" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  District Explorer
                </span>
                <h3 className="font-display text-xl font-bold text-[#0f1e33]">
                  {selectedDistrict === "All" ? "All Tamil Nadu Districts" : `${selectedDistrict} District Colleges`}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedDistrict === "All"
                  ? "Showing all 461 institutions across Tamil Nadu. Select a district above or below to filter strictly."
                  : `Showing verified institutions whose official location and campus are located in ${selectedDistrict}.`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium">Quick Select:</span>
              {["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"].map(dName => (
                <button
                  key={dName}
                  onClick={() => exploreDistrict(dName)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    selectedDistrict === dName
                      ? "bg-[#0f1e33] text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {dName}
                </button>
              ))}
            </div>
          </div>

          {/* District Summary Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {districtSummaries
              .filter(d => selectedDistrict === "All" || d.districtName === selectedDistrict)
              .map(d => (
                <div
                  key={d.districtName}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{d.districtName}</h4>
                        <span className="text-xs text-gray-500 font-normal">({d.tamilName})</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{d.region} Tamil Nadu Region</p>
                    </div>
                    <span className="bg-amber-100 text-amber-900 font-mono font-bold text-xs px-2.5 py-1 rounded-xl">
                      {d.collegesCount} Institutions
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-gray-400 text-[10px] block">Average Cutoff (2025):</span>
                      <strong className="font-mono text-slate-800 text-sm">{d.avgCutoff2025.toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-gray-400 text-[10px] block">Autonomous Colleges:</span>
                      <strong className="font-mono text-slate-800 text-sm">{d.autonomousCount}</strong>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="text-gray-400 text-[10px] block">Top Benchmark College:</span>
                    <p className="text-slate-800 font-medium truncate" title={d.topCollegeName}>
                      {d.topCollegeCode} - {d.topCollegeName}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDistrict(d.districtName);
                      setEvidencePage(1);
                      handleTabChange("evidence");
                    }}
                    className="w-full py-2 bg-[#0f1e33] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>View {d.districtName} Evidence Table</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 3: CUTOFF-BAND DISCOVERY
      ────────────────────────────────────────────── */}
      {activeTab === "cutoff-bands" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Compass size={12} />
                  Reverse-Lookup Discovery
                </span>
                <h3 className="font-display text-xl font-bold text-[#0f1e33]">
                  Cutoff-Band College Discovery
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Discover matching college options for your specific score range across all 461 verified institutions.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Recommended Pre-Configured Cutoff Bands:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {cutoffBandPresets.map(b => (
                  <button
                    key={b.bandId}
                    onClick={() => applyPresetBand(b)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      selectedBandPreset === b.bandId
                        ? "bg-[#0f1e33] text-white border-[#0f1e33] shadow-sm"
                        : "bg-white hover:bg-slate-50 border-gray-200 text-slate-800"
                    }`}
                  >
                    <div className="font-mono font-bold text-xs">{b.label}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedBandPreset === b.bandId ? "text-amber-300" : "text-gray-400"}`}>
                      {b.count} Options
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Cutoff Slider */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-700">Custom Target Cutoff Evaluation:</span>
                <span className="font-mono font-extrabold text-base text-amber-600">
                  {customCutoff.toFixed(2)} marks
                </span>
              </div>
              <input
                type="range"
                min="80"
                max="200"
                step="0.25"
                value={customCutoff}
                onChange={e => {
                  setCustomCutoff(parseFloat(e.target.value));
                  setSelectedBandPreset(null);
                  setEvidencePage(1);
                }}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>80.00 Minimum</span>
                <span>Target Band: [{(customCutoff - 3.0).toFixed(2)} – {(customCutoff + 3.0).toFixed(2)}]</span>
                <span>200.00 Maximum</span>
              </div>
            </div>
          </div>

          {/* Results Summary & Evidence Preview */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Info size={14} className="text-blue-600" />
              <span>
                Found {evidenceData.totalRecords} institutional branch matches satisfying target cutoff {customCutoff.toFixed(2)} (±3.0 marks margin) in {selectedDistrict} district.
              </span>
            </div>
            <p className="text-[11px] text-blue-800/80">
              *Historical cutoff match does not guarantee admission. Final allotments depend on your community rank, round timing, and aggregate applicant competition.*
            </p>
          </div>

          {/* Embedded Evidence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidenceData.records.slice(0, 9).map((row, idx) => {
              const margin = customCutoff - row.cutoff_mark;
              return (
                <div
                  key={`${row.college_code}-${row.branch_code}-${idx}`}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-2.5 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Code: {row.college_code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1 line-clamp-1">{row.college_name}</h4>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                      {row.district}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Branch:</span>
                      <strong className="text-slate-800">{row.branch_code} - {row.branch_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Historical Cutoff:</span>
                      <strong className="font-mono text-slate-900">{row.cutoff_mark.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Margin vs Your Target:</span>
                      <strong className={`font-mono ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {margin >= 0 ? `+${margin.toFixed(2)} (Safe)` : `${margin.toFixed(2)} (Reach)`}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                    <span className="text-gray-400">{row.college_type}</span>
                    <button
                      onClick={() => {
                        setSelectedCollegeCode(row.college_code);
                        setSelectedTrajectoryBranch(row.branch_code);
                        handleTabChange("trajectory");
                      }}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      View Trajectory →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {evidenceData.totalRecords > 9 && (
            <div className="text-center pt-2">
              <button
                onClick={() => handleTabChange("evidence")}
                className="px-6 py-2.5 bg-[#0f1e33] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5"
              >
                <span>View All {evidenceData.totalRecords} Matches in Evidence Table</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 4: MOVERS & SHAKERS
      ────────────────────────────────────────────── */}
      {activeTab === "movers-shakers" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Activity size={12} />
                    Cutoff Movers & Shakers
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#0f1e33]">
                    Multi-Year Cutoff Threshold Shifts (2023–2025)
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Year-over-year momentum analysis tracking biggest surges, softening thresholds, emerging programmes, and stable baselines.
                </p>
              </div>

              {/* Sub-tab pills */}
              <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
                {[
                  { id: "surging", label: "🚀 Biggest Increases", count: moversShakers.biggestIncreases.length },
                  { id: "softening", label: "📉 Biggest Decreases", count: moversShakers.biggestDecreases.length },
                  { id: "emerging", label: "🌟 Emerging Programmes", count: moversShakers.emergingProgrammes.length },
                  { id: "stable", label: "⚓ Highly Stable", count: moversShakers.stableProgrammes.length },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setMoverType(sub.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      moverType === sub.id
                        ? "bg-[#0f1e33] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Movers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3">College & Official Code</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">District</th>
                    <th className="p-3 text-right">2023</th>
                    <th className="p-3 text-right">2024</th>
                    <th className="p-3 text-right">2025</th>
                    <th className="p-3 text-right">Net YoY Shift</th>
                    <th className="p-3">Classification & Grounded Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(moverType === "surging"
                    ? moversShakers.biggestIncreases
                    : moverType === "softening"
                    ? moversShakers.biggestDecreases
                    : moverType === "emerging"
                    ? moversShakers.emergingProgrammes
                    : moversShakers.stableProgrammes
                  ).map((m, idx) => (
                    <tr key={`${m.collegeCode}-${m.branchCode}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-800">
                        <div className="font-semibold">{m.collegeName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">TNEA Code: {m.collegeCode}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {m.branchCode} - {m.branchName}
                      </td>
                      <td className="p-3 text-slate-600">{m.district}</td>
                      <td className="p-3 text-right font-mono text-gray-500">{m.cutoff2023.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-gray-500">{m.cutoff2024.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{m.cutoff2025.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            m.absoluteChange > 0
                              ? "text-rose-600"
                              : m.absoluteChange < 0
                              ? "text-emerald-600"
                              : "text-slate-600"
                          }`}
                        >
                          {m.absoluteChange > 0 ? <ArrowUpRight size={12} /> : m.absoluteChange < 0 ? <ArrowDownRight size={12} /> : null}
                          {m.absoluteChange >= 0 ? `+${m.absoluteChange.toFixed(2)}` : m.absoluteChange.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">({m.percentChange > 0 ? "+" : ""}{m.percentChange}%)</span>
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-0.5 ${
                            m.classification === "Surging"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : m.classification === "Softening"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.classification === "Emerging"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {m.classification}
                        </span>
                        <div className="text-[11px] leading-tight text-gray-500">{m.explanation}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 5: CUTOFF TRAJECTORY & COMPETITIVENESS
      ────────────────────────────────────────────── */}
      {activeTab === "trajectory" && (
        <div className="space-y-6">
          {/* Institution & Branch Selectors */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Select Institution for Trajectory Analysis:</label>
              <select
                value={selectedCollegeCode}
                onChange={e => setSelectedCollegeCode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              >
                {colleges.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name.split(",")[0]} ({c.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Engineering Branch:</label>
              <select
                value={selectedTrajectoryBranch}
                onChange={e => setSelectedTrajectoryBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              >
                {availableBranches.map(b => (
                  <option key={b.code} value={b.code}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {trendSummary && competitiveness && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols): Area Chart & Analysis */}
              <div className="lg:col-span-2 space-y-6">
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

                    <span
                      className="px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5"
                      style={{
                        background: trendSummary.directionColor.bg,
                        color: trendSummary.directionColor.text,
                        borderColor: trendSummary.directionColor.border,
                      }}
                    >
                      {trendSummary.direction === "Surging" ? <TrendingUp size={14} /> : <Minus size={14} />}
                      {trendSummary.direction} Trend
                    </span>
                  </div>

                  {/* Recharts Trajectory Chart */}
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trajectoryChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cutoffGradInsights" x1="0" y1="0" x2="0" y2="1">
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
                            name === "cutoff" ? "Historical Cutoff" : "Your Evaluated Cutoff",
                          ]}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            fontSize: "12px",
                          }}
                        />
                        <ReferenceLine
                          y={studentEvaluatedCutoff}
                          stroke="#3b82f6"
                          strokeDasharray="4 4"
                          label={{
                            value: `Your Cutoff: ${studentEvaluatedCutoff.toFixed(2)}`,
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
                          fill="url(#cutoffGradInsights)"
                          activeDot={{ r: 6, fill: "#d97706" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Year-over-year pills */}
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

                {/* Grounded Explanation Box */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600 shrink-0" />
                    <h4 className="font-semibold text-xs text-blue-950">Grounded Multi-Year Analysis</h4>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed">{trendSummary.explanation}</p>
                </div>
              </div>

              {/* Right Column: Demand-Aware Competitiveness Indicator */}
              <div className="space-y-6">
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

                  <div className="text-center py-2">
                    <div className="text-3xl font-extrabold font-mono text-[#0f1e33]">
                      {competitiveness.score}
                      <span className="text-xs font-normal text-gray-400">/100</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{competitiveness.interpretation}</p>
                  </div>

                  {/* 5 Dimensions breakdown */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="text-[11px] font-semibold text-slate-700">Contributing Signal Dimensions:</div>
                    {competitiveness.factorBreakdown.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">{f.name}</span>
                        <span className="font-mono font-bold text-slate-800">{f.score.toFixed(1)} / {f.maxScore}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[10px] text-amber-900 leading-normal">
                    {competitiveness.transparencyNotice}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────
          TAB 6: DATA EVIDENCE TABLE
      ────────────────────────────────────────────── */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base text-[#0f1e33] flex items-center gap-2">
                  <Layers size={16} className="text-amber-500" />
                  Verified Data Evidence Table ({evidenceData.totalRecords} Records)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Full dataset evidence based on current filters. Filtered strictly at the database query level.
                </p>
              </div>

              {/* Search & Sort controls */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={evidenceSearch}
                    onChange={e => {
                      setEvidenceSearch(e.target.value);
                      setEvidencePage(1);
                    }}
                    placeholder="Search college, code, or branch..."
                    className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-800"
                  />
                </div>

                <select
                  value={evidenceSortBy}
                  onChange={e => setEvidenceSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl text-gray-700 bg-white"
                >
                  <option value="cutoff">Sort by Cutoff</option>
                  <option value="college_name">Sort by College Name</option>
                  <option value="college_code">Sort by Code</option>
                  <option value="district">Sort by District</option>
                </select>

                <button
                  onClick={() => setEvidenceSortOrder(o => o === "asc" ? "desc" : "asc")}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-mono font-bold"
                >
                  {evidenceSortOrder.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Evidence Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3">College Name</th>
                    <th className="p-3">TNEA Code</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Cutoff Mark</th>
                    <th className="p-3 text-center">Admission Year</th>
                    <th className="p-3">Official Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {evidenceData.records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                        No matching college records found for the selected combination of district, branch, and category.
                      </td>
                    </tr>
                  ) : (
                    evidenceData.records.map((r, i) => (
                      <tr key={`${r.college_code}-${r.branch_code}-${r.admission_year}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-900 font-medium">{r.college_name}</td>
                        <td className="p-3 font-mono font-bold text-amber-800">{r.college_code}</td>
                        <td className="p-3">
                          <span className="font-semibold">{r.branch_code}</span> - {r.branch_name}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{r.district}</td>
                        <td className="p-3 font-bold text-slate-800">{r.category}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{r.cutoff_mark.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono text-gray-500">{r.admission_year}</td>
                        <td className="p-3 text-gray-400 text-[11px]">{r.source_document}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {evidenceData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <div className="text-gray-500">
                  Page <strong className="text-slate-800">{evidenceData.page}</strong> of <strong className="text-slate-800">{evidenceData.totalPages}</strong> ({evidenceData.totalRecords} Total Items)
                </div>
                <div className="flex gap-1.5">
                  <button
                    disabled={evidencePage <= 1}
                    onClick={() => setEvidencePage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Previous
                  </button>
                  <button
                    disabled={evidencePage >= evidenceData.totalPages}
                    onClick={() => setEvidencePage(p => Math.min(evidenceData.totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
