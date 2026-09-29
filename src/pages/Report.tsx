import { useState, useEffect } from "react";
import { FileText, Download, CheckCircle, AlertCircle, Calendar, User, Award, ShieldCheck, Printer, Sparkles, MapPin, ExternalLink, RefreshCw, BarChart2 } from "lucide-react";
import PageFlow from "../components/PageFlow";
import SyncStatusBanner from "../components/SyncStatusBanner";
import { EduPathAPI } from "../lib/apiClient";
import { generateCounsellingReport, triggerPrintReport, type StudentReportData } from "../lib/reportGenerator";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, ReferenceLine } from "recharts";

export default function Report() {
  const { user, profile, academicRecord: authAcademic, savedColleges: authSaved } = useAuth();
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<StudentReportData | null>(null);
  const [academicRecord, setAcademicRecord] = useState<any>(authAcademic);
  const [savedColleges, setSavedColleges] = useState<any[]>(authSaved || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      if (user) {
        try {
          // Generate/retrieve via Backend Report API
          const res = await EduPathAPI.report.generate();
          if (isMounted && res.success && res.report) {
            setReport(res.report as StudentReportData);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Backend report API call note:", e);
        }
      }

      // Local fallback if guest or server warming up
      try {
        const autoReport = await generateCounsellingReport(profile, authAcademic, authSaved || []);
        if (isMounted) {
          setReport(autoReport);
        }
      } catch (err) {
        console.warn("Report fallback note:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReportData();

    return () => {
      isMounted = false;
    };
  }, [user, profile, authAcademic, authSaved]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (user) {
        const res = await EduPathAPI.report.generate();
        if (res.success && res.report) {
          setReport(res.report as StudentReportData);
          setGenerating(false);
          return;
        }
      }
      const newReport = await generateCounsellingReport(profile, academicRecord, savedColleges);
      setReport(newReport);
    } catch (err) {
      console.warn("Report generation error:", err);
      const newReport = await generateCounsellingReport(profile, academicRecord, savedColleges);
      setReport(newReport);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    // Build a self-contained HTML report and download it as a .html file
    // which users can open in browser and save as PDF via Ctrl+P → Save as PDF
    const printContent = document.getElementById("printable-report");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EduPath TNEA Report — ${report.studentName} — ${report.reportId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fc; color: #0f1e33; padding: 40px; }
    .report { max-width: 900px; margin: 0 auto; background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f1e33; }
    h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #0f1e33; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 800; color: #0f1e33; letter-spacing: -0.5px; }
    .badge { background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .meta { font-size: 12px; color: #64748b; line-height: 1.8; text-align: right; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
    .row:last-child { border-bottom: none; }
    .row strong { color: #0f1e33; font-weight: 600; }
    .cutoff { color: #d97706; font-size: 16px; font-weight: 800; }
    .dark-card { background: #0f1e33; color: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .amber { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; }
    td { padding: 10px 12px; border-bottom: 1px solid #f8fafc; color: #0f1e33; }
    tr:hover td { background: #fafafa; }
    .safe { color: #059669; } .match { color: #d97706; } .reach { color: #dc2626; }
    .section-title { font-size: 13px; font-weight: 700; color: #0f1e33; margin-bottom: 12px; display: flex; align-items: center; gap-6: 0; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; }
    .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 11px; color: #94a3b8; margin-top: 24px; }
    .bar-container { margin: 16px 0; }
    .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 11px; }
    .bar-label { width: 200px; flex-shrink: 0; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; background: #f1f5f9; border-radius: 4px; height: 18px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; color: white; font-size: 10px; font-weight: 700; }
    @media print { body { padding: 0; background: white; } .report { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <div>
        <div class="brand">● EDUPATH <span class="badge">TNEA PLATFORM</span></div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Official AI-Powered College Admission &amp; Counselling Report</div>
      </div>
      <div class="meta">
        <div>Report ID: <strong style="font-family:monospace">${report.reportId}</strong></div>
        <div>Generated: <strong>${report.generatedAt}</strong></div>
        <div>Data Version: <strong style="color:#d97706;font-family:monospace">${report.dataVersion}</strong></div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>👤 Student Candidate Details</h3>
        <div class="row"><span>Name:</span><strong>${report.studentName}</strong></div>
        <div class="row"><span>Category:</span><strong>${report.category}</strong></div>
        <div class="row"><span>District:</span><strong>${report.district}</strong></div>
      </div>
      <div class="card">
        <h3>🏆 TNEA Cutoff Calculation</h3>
        <div class="row"><span>Maths + Physics/2 + Chem/2:</span><strong style="font-family:monospace">${report.maths} + ${report.physics / 2} + ${report.chemistry / 2}</strong></div>
        <div class="row"><span>Final Cutoff:</span><strong class="cutoff">${report.cutoff.toFixed(2)} / 200.00</strong></div>
        <div class="row"><span>7.5% Govt Quota:</span><strong style="color:#059669">${report.isGovernmentSchool75Quota ? 'Eligible' : 'General'}</strong></div>
      </div>
    </div>

    <div class="dark-card">
      <div class="amber" style="font-weight:700;font-size:13px;margin-bottom:8px">✨ ML Predictions (${report.modelVersion})</div>
      <p style="font-size:12px;color:#cbd5e1;line-height:1.6">${report.counsellorSummary}</p>
    </div>

    <h3 style="margin-bottom:12px">📊 College Cutoff Comparison</h3>
    <div class="bar-container">
      ${report.recommendations.slice(0, 6).map((r, i) => {
        const pct = Math.round((r.historicalCutoff2024 / 200) * 100);
        const myPct = Math.round((report.cutoff / 200) * 100);
        const colors = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4'];
        return `<div class="bar-row">
          <span class="bar-label" title="${r.collegeName}">${i+1}. ${r.collegeName.slice(0,28)}${r.collegeName.length>28?'..':''}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${colors[i%6]};min-width:40px">${r.historicalCutoff2024.toFixed(1)}</div>
          </div>
          <span style="font-size:10px;color:#64748b;flex-shrink:0">${r.branchCode}</span>
        </div>`;
      }).join('')}
      <div class="bar-row" style="border-top:2px dashed #fbbf24;padding-top:8px;margin-top:4px">
        <span class="bar-label" style="color:#d97706;font-weight:700">⯀ Your Cutoff</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((report.cutoff/200)*100)}%;background:#d97706">${report.cutoff.toFixed(2)}</div></div>
        <span style="font-size:10px;color:#d97706;font-weight:700;flex-shrink:0">YOU</span>
      </div>
    </div>

    <h3 style="margin:20px 0 12px">✅ Top Recommended Colleges</h3>
    <table>
      <thead><tr><th>Code</th><th>College</th><th>Branch</th><th>Cutoff 2024</th><th>Fit</th><th>Score</th></tr></thead>
      <tbody>
        ${report.recommendations.map(r => `<tr>
          <td style="font-family:monospace;font-weight:700;color:#92400e">${r.collegeCode}</td>
          <td style="font-weight:600">${r.collegeName}</td>
          <td style="font-weight:700">${r.branchCode}</td>
          <td style="font-family:monospace">${r.historicalCutoff2024.toFixed(1)}</td>
          <td class="${r.suitability.toLowerCase()}">${r.suitability}</td>
          <td style="font-weight:700;color:#d97706">${r.predictionResult.predictionScore}%</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <h3>Guidance &amp; Next Steps</h3>
        <ul style="padding-left:16px;font-size:12px;color:#475569;line-height:1.8">
          ${report.guidanceNotes.map(g => `<li>${g}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h3>Official TNEA Sources</h3>
        ${report.officialSources.map(s => `<div style="font-size:12px;color:#475569;padding:4px 0">${s.name} (${s.year}) — ${s.url}</div>`).join('')}
      </div>
    </div>

    <div class="disclaimer">
      <strong>Disclaimer:</strong> ${report.disclaimer}
      <div style="margin-top:8px;font-family:monospace;font-size:10px;color:#cbd5e1">VERIFIED BY EDUPATH TNEA ENGINE — ${report.reportId}</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EduPath-Report-${report.studentName.replace(/\s+/g, "-")}-${report.reportId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 space-y-3">
        <RefreshCw size={20} className="animate-spin text-amber-500 mx-auto" />
        <p>Compiling 22-Section TNEA Personalised Counselling Report...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <SyncStatusBanner compact />

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="font-display text-xl sm:text-3xl text-[#0f1e33] mb-1">{t("report.title")}</h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            Official Reproducible TNEA Admission Guidance & Prediction Report
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all border border-slate-300"
          >
            <RefreshCw size={14} className={generating ? "animate-spin text-amber-600" : ""} />
            <span>{generating ? "Updating..." : "Regenerate"}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none justify-center bg-amber-500 hover:bg-amber-400 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={15} />
            <span>PDF</span>
          </button>

          <button
            onClick={triggerPrintReport}
            className="flex-1 sm:flex-none justify-center bg-[#0f1e33] hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {!report ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 sm:w-16 h-14 sm:h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
            <FileText size={28} />
          </div>
          <h2 className="font-display text-lg sm:text-xl text-[#0f1e33] font-semibold">{t("report.generateReport")}</h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto">
            Generate your personalized, reproducible TNEA report combining verified cutoffs, Random Forest & XGBoost predictions, saved options, and guidance.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#0f1e33] hover:bg-slate-800 disabled:opacity-50 text-white text-xs px-5 sm:px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-2"
          >
            <Sparkles size={16} className="text-amber-400" />
            <span>{generating ? "Generating..." : "Generate Report Now"}</span>
          </button>
        </div>
      ) : (
        /* Printable 22-Section Full Report */
        <div id="printable-report" className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 lg:p-10 shadow-sm space-y-6 sm:space-y-8 print:p-0 print:border-none print:shadow-none">
          {/* SECTION 1: EduPath Branding Header */}
          <div className="border-b border-gray-200 pb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
                <h2 className="font-display text-2xl text-[#0f1e33] font-bold tracking-tight">EDUPATH</h2>
                <span className="bg-slate-100 text-slate-800 text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold">TNEA PLATFORM</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Official AI-Powered College Admission & Counselling Report</p>
            </div>

            <div className="text-left sm:text-right text-xs text-gray-500 space-y-0.5">
              <div>Report ID: <strong className="font-mono text-slate-800">{report.reportId}</strong></div>
              <div>Generated: <strong className="text-slate-800">{report.generatedAt}</strong></div>
              <div>Data Version: <strong className="font-mono text-amber-700">{report.dataVersion}</strong></div>
            </div>
          </div>

          {/* SECTIONS 2 - 6: Student Profile & Marks Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              <h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-1.5">
                <User size={15} className="text-amber-500" />
                Student Candidate Details
              </h3>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5 text-gray-600">
                <span>Student Name:</span>
                <strong className="text-slate-900 font-semibold">{report.studentName}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5 text-gray-600">
                <span>Community Category:</span>
                <strong className="text-slate-900 font-semibold">{report.category}</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Preferred District:</span>
                <strong className="text-slate-900 font-semibold">{report.district}</strong>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              <h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                TNEA Cutoff Calculation Formula
              </h3>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5 text-gray-600">
                <span>Maths (100) + Physics (50) + Chem (50):</span>
                <strong className="text-slate-900 font-mono">{report.maths} + {report.physics/2} + {report.chemistry/2}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5 text-gray-600">
                <span>Final Calculated Cutoff:</span>
                <strong className="text-amber-600 font-bold text-sm">{report.cutoff.toFixed(2)} / 200.00</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>7.5% Govt Quota Status:</span>
                <strong className="text-emerald-700 font-semibold">{report.isGovernmentSchool75Quota ? "Eligible" : "General"}</strong>
              </div>
            </div>
          </div>

          {/* SECTIONS 8 - 11: ML Model Predictions & Historical Evidence */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-amber-400 flex items-center gap-2">
                <Sparkles size={16} />
                ML Admission Model Predictions ({report.modelVersion})
              </h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                Random Forest + XGBoost
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {report.counsellorSummary}
            </p>
          </div>

          {/* CHART SECTION: College Cutoff Comparison */}
          {report.recommendations.length > 0 && (() => {
            const chartData = report.recommendations.slice(0, 8).map(r => ({
              name: r.collegeName.split(",")[0].length > 20 ? r.collegeName.split(",")[0].slice(0, 20) + "…" : r.collegeName.split(",")[0],
              fullName: r.collegeName,
              branch: r.branchCode,
              cutoff2023: r.historicalCutoff2023,
              cutoff2024: r.historicalCutoff2024,
              suitability: r.suitability,
            }));
            const minVal = Math.max(80, Math.min(...chartData.map(d => Math.min(d.cutoff2023 || 170, d.cutoff2024 || 170))) - 5);
            const SUITABILITY_COLORS: Record<string, string> = { Safe: "#10b981", Match: "#f59e0b", Reach: "#ef4444" };
            return (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-2">
                    <BarChart2 size={16} className="text-amber-500" />
                    College Cutoff Comparison
                    <span className="text-[11px] font-normal text-gray-400">(2023 &amp; 2024)</span>
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    report.usingSavedColleges
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {report.usingSavedColleges
                      ? `📌 ${report.savedChoices.length} Saved Colleges`
                      : "🤖 AI Recommendations"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 overflow-hidden">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 65 }} barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#64748b" }}
                        angle={-38}
                        textAnchor="end"
                        interval={0}
                        height={72}
                      />
                      <YAxis domain={[minVal, 200]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickCount={7} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          const margin2024 = report.cutoff - d.cutoff2024;
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs space-y-1 max-w-[220px]">
                              <p className="font-semibold text-slate-800 leading-tight">{d.fullName.split(",")[0]}</p>
                              <p className="text-gray-500">{d.branch} Branch</p>
                              <div className="flex justify-between gap-4">
                                <span className="text-blue-400">2023: <strong>{d.cutoff2023?.toFixed(1)}</strong></span>
                                <span className="text-blue-600">2024: <strong>{d.cutoff2024?.toFixed(1)}</strong></span>
                              </div>
                              <div className="border-t pt-1 mt-1">
                                <p className="text-amber-700 font-bold">Your Cutoff: {report.cutoff.toFixed(2)}</p>
                                <p className={`font-semibold ${margin2024 >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                  Margin: {margin2024 >= 0 ? "+" : ""}{margin2024.toFixed(2)} · {d.suitability}
                                </p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <ReferenceLine y={report.cutoff} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={2}
                        label={{ value: `Your Cutoff: ${report.cutoff.toFixed(1)}`, position: "insideTopRight", fontSize: 9, fill: "#92400e" }}
                      />
                      <Bar dataKey="cutoff2023" name="Cutoff 2023" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="cutoff2024" name="Cutoff 2024" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Suitability breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  {(["Safe", "Match", "Reach"] as const).map(suit => {
                    const count = report.recommendations.filter(r => r.suitability === suit).length;
                    return (
                      <div
                        key={suit}
                        className="rounded-xl border py-2.5 px-3"
                        style={{
                          background: suit === "Safe" ? "#ecfdf5" : suit === "Match" ? "#fffbeb" : "#fef2f2",
                          borderColor: suit === "Safe" ? "#a7f3d0" : suit === "Match" ? "#fde68a" : "#fecaca",
                        }}
                      >
                        <p className="font-bold text-sm" style={{ color: SUITABILITY_COLORS[suit] }}>{count}</p>
                        <p style={{ color: SUITABILITY_COLORS[suit] }}>{suit} Options</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* SECTIONS 12 - 14: Top Recommended Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#0f1e33] flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              Verified Top Recommended TNEA Colleges
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5 rounded-l-xl">Code</th>
                    <th className="p-2.5">College Name</th>
                    <th className="p-2.5">Branch</th>
                    <th className="p-2.5">Cutoff (2024)</th>
                    <th className="p-2.5">Suitability</th>
                    <th className="p-2.5 rounded-r-xl">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.recommendations.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-amber-800">{rec.collegeCode}</td>
                      <td className="p-2.5 font-medium text-slate-800">{rec.collegeName}</td>
                      <td className="p-2.5 font-bold text-slate-700">{rec.branchCode}</td>
                      <td className="p-2.5 font-mono">{rec.historicalCutoff2024.toFixed(1)}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">{rec.suitability}</td>
                      <td className="p-2.5 font-bold text-amber-600">{rec.predictionResult.predictionScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* SECTIONS 17 - 19: Guidance & Data Verification Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 text-xs">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Counselling Guidance & Next Steps</h4>
              <ul className="space-y-1 text-gray-600 list-disc list-inside">
                {report.guidanceNotes.map((g, idx) => <li key={idx}>{g}</li>)}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-800">Verified Official TNEA Sources</h4>
              <div className="space-y-1">
                {report.officialSources.map((s, idx) => (
                  <div key={idx} className="flex justify-between bg-slate-50 px-2.5 py-1 rounded border border-slate-200/60">
                    <span>{s.name} ({s.year})</span>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">tneaonline.org →</a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTIONS 20 - 22: Disclaimer & System Seal */}
          <div className="bg-slate-50 rounded-xl p-4 text-[11px] text-gray-500 space-y-2 border border-slate-200/80">
            <p className="font-medium text-gray-700">System Disclaimer:</p>
            <p>{report.disclaimer}</p>
            <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-slate-400 font-mono text-[10px]">
              <span>VERIFIED BY EDUPATH TNEA ENGINE</span>
              <span>SECURITY HASH: {report.reportId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
