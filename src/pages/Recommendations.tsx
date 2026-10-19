import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, MapPin, Bookmark, BookmarkCheck, BarChart2, CheckCircle,
  ShieldCheck, Sparkles, AlertCircle, Trash2, ArrowRight, Info,
  TrendingUp, TrendingDown, Minus, Scale, Star, Plus
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, CartesianGrid
} from "recharts";
import PageFlow from "../components/PageFlow";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { districts, branchOptions } from "../data/mockData";
import { CANONICAL_TN_DISTRICTS, normalizeDistrict } from "../lib/tneaDistrictService";
import { EduPathAPI } from "../lib/apiClient";
import { type RecommendedOption } from "../lib/recommendationEngine";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { computeFitScore, getClassificationColor, type FitClassification } from "../lib/fitScoreEngine";
import { getCollegesWithCutoffs, type CollegeWithBranches, type BranchSummary } from "../lib/tneaData";

type Tab = "recommendations" | "saved" | "compare";

interface EnhancedOption extends RecommendedOption {
  fitScore: number;
  fitClassification: FitClassification;
  fitLabel: string;
  fitExplanation: string;
  fitDimensions: {
    cutoffCompatibility: number;
    branchPreference: number;
    mlSuitability: number;
    locationFit: number;
    budgetFit: number;
    historicalTrend: number;
  };
}

export default function Recommendations() {
  const { user, profile, academicRecord, savedColleges, toggleSavedCollege } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("recommendations");
  const [recommendations, setRecommendations] = useState<RecommendedOption[]>([]);
  const [myCutoff, setMyCutoff] = useState<number | null>(academicRecord?.cutoff ?? 175.0);
  const [myCategory, setMyCategory] = useState(academicRecord?.category ?? profile?.category ?? "OC");
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    new Set(savedColleges ? savedColleges.map(s => `${s.college_code}-${s.branch_code}`) : [])
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [displayCount, setDisplayCount] = useState(25);
  const [allColleges, setAllColleges] = useState<CollegeWithBranches[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (savedColleges) setSavedIds(new Set(savedColleges.map(s => `${s.college_code}-${s.branch_code}`)));
  }, [savedColleges]);

  // Canonical Tamil Nadu districts list (all 38 districts)
  const districtOptions = useMemo(() => {
    return CANONICAL_TN_DISTRICTS.map(d => d.canonicalName).sort();
  }, []);

  // Load all colleges for full-database fallback search
  useEffect(() => {
    getCollegesWithCutoffs(myCategory).then(setAllColleges).catch(() => {});
  }, [myCategory]);

  // Fetch recommendations from backend with district and branch filters applied at query level
  useEffect(() => {
    let isCancelled = false;
    let cutoffVal = academicRecord?.cutoff ?? 175.0;
    let cat = academicRecord?.category ?? profile?.category ?? "OC";

    const fetchRecs = async () => {
      setLoadingData(true);
      if (user && !academicRecord) {
        try {
          const account = await EduPathAPI.profile.get();
          if (account?.academicRecord) {
            cutoffVal = account.academicRecord.cutoff;
            cat = account.academicRecord.category || account.profile.category || "OC";
          }
        } catch (e) { console.warn("Using defaults:", e); }
      }
      if (isCancelled) return;
      setMyCutoff(cutoffVal);
      setMyCategory(cat);

      try {
        const data = await EduPathAPI.recommendations.get({
          studentCutoff: cutoffVal,
          community: cat,
          preferredDistrict: selectedDistrict !== "All" ? selectedDistrict : undefined,
          preferredBranches: selectedBranch !== "All" ? [selectedBranch] : undefined,
          isGovernmentSchool75Quota: !!profile?.is_government_school_quota,
        });
        if (!isCancelled) {
          setRecommendations(data);
        }
      } catch (err) {
        console.error("Recommendations error:", err);
      } finally {
        if (!isCancelled) setLoadingData(false);
      }
    };

    fetchRecs();

    return () => {
      isCancelled = true;
    };
  }, [user, profile, academicRecord, selectedDistrict, selectedBranch]);

  const enhanced: EnhancedOption[] = useMemo(() => {
    return recommendations.map(r => {
      const fit = computeFitScore({
        studentCutoff: myCutoff ?? 175,
        studentCategory: myCategory,
        preferredBranches: profile?.preferred_branches ?? undefined,
        preferredDistrict: selectedDistrict !== "All" ? selectedDistrict : profile?.preferred_district ?? undefined,
        budget: profile?.budget ?? undefined,
        isGovernmentSchool75Quota: !!profile?.is_government_school_quota,
        branchCode: r.branchCode,
        branchName: r.branchName,
        district: r.district,
        collegeType: r.collegeType,
        historicalCutoff2023: r.historicalCutoff2023,
        historicalCutoff2024: r.historicalCutoff2024,
        historicalCutoff2025: r.historicalCutoff2025,
        annualFees: r.annualFees,
        mlPredictionScore: r.predictionResult?.predictionScore,
      });
      return { ...r, fitScore: fit.total, fitClassification: fit.classification, fitLabel: fit.label, fitExplanation: fit.explanation, fitDimensions: fit.dimensions };
    }).sort((a, b) => b.fitScore - a.fitScore);
  }, [recommendations, myCutoff, myCategory, profile, selectedDistrict]);

  // Context-aware category counts: reflects active district and branch filters
  const categoryCounts = useMemo(() => {
    const itemsInContext = enhanced.filter(r => {
      if (selectedDistrict !== "All") {
        const canonicalReq = normalizeDistrict(selectedDistrict);
        const canonicalCol = normalizeDistrict(r.district);
        if (canonicalCol.toLowerCase() !== canonicalReq.toLowerCase()) return false;
      }
      if (selectedBranch !== "All" && r.branchCode !== selectedBranch) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        r.collegeName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q) ||
        r.branchCode.toLowerCase().includes(q) ||
        r.collegeCode.includes(q) ||
        (r.officialName?.toLowerCase().includes(q) ?? false)
      );
    });

    const counts: Record<string, number> = {
      All: itemsInContext.length,
      "Strong Match": 0,
      Match: 0,
      Competitive: 0,
      Challenging: 0,
    };
    for (const r of itemsInContext) {
      const cat = r.recommendationCategory || (r.suitability === "Safe" ? "Strong Match" : r.suitability === "Reach" ? "Challenging" : "Match");
      if (counts[cat] !== undefined) counts[cat]++;
    }
    return counts;
  }, [enhanced, selectedDistrict, selectedBranch, search]);

  const filtered = enhanced.filter(r => {
    if (selectedDistrict !== "All") {
      const canonicalReq = normalizeDistrict(selectedDistrict);
      const canonicalCol = normalizeDistrict(r.district);
      if (canonicalCol.toLowerCase() !== canonicalReq.toLowerCase()) return false;
    }
    if (selectedBranch !== "All" && r.branchCode !== selectedBranch) return false;
    if (selectedCategoryFilter !== "All") {
      const cat = r.recommendationCategory || (r.suitability === "Safe" ? "Strong Match" : r.suitability === "Reach" ? "Challenging" : "Match");
      if (cat !== selectedCategoryFilter) return false;
    }
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.collegeName.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.branchName.toLowerCase().includes(q) ||
      r.branchCode.toLowerCase().includes(q) ||
      r.collegeCode.includes(q) ||
      (r.officialName?.toLowerCase().includes(q) ?? false)
    );
  });

  // Full-database search results (shown when filtered is empty for the active filter set)
  const fullSearchResults = useMemo(() => {
    if (filtered.length > 0) return [];
    const q = search.toLowerCase().trim();
    if (!q && selectedDistrict === "All") return [];
    const results: Array<{ college: CollegeWithBranches; branch: BranchSummary; margin: number }> = [];
    for (const college of allColleges) {
      if (selectedDistrict !== "All") {
        const canonicalReq = normalizeDistrict(selectedDistrict);
        const canonicalCol = normalizeDistrict(college.district);
        if (canonicalCol.toLowerCase() !== canonicalReq.toLowerCase()) continue;
      }
      if (q) {
        const nameMatch =
          college.name.toLowerCase().includes(q) ||
          (college.official_name?.toLowerCase().includes(q) ?? false) ||
          String(college.code).includes(q) ||
          college.location.toLowerCase().includes(q) ||
          college.district.toLowerCase().includes(q);
        if (!nameMatch) continue;
      }
      for (const branch of college.branches) {
        if (selectedBranch !== "All" && branch.code !== selectedBranch) continue;
        const latestCutoff = branch.cutoff2025 || branch.cutoff2024 || branch.cutoff2023;
        const margin = (myCutoff ?? 175) - latestCutoff;
        results.push({ college, branch, margin });
      }
    }
    return results.sort((a, b) => b.margin - a.margin).slice(0, 25);
  }, [search, filtered.length, allColleges, selectedBranch, selectedDistrict, myCutoff]);

  const toggleSave = async (rec: EnhancedOption) => {
    const key = `${rec.collegeCode}-${rec.branchCode}`;
    setSavingId(key);
    const isNowSaved = await toggleSavedCollege({ college_code: rec.collegeCode, college_name: rec.collegeName, branch_code: rec.branchCode, branch_name: rec.branchName, district: rec.district, college_type: rec.collegeType, cutoff_2023: rec.historicalCutoff2023, fees: rec.annualFees });
    setSavedIds(s => { const n = new Set(s); if (isNowSaved) n.add(key); else n.delete(key); return n; });
    setSaveMsg(isNowSaved ? "Saved to your options!" : "Removed from saved list");
    setSavingId(null);
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const savedEnhanced: EnhancedOption[] = useMemo(() => {
    if (!savedColleges) return [];
    return savedColleges.map(sc => {
      const rec = enhanced.find(e => e.collegeCode === sc.college_code && e.branchCode === sc.branch_code);
      if (rec) return rec;
      const fit = computeFitScore({ studentCutoff: myCutoff ?? 175, studentCategory: myCategory, preferredBranches: profile?.preferred_branches ?? undefined, preferredDistrict: profile?.preferred_district ?? undefined, budget: profile?.budget ?? undefined, isGovernmentSchool75Quota: !!profile?.is_government_school_quota, branchCode: sc.branch_code, branchName: sc.branch_name, district: sc.district ?? "Unknown", collegeType: sc.college_type ?? "Private", historicalCutoff2023: sc.cutoff_2023 ?? 175, historicalCutoff2024: sc.cutoff_2023 ?? 175, annualFees: sc.fees ?? 0, mlPredictionScore: undefined });
      return { collegeId: sc.college_code, collegeCode: sc.college_code, collegeName: sc.college_name, officialName: sc.college_name, location: sc.district ?? "", district: sc.district ?? "", collegeType: sc.college_type ?? "Private", naacGrade: null, nbaAccredited: false, branchCode: sc.branch_code, branchName: sc.branch_name, historicalCutoff2023: sc.cutoff_2023 ?? 175, historicalCutoff2024: sc.cutoff_2023 ?? 175, historicalCutoff2025: sc.cutoff_2023 ?? 175, studentCutoff: myCutoff ?? 175, cutoffMargin: (myCutoff ?? 175) - (sc.cutoff_2023 ?? 175), communityCategory: myCategory, annualFees: sc.fees ?? 0, intakeSeats: 60, vacantSeats: 4, suitability: "Match" as const, categoryTag: "Match", predictionResult: { predictionClass: "Moderate Probability (Match)" as const, predictionScore: 65, randomForestScore: 65, xgboostScore: 65, cutoffMargin: 0, historicalFit: "Match", supportingCutoffs: [], evidenceText: "", modelVersion: "v3.2.0", evaluatedAt: new Date().toISOString() }, recommendationReason: "From saved data.", sourceYear: 2024, verificationStatus: "verified", sourceUrl: "https://www.tneaonline.org", fitScore: fit.total, fitClassification: fit.classification, fitLabel: fit.label, fitExplanation: fit.explanation, fitDimensions: fit.dimensions } as EnhancedOption;
    }).sort((a, b) => b.fitScore - a.fitScore);
  }, [savedColleges, enhanced, myCutoff, myCategory, profile]);

  const compareOptions = savedEnhanced.filter(r => selectedForCompare.has(`${r.collegeCode}-${r.branchCode}`)).sort((a, b) => b.fitScore - a.fitScore);
  const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <SyncStatusBanner />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1 flex items-center gap-2 flex-wrap">
            <span>College Recommendations</span>
            {selectedDistrict !== "All" && (
              <span className="text-xs sm:text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <MapPin size={12} className="text-amber-600" />
                {selectedDistrict} District
              </span>
            )}
          </h1>
          {myCutoff ? (
            <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
              <span>Cutoff: <strong className="text-amber-600 font-semibold">{myCutoff.toFixed(2)}</strong> / 200</span>
              <span>•</span>
              <span>Category: <strong className="text-slate-800 font-medium">{myCategory}</strong></span>
              {selectedDistrict !== "All" && (
                <>
                  <span>•</span>
                  <span>District: <strong className="text-slate-800 font-semibold">{selectedDistrict}</strong></span>
                </>
              )}
              {profile?.is_government_school_quota && <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">7.5% Govt School Quota</span>}
            </p>
          ) : (<p className="text-gray-500 text-xs"><Link to="/calculator" className="text-amber-600 font-semibold underline">Calculate your cutoff</Link> to view tailored recommendations.</p>)}
        </div>
        {saveMsg && (<div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-600" />{saveMsg}</div>)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit overflow-x-auto">
        {([{ key:"recommendations", label:"Recommendations", count:filtered.length },{ key:"saved", label:"My Saved Options", count:savedEnhanced.length },{ key:"compare", label:"Compare", count:selectedForCompare.size }] as const).map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as Tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${tab === tb.key ? "bg-white text-[#0f1e33] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tb.label}
            {tb.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === tb.key ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-600"}`}>{tb.count}</span>}
          </button>
        ))}
      </div>

      {/* RECOMMENDATIONS TAB */}
      {tab === "recommendations" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input type="text" placeholder="Search college, code, city, branch..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500" />
              </div>
              <select
                value={selectedDistrict}
                onChange={e => {
                  setSelectedDistrict(e.target.value);
                  setSelectedCategoryFilter("All");
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-700 bg-white"
              >
                <option value="All">All Districts (Tamil Nadu)</option>
                {districtOptions.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-700 bg-white">
                <option value="All">All Engineering Branches</option>
                {branchOptions.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
              </select>
            </div>

            {/* 4 Standard Recommendation Categories Filter Bar */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Categories:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {(["All", "Strong Match", "Match", "Competitive", "Challenging"] as const).map(catName => (
                  <button
                    key={catName}
                    onClick={() => setSelectedCategoryFilter(catName)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                      selectedCategoryFilter === catName
                        ? catName === "Strong Match"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : catName === "Match"
                          ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                          : catName === "Competitive"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : catName === "Challenging"
                          ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                          : "bg-[#0f1e33] text-white border-[#0f1e33] shadow-2xs"
                        : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{catName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedCategoryFilter === catName ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {categoryCounts[catName] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 flex items-center gap-1"><Info size={12} />Fit Score: Cutoff 40% + Branch 20% + ML 15% + Location 10% + Budget 10% + Trend 5% — Not an admission probability</p>
          </div>

          {loadingData ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Querying verified TNEA colleges for {selectedDistrict !== "All" ? `${selectedDistrict} District` : "all Tamil Nadu districts"}...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="space-y-4">
              {/* Category Mismatch Helper */}
              {selectedCategoryFilter !== "All" && categoryCounts["All"] > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-amber-900">
                    No colleges match the "{selectedCategoryFilter}" tier in {selectedDistrict === "All" ? "Tamil Nadu" : `${selectedDistrict} District`}.
                  </p>
                  <p className="text-xs text-amber-700">
                    There are <strong>{categoryCounts["All"]}</strong> colleges available in {selectedDistrict === "All" ? "Tamil Nadu" : selectedDistrict} under other suitability tiers.
                  </p>
                  <button
                    onClick={() => setSelectedCategoryFilter("All")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    View All {categoryCounts["All"]} {selectedDistrict !== "All" ? selectedDistrict : ""} Colleges
                  </button>
                </div>
              ) : fullSearchResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-amber-500 shrink-0" />
                      <span>Showing <strong>{fullSearchResults.length}</strong> verified colleges in {selectedDistrict !== "All" ? `${selectedDistrict} District` : "all districts"} from the TNEA master dataset outside your standard cutoff range.</span>
                    </div>
                  </div>
                  {fullSearchResults.map(({ college, branch, margin }, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:border-amber-300 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{college.code}</span>
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{college.type}</span>
                            {college.naac_grade && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">NAAC {college.naac_grade}</span>}
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${margin >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                              {margin >= 0 ? `+${margin.toFixed(2)} Safe` : `${margin.toFixed(2)} Reach`}
                            </span>
                          </div>
                          <h3 className="font-display text-base sm:text-lg text-[#0f1e33] font-semibold leading-snug">{college.name}</h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={13} className="text-amber-500 shrink-0" />{college.location}, {college.district} District</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-gray-400 block text-[11px]">Branch</span><strong className="text-slate-800">{branch.code} - {branch.name}</strong></div>
                        <div><span className="text-gray-400 block text-[11px]">Historical Cutoff (2023|2024|2025)</span><strong className="text-slate-800 font-mono">{branch.cutoff2023.toFixed(1)} | {(branch.cutoff2024 || branch.cutoff2023).toFixed(1)} | {(branch.cutoff2025 || branch.cutoff2024 || branch.cutoff2023).toFixed(1)}</strong></div>
                        <div><span className="text-gray-400 block text-[11px]">Your Cutoff Gap</span><strong className={margin >= 0 ? "text-emerald-700" : "text-rose-600"}>{margin >= 0 ? "+" : ""}{margin.toFixed(2)} marks</strong></div>
                        <div><span className="text-gray-400 block text-[11px]">Annual Fees</span><strong className="text-slate-800">Rs.{(branch.fees / 1000).toFixed(0)}K/yr</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                  <p className="text-base font-semibold text-slate-800">No matching colleges found for the selected filters.</p>
                  <p className="text-xs text-gray-500">
                    No verified institutional records match {selectedDistrict !== "All" ? `district "${selectedDistrict}"` : "the active filters"}.
                  </p>
                  {(selectedDistrict !== "All" || selectedBranch !== "All" || selectedCategoryFilter !== "All" || search) && (
                    <button
                      onClick={() => {
                        setSelectedDistrict("All");
                        setSelectedBranch("All");
                        setSelectedCategoryFilter("All");
                        setSearch("");
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>Showing <strong>{Math.min(displayCount, filtered.length)}</strong> of <strong>{filtered.length}</strong> results — ranked by Personalized Fit Score</span>
                {selectedForCompare.size > 0 && <button onClick={() => setTab("compare")} className="text-blue-600 font-semibold hover:underline">{selectedForCompare.size} selected for compare →</button>}
              </div>
              {filtered.slice(0, displayCount).map((r, idx) => {
                const key = `${r.collegeCode}-${r.branchCode}`;
                const isSaved = savedIds.has(key);
                const isExpanded = expandedCardKey === key;
                const colors = getClassificationColor(r.fitClassification);
                const margin = r.studentCutoff - r.historicalCutoff2024;
                const trend = r.trendSummary || {
                  direction: r.historicalCutoff2024 > r.historicalCutoff2023 ? "Increasing" : "Stable",
                  absoluteChange: r.historicalCutoff2024 - r.historicalCutoff2023,
                  volatility: 0.8,
                  directionColor: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
                };
                const catName = r.recommendationCategory || (r.suitability === "Safe" ? "Strong Match" : r.suitability === "Reach" ? "Challenging" : "Match");
                const catStyle = catName === "Strong Match"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : catName === "Match"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : catName === "Competitive"
                  ? "bg-blue-100 text-blue-900 border-blue-300"
                  : "bg-rose-100 text-rose-900 border-rose-300";

                return (
                  <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs hover:border-amber-300 transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">#{idx+1} · {r.collegeCode}</span>
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{r.collegeType}</span>
                          {r.naacGrade && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">NAAC {r.naacGrade}</span>}
                          
                          {/* Standard 4-Tier Category Badge */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${catStyle}`}>
                            <ShieldCheck size={12} />
                            {catName}
                          </span>

                          {/* Fit Score Badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border" style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                            {r.fitScore}/100 · {r.fitLabel}
                          </span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg text-[#0f1e33] font-semibold leading-snug">{r.collegeName}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={13} className="text-amber-500 shrink-0" />{r.location}, {r.district} District</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <button onClick={() => { setSelectedForCompare(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else if (n.size < 5) n.add(key); return n; }); }} className={`text-xs px-3 py-2 rounded-xl font-semibold transition-all border flex items-center gap-1 ${selectedForCompare.has(key) ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"}`}><Scale size={12} />{selectedForCompare.has(key) ? "Selected" : "Compare"}</button>
                        <button onClick={() => toggleSave(r)} disabled={savingId === key} className={`flex items-center justify-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all ${isSaved ? "bg-amber-50 text-amber-700 border border-amber-300" : "bg-slate-100 hover:bg-amber-50 text-slate-700 border border-slate-200"}`}>
                          {isSaved ? <BookmarkCheck size={15} className="text-amber-600" /> : <Bookmark size={15} />}<span>{isSaved ? "Saved" : "Save"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Multi-Year Metrics Row */}
                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Branch</span>
                        <strong className="text-slate-800">{r.branchCode} - {r.branchName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Historical Cutoffs (23|24|25)</span>
                        <strong className="text-slate-800 font-mono flex items-center gap-1">
                          {r.historicalCutoff2023.toFixed(1)} | {r.historicalCutoff2024.toFixed(1)} | {r.historicalCutoff2025.toFixed(1)}
                          {trend.direction === "Surging" || trend.direction === "Increasing" ? (
                            <TrendingUp size={13} className="text-rose-500" />
                          ) : trend.direction === "Softening" || trend.direction === "Decreasing" ? (
                            <TrendingDown size={13} className="text-emerald-500" />
                          ) : (
                            <Minus size={13} className="text-gray-400" />
                          )}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Cutoff Gap vs You</span>
                        <strong className={margin >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                          {margin >= 0 ? "+" : ""}{margin.toFixed(2)} marks
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Fees & Intake</span>
                        <strong className="text-slate-800">Rs.{(r.annualFees/1000).toFixed(0)}K/yr · {r.intakeSeats} Seats</strong>
                      </div>
                    </div>

                    {/* Adaptive Trend & Competitiveness Highlights Bar */}
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Trend direction badge */}
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1"
                          style={{
                            background: trend.directionColor?.bg || "#eff6ff",
                            color: trend.directionColor?.text || "#1e40af",
                            borderColor: trend.directionColor?.border || "#93c5fd",
                          }}
                        >
                          {trend.direction} Trend ({trend.absoluteChange >= 0 ? `+${trend.absoluteChange.toFixed(2)}` : trend.absoluteChange.toFixed(2)} pts)
                        </span>

                        {/* Competitiveness indicator */}
                        {r.competitivenessIndicator && (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1"
                            style={{
                              background: r.competitivenessIndicator.badgeColor.bg,
                              color: r.competitivenessIndicator.badgeColor.text,
                              borderColor: r.competitivenessIndicator.badgeColor.border,
                            }}
                          >
                            <ShieldCheck size={12} />
                            {r.competitivenessIndicator.level} Demand ({r.competitivenessIndicator.competitivenessIndex}/100)
                          </span>
                        )}

                        {/* ML Prediction */}
                        <span className="text-[11px] font-medium text-slate-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                          ML Prob: <strong className="text-slate-800">{r.adaptivePrediction?.trendAwareScore ?? r.predictionResult.predictionScore}%</strong> (RF 40% + XGB 60%)
                        </span>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedCardKey(isExpanded ? null : key)}
                        className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline flex items-center gap-1"
                      >
                        {isExpanded ? "Hide Details" : "View Demand Signals & Factors →"}
                      </button>
                    </div>

                    {/* Expandable Signals & Rationale Panel */}
                    {isExpanded && (
                      <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 text-xs space-y-3 transition-all">
                        {/* Contributing Factors */}
                        {r.contributingFactors && r.contributingFactors.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                              Key Recommendation Signals:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                              {r.contributingFactors.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Competitiveness Decomposition */}
                        {r.competitivenessIndicator?.signals && (
                          <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                              Demand Signal Breakdown (Transparent Evaluation):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {r.competitivenessIndicator.signals.map(s => (
                                <div key={s.name} className="bg-white/80 border border-amber-100 rounded-lg p-2 text-[11px]">
                                  <div className="flex justify-between font-semibold text-slate-800">
                                    <span>{s.name}</span>
                                    <span>{s.score}/100</span>
                                  </div>
                                  <p className="text-gray-500 text-[10px] mt-0.5">{s.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Link to Trend Dashboard */}
                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Verified against official TNEA {r.sourceYear} allotment records.</span>
                          <Link
                            to="/trends"
                            className="text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1"
                          >
                            Explore interactive multi-year chart in Trend Dashboard →
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Fit breakdown progress bars */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700 flex items-center gap-1"><Sparkles size={12} className="text-amber-500" />Fit Score Dimensions</span>
                        <span className="text-gray-500 text-[11px] max-w-xs truncate">{r.fitExplanation.slice(0,80)}{r.fitExplanation.length>80?"...":""}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[{label:"Cutoff",val:r.fitDimensions.cutoffCompatibility,max:40,color:"#f59e0b"},{label:"Branch",val:r.fitDimensions.branchPreference,max:20,color:"#3b82f6"},{label:"ML Fit",val:r.fitDimensions.mlSuitability,max:15,color:"#8b5cf6"},{label:"Location",val:r.fitDimensions.locationFit,max:10,color:"#10b981"},{label:"Budget",val:r.fitDimensions.budgetFit,max:10,color:"#06b6d4"},{label:"Trend",val:r.fitDimensions.historicalTrend,max:5,color:"#ec4899"}].map(d => (
                          <div key={d.label} className="text-center">
                            <div className="text-[10px] text-gray-500 mb-1">{d.label}</div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${(d.val/d.max)*100}%`,background:d.color}} /></div>
                            <div className="text-[10px] font-mono text-gray-600 mt-0.5">{d.val.toFixed(1)}/{d.max}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {displayCount < filtered.length && (
                <div className="pt-4 text-center">
                  <button onClick={() => setDisplayCount(c => c+25)} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 shadow-xs transition-all">
                    Load More ({filtered.length-displayCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SAVED OPTIONS TAB */}
      {tab === "saved" && (
        <div className="space-y-4">
          {savedEnhanced.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <Bookmark size={32} className="text-gray-300 mx-auto" />
              <p className="text-gray-500 font-medium">You haven't saved any colleges yet.</p>
              <p className="text-gray-400 text-xs">Browse recommendations and click Save to add colleges here.</p>
              <button onClick={() => setTab("recommendations")} className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-400 transition-all">Browse Recommendations</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-gray-500"><strong>{savedEnhanced.length}</strong> saved options ranked by Fit Score</p>
                {selectedForCompare.size >= 2 && <button onClick={() => setTab("compare")} className="flex items-center gap-2 px-4 py-2 bg-[#0f1e33] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all"><Scale size={14} />Compare ({selectedForCompare.size})</button>}
              </div>
              {savedEnhanced.length === 1 && <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2"><AlertCircle size={14} className="text-amber-500 shrink-0" />Save at least one more college to enable comparison.</div>}
              {savedEnhanced.map((r) => {
                const key = `${r.collegeCode}-${r.branchCode}`;
                const isChecked = selectedForCompare.has(key);
                const colors = getClassificationColor(r.fitClassification);
                const margin = (myCutoff ?? 175) - r.historicalCutoff2024;
                return (
                  <div key={key} className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${isChecked ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={isChecked} onChange={() => setSelectedForCompare(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else if (n.size < 5) n.add(key); return n; })} className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{r.collegeCode}</span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border" style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>{r.fitScore}/100 · {r.fitLabel}</span>
                            </div>
                            <h3 className="font-semibold text-sm text-[#0f1e33]">{r.collegeName}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{r.branchCode} - {r.branchName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} className="text-amber-500" />{r.district}</p>
                          </div>
                          <div className="text-xs space-y-1 sm:text-right shrink-0">
                            <div className="text-gray-400">Cutoff 2024: <strong className="text-slate-800 font-mono">{r.historicalCutoff2024.toFixed(1)}</strong></div>
                            <div className="text-gray-400">Your Cutoff: <strong className="text-amber-600 font-mono">{(myCutoff ?? 175).toFixed(2)}</strong></div>
                            <div className={margin >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>Gap: {margin >= 0 ? "+" : ""}{margin.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="mt-2 bg-slate-50 rounded-xl p-2.5 text-[11px] text-gray-600">
                          <BookmarkCheck size={12} className="text-amber-500 inline mr-1" />{r.fitExplanation.slice(0,130)}{r.fitExplanation.length>130?"...":""}
                        </div>
                      </div>
                      <button onClick={() => toggleSavedCollege({ college_code: r.collegeCode, college_name: r.collegeName, branch_code: r.branchCode, branch_name: r.branchName, district: r.district, college_type: r.collegeType, cutoff_2023: r.historicalCutoff2023, fees: r.annualFees })} className="shrink-0 text-rose-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50" title="Remove"><Trash2 size={15} /></button>
                    </div>
                  </div>
                );
              })}
              {selectedForCompare.size >= 2 && <div className="pt-2 text-center"><button onClick={() => setTab("compare")} className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f1e33] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md"><Scale size={16} />Compare {selectedForCompare.size} Selected Options <ArrowRight size={16} /></button></div>}
            </>
          )}
        </div>
      )}

      {/* COMPARE TAB */}
      {tab === "compare" && (
        <div className="space-y-5">
          {selectedForCompare.size < 2 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <Scale size={32} className="text-gray-300 mx-auto" />
              <p className="text-gray-500 font-medium">Select 2 to 5 saved college options to compare.</p>
              <p className="text-gray-400 text-xs">Go to My Saved Options and check the options you want to compare.</p>
              <button onClick={() => setTab("saved")} className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-400 transition-all">Go to Saved Options</button>
            </div>
          ) : (
            <>
              {/* Option Rankings */}
              <div>
                <h2 className="font-display text-base font-semibold text-[#0f1e33] mb-3 flex items-center gap-2"><Star size={16} className="text-amber-500" />Ranked by Personalized Fit Score</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {compareOptions.map((r, idx) => {
                    const colors = getClassificationColor(r.fitClassification);
                    const margin = (myCutoff ?? 175) - r.historicalCutoff2024;
                    const optLabels = ["OPTION 1","OPTION 2","OPTION 3","OPTION 4","OPTION 5"];
                    return (
                      <div key={`${r.collegeCode}-${r.branchCode}`} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm relative">
                        <div className="absolute top-3 right-3 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{optLabels[idx]}</div>
                        <div className="mb-2"><span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{r.collegeCode}</span></div>
                        <h3 className="font-semibold text-sm text-[#0f1e33] leading-tight mb-0.5">{r.collegeName}</h3>
                        <p className="text-xs text-gray-500 mb-2">{r.branchCode} - {r.branchName}</p>
                        <div className="flex items-center justify-center py-3 my-2 rounded-xl" style={{ background: colors.bg }}>
                          <div className="text-center"><div className="text-3xl font-black" style={{ color: colors.text }}>{r.fitScore}</div><div className="text-[11px] font-bold" style={{ color: colors.text }}>/100 · {r.fitLabel}</div></div>
                        </div>
                        <div className="text-xs space-y-1 mt-2">
                          <div className="flex justify-between text-gray-500"><span>2024 Cutoff:</span><strong className="font-mono">{r.historicalCutoff2024.toFixed(1)}</strong></div>
                          <div className="flex justify-between text-gray-500"><span>Your Cutoff:</span><strong className="text-amber-600 font-mono">{(myCutoff ?? 175).toFixed(2)}</strong></div>
                          <div className="flex justify-between"><span className="text-gray-500">Gap:</span><strong className={margin >= 0 ? "text-emerald-700" : "text-rose-600"}>{margin >= 0 ? "+" : ""}{margin.toFixed(2)}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-slate-50"><h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-2"><BarChart2 size={15} className="text-amber-500" />Detailed Comparison Matrix</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left p-3 text-gray-500 font-semibold w-36">Factor</th>
                        {compareOptions.map(r => <th key={`${r.collegeCode}-${r.branchCode}`} className="text-center p-3 text-slate-800 font-semibold min-w-[160px]">{r.collegeName.split(",")[0].slice(0,20)}{r.collegeName.length>20?"...":""}<br /><span className="text-amber-600 font-normal">{r.branchCode}</span></th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { label: "Fit Score", fn: (r: EnhancedOption) => { const c = getClassificationColor(r.fitClassification); return <span className="font-black text-base px-2 py-0.5 rounded" style={{ color: c.text, background: c.bg }}>{r.fitScore}/100</span>; } },
                        { label: "Classification", fn: (r: EnhancedOption) => { const c = getClassificationColor(r.fitClassification); return <span className="font-bold text-[11px] px-2 py-0.5 rounded border" style={{ color: c.text, background: c.bg, borderColor: c.border }}>{r.fitClassification}</span>; } },
                        { label: "Your Cutoff", fn: (r: EnhancedOption) => <span className="font-mono font-bold text-amber-700">{(myCutoff ?? 175).toFixed(2)}</span> },
                        { label: "2024 Cutoff", fn: (r: EnhancedOption) => <span className="font-mono">{r.historicalCutoff2024.toFixed(1)}</span> },
                        { label: "Cutoff Gap", fn: (r: EnhancedOption) => { const m = (myCutoff ?? 175) - r.historicalCutoff2024; return <span className={`font-bold ${m >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{m >= 0 ? "+" : ""}{m.toFixed(2)}</span>; } },
                        { label: "2023 Cutoff", fn: (r: EnhancedOption) => <span className="font-mono text-gray-500">{r.historicalCutoff2023.toFixed(1)}</span> },
                        { label: "2025 Cutoff", fn: (r: EnhancedOption) => <span className="font-mono text-gray-500">{r.historicalCutoff2025?.toFixed(1) ?? "Unavailable"}</span> },
                        { label: "Trend", fn: (r: EnhancedOption) => { const d = r.historicalCutoff2024-r.historicalCutoff2023; return <span className={d<-0.5?"text-emerald-600":d>0.5?"text-rose-600":"text-gray-500"}>{d<-0.5?"Declining":d>0.5?"Rising":"Stable"}</span>; } },
                        { label: "Branch Fit", fn: (r: EnhancedOption) => profile?.preferred_branches?.includes(r.branchCode) ? <span className="text-emerald-700 font-semibold">Preferred</span> : <span className="text-gray-500">Not preferred</span> },
                        { label: "Location Fit", fn: (r: EnhancedOption) => !profile?.preferred_district||profile?.preferred_district==="All" ? <span className="text-gray-500">No preference</span> : r.district.toLowerCase()===profile?.preferred_district?.toLowerCase() ? <span className="text-emerald-700 font-semibold">Preferred district</span> : <span className="text-amber-600">Different district</span> },
                        { label: "Budget Fit", fn: (r: EnhancedOption) => !profile?.budget ? <span className="text-gray-500">No preference</span> : r.annualFees<=(profile.budget??0) ? <span className="text-emerald-700 font-semibold">Within budget</span> : <span className="text-rose-600">Over budget</span> },
                        { label: "ML Suitability", fn: (r: EnhancedOption) => <span className="font-semibold text-amber-700">{r.predictionResult?.predictionScore ?? "Unavailable"}% - {r.suitability}</span> },
                        { label: "Annual Fees", fn: (r: EnhancedOption) => <span>Rs.{((r.annualFees??0)/1000).toFixed(0)}K/yr</span> },
                        { label: "District", fn: (r: EnhancedOption) => <span className="text-gray-600">{r.district||"Unavailable"}</span> },
                      ].map((row, i) => (
                        <tr key={i} className={i%2===0?"bg-white":"bg-slate-50/50"}>
                          <td className="p-3 font-semibold text-gray-600">{row.label}</td>
                          {compareOptions.map(r => <td key={`${r.collegeCode}-${r.branchCode}`} className="p-3 text-center">{row.fn(r)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-sm text-[#0f1e33] mb-4 flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-500" />Fit Dimension Radar Chart</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={[
                    { factor:"Cutoff", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.cutoffCompatibility/40)*100]))},
                    { factor:"Branch", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.branchPreference/20)*100]))},
                    { factor:"ML Fit", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.mlSuitability/15)*100]))},
                    { factor:"Location", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.locationFit/10)*100]))},
                    { factor:"Budget", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.budgetFit/10)*100]))},
                    { factor:"Trend", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`,(r.fitDimensions.historicalTrend/5)*100]))},
                  ]}>
                    <PolarGrid /><PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: "#64748b" }} />
                    {compareOptions.map((r, idx) => <Radar key={`${r.collegeCode}-${r.branchCode}`} name={`${r.collegeName.split(",")[0].slice(0,14)}(${r.branchCode})`} dataKey={`${r.collegeName.split(",")[0].slice(0,12)}(${r.branchCode})`} stroke={COLORS[idx]} fill={COLORS[idx]} fillOpacity={0.15} />)}
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(val: any) => [`${Number(val).toFixed(0)}%`, ""]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Historical Bar Chart */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-sm text-[#0f1e33] mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-blue-500" />Historical Cutoff Comparison</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { year:"2023", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,10)}(${r.branchCode})`,r.historicalCutoff2023])), "Your Cutoff":myCutoff??175},
                    { year:"2024", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,10)}(${r.branchCode})`,r.historicalCutoff2024])), "Your Cutoff":myCutoff??175},
                    { year:"2025", ...Object.fromEntries(compareOptions.map(r=>[`${r.collegeName.split(",")[0].slice(0,10)}(${r.branchCode})`,r.historicalCutoff2025??r.historicalCutoff2024])), "Your Cutoff":myCutoff??175},
                  ]} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} /><YAxis domain={[130, 200]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    {compareOptions.map((r, idx) => <Bar key={`${r.collegeCode}-${r.branchCode}`} dataKey={`${r.collegeName.split(",")[0].slice(0,10)}(${r.branchCode})`} fill={COLORS[idx]} radius={[3,3,0,0]} maxBarSize={30} />)}
                    <Bar dataKey="Your Cutoff" fill="#94a3b8" radius={[3,3,0,0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Personalized Explanation */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-sm text-amber-400 flex items-center gap-2"><Sparkles size={15} />Personalized Analysis</h3>
                {compareOptions.map((r, idx) => {
                  const optLabels=["Option 1","Option 2","Option 3","Option 4","Option 5"];
                  const c=getClassificationColor(r.fitClassification);
                  return (
                    <div key={`${r.collegeCode}-${r.branchCode}`} className="border border-slate-700 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-gray-400 font-semibold">{optLabels[idx]}</span>
                        <span className="font-bold text-white">{r.collegeName.split(",")[0]}</span>
                        <span className="text-amber-400 font-semibold">{r.branchCode} - {r.branchName}</span>
                        <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-bold" style={{ background: c.bg, color: c.text }}>{r.fitScore}/100</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{r.fitExplanation}</p>
                    </div>
                  );
                })}
              </div>

              {/* Additional Saved Options Check */}
              {(() => {
                const additional = savedEnhanced.filter(r => !selectedForCompare.has(`${r.collegeCode}-${r.branchCode}`)).sort((a,b) => b.fitScore-a.fitScore);
                const best = additional[0];
                return best ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-emerald-800 flex items-center gap-2"><Star size={14} className="text-emerald-600" />Another Saved Option Worth Considering</p>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{best.collegeName}</div>
                        <div className="text-xs text-gray-500">{best.branchCode} - {best.branchName} · {best.district}</div>
                        <div className="mt-1"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border" style={{ background: getClassificationColor(best.fitClassification).bg, color: getClassificationColor(best.fitClassification).text, borderColor: getClassificationColor(best.fitClassification).border }}>{best.fitScore}/100 · {best.fitLabel}</span></div>
                      </div>
                      <button onClick={() => setSelectedForCompare(s => { const n = new Set(s); n.add(`${best.collegeCode}-${best.branchCode}`); return n; })} disabled={selectedForCompare.size >= 5} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5"><Plus size={13} />Add to Comparison</button>
                    </div>
                    {additional.length > 1 && <p className="text-[11px] text-emerald-700">{additional.length-1} more saved option{additional.length>2?"s":""} available in My Saved Options.</p>}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-2">No additional suitable saved option identified from your current saved list.</p>;
              })()}

              <div className="text-center pt-2">
                <button onClick={() => setTab("recommendations")} className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-amber-400 hover:text-amber-700 transition-all">Back to Recommendations</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
