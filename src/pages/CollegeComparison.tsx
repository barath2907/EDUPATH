import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Trash2, Plus, MapPin, Star, TrendingUp, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import PageFlow from "../components/PageFlow";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { EduPathAPI } from "../lib/apiClient";
import { type ComparisonSessionResult } from "../lib/comparisonEngine";
import { type CollegeWithBranches, getCollegesWithCutoffs } from "../lib/tneaData";
import { useAuth } from "../contexts/AuthContext";

export default function CollegeComparison() {
  const { user, profile, academicRecord, comparisonCodes, setComparisonCodes } = useAuth();
  const [colleges, setColleges] = useState<CollegeWithBranches[]>([]);
  const [myCutoff, setMyCutoff] = useState<number | null>(academicRecord?.cutoff ?? null);
  const [myCategory, setMyCategory] = useState(academicRecord?.category ?? profile?.category ?? "OC");
  const [selectedCodes, setSelectedCodes] = useState<string[]>(comparisonCodes || ["0001", "2006", "2005"]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonSessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  useEffect(() => {
    const cat = academicRecord?.category ?? profile?.category ?? "OC";
    getCollegesWithCutoffs(cat).then(data => {
      setColleges(data);
    }).catch(err => console.warn("College load error:", err));
  }, [academicRecord, profile]);

  useEffect(() => {
    if (academicRecord) {
      setMyCutoff(academicRecord.cutoff);
      setMyCategory(academicRecord.category || profile?.category || "OC");
    } else if (user) {
      EduPathAPI.profile.get()
        .then(account => {
          if (account?.academicRecord) {
            setMyCutoff(account.academicRecord.cutoff);
            setMyCategory(account.academicRecord.category || account.profile.category || "OC");
          }
        })
        .catch(err => console.warn("Backend academic fetch note:", err));
    }
  }, [academicRecord, user, profile]);

  useEffect(() => {
    if (selectedCodes.length > 0) {
      setLoading(true);
      EduPathAPI.comparison.compare(selectedCodes, myCategory, myCutoff ?? 175.0).then(res => {
        setComparisonResult(res);
        setLoading(false);
      }).catch(err => {
        console.warn("Backend comparison error:", err);
        setLoading(false);
      });
    } else {
      setComparisonResult(null);
      setLoading(false);
    }
  }, [selectedCodes, myCategory, myCutoff]);

  const addCollege = (code: string) => {
    if (selectedCodes.length < 4 && !selectedCodes.includes(code)) {
      const next = [...selectedCodes, code];
      setSelectedCodes(next);
      setComparisonCodes(next);
    }
  };

  const removeCollege = (code: string) => {
    const next = selectedCodes.filter(c => c !== code && c.replace(/^0+/, '') !== code.replace(/^0+/, ''));
    setSelectedCodes(next);
    setComparisonCodes(next);
  };

  const filteredColleges = colleges.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q);
    const matchDistrict = selectedDistrict === "All" || c.district.toLowerCase() === selectedDistrict.toLowerCase();
    return matchQuery && matchDistrict;
  });

  const uniqueDistricts = Array.from(new Set(colleges.map(c => c.district))).filter(Boolean).sort();

  const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <SyncStatusBanner />

      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1">TNEA College & Branch Comparison</h1>
        {myCutoff ? (
          <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-2">
            <span>Your cutoff: <strong className="text-amber-600 font-semibold">{myCutoff.toFixed(2)}</strong> ({myCategory})</span>
            <span>•</span>
            <span>Ensemble model predictions evaluated across 461 institutions</span>
          </p>
        ) : (
          <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-500" />
            <Link to="/calculator" className="text-amber-600 font-semibold underline">Calculate your cutoff</Link> to view eligibility markers.
          </p>
        )}
      </div>

      {/* College Comparison Selector Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 mb-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-[#0f1e33] uppercase tracking-wider">
              Selected Colleges ({selectedCodes.length}/4)
            </h3>
            <p className="text-xs text-gray-500">Pick any engineering college from all 461 official TNEA institutions</p>
          </div>
          {selectedCodes.length > 0 && (
            <button
              onClick={() => setSelectedCodes([])}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium self-start sm:self-auto"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Selected Colleges Tray */}
        <div className="flex flex-wrap gap-2 min-h-8">
          {selectedCodes.length === 0 ? (
            <span className="text-xs text-gray-400 italic">No colleges selected yet. Choose from below to compare.</span>
          ) : (
            selectedCodes.map((code, idx) => {
              const col = colleges.find(c => c.code === code || c.code.replace(/^0+/, '') === code.replace(/^0+/, ''));
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0f1e33] text-white shadow-2xs animate-fadeIn"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span>{col ? col.name.split(",")[0] : `College ${code}`}</span>
                  <span className="font-mono text-[10px] text-amber-300">({code})</span>
                  <button
                    onClick={() => removeCollege(code)}
                    className="hover:text-rose-300 transition-colors ml-1 p-0.5"
                    title="Remove college"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search by college name, TNEA code (e.g. 0001, 1315, 2005), or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-700 bg-white placeholder:text-gray-400"
            />
          </div>
          <div>
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-gray-700 bg-white"
            >
              <option value="All">All Districts ({colleges.length} colleges)</option>
              {uniqueDistricts.map(d => (
                <option key={d} value={d}>
                  {d} ({colleges.filter(c => c.district.toLowerCase() === d.toLowerCase()).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Searchable Options Grid / List */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50 border border-gray-100 rounded-xl p-2 bg-slate-50/50">
          {filteredColleges.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              No colleges found matching "{searchQuery}".
            </div>
          ) : (
            filteredColleges.slice(0, 30).map(c => {
              const isSelected = selectedCodes.includes(String(c.code)) || selectedCodes.includes(String(c.code).replace(/^0+/, ''));
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg hover:bg-white transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        {c.code}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 truncate" title={c.name}>
                        {c.name}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>{c.district}</span>
                      <span>•</span>
                      <span className="capitalize">{c.type}</span>
                      {c.autonomous_status === "Autonomous" && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Autonomous</span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => isSelected ? removeCollege(String(c.code)) : addCollege(String(c.code))}
                    disabled={!isSelected && selectedCodes.length >= 4}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 shrink-0 transition-all ${
                      isSelected
                        ? "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                        : selectedCodes.length >= 4
                        ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200"
                        : "bg-white border border-gray-200 text-gray-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} />
                        <span>Compare</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
          {filteredColleges.length > 30 && (
            <div className="py-2 text-center text-[11px] text-gray-400 italic">
              Showing top 30 of {filteredColleges.length} matches. Type to refine further.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-500">Processing comparative analytics...</div>
      ) : !comparisonResult || comparisonResult.comparedColleges.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          Select colleges above to compare side-by-side.
        </div>
      ) : (
        <>
          {/* Visual Cutoff Comparison Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base text-[#0f1e33] font-semibold flex items-center gap-2">
                <TrendingUp size={18} className="text-amber-500" />
                Branch Cutoff Comparison (2024 Observed Thresholds)
              </h3>
            </div>

            <div className="h-60 sm:h-72 w-full overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonResult.chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="branch" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[140, 200]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f1e33", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {comparisonResult.comparedColleges.map((col, idx) => (
                    <Bar key={col.collegeCode} dataKey={col.collegeName.split(",")[0]} fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Side-by-Side Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonResult.comparedColleges.map((col, idx) => (
              <div key={col.collegeCode} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Code: {col.collegeCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {col.collegeType}
                    </span>
                  </div>
                  <h3 className="font-display text-base text-[#0f1e33] font-semibold">{col.collegeName}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={12} className="text-amber-500" />
                    {col.district} District
                  </p>
                  <Link
                    to="/trends"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 underline mt-1"
                  >
                    <TrendingUp size={12} />
                    View Cutoff Trend & Competitiveness →
                  </Link>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-gray-600">
                    <span>NAAC Accreditation:</span>
                    <strong className="text-slate-800 font-semibold">{col.naacGrade || "A"}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>NBA Accredited:</span>
                    <strong className="text-slate-800 font-semibold">{col.nbaAccredited ? "Yes" : "No"}</strong>
                  </div>
                </div>

                {/* Branches breakdown */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Branches & Historical Cutoffs</h4>
                  {col.branches.map(b => (
                    <div key={b.code} className="bg-white border border-gray-100 rounded-xl p-3 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-800 font-bold">{b.code} - {b.name}</strong>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px] font-mono">
                        <span>2023: {b.cutoff2023.toFixed(1)}</span>
                        <span>2024: {b.cutoff2024.toFixed(1)}</span>
                        <span>2025: {b.cutoff2025.toFixed(1)}</span>
                      </div>
                      {b.prediction && (
                        <div className="pt-1 text-[11px] font-medium text-amber-700 flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-500" />
                          <span>{b.prediction.predictionClass} ({b.prediction.predictionScore}%)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
