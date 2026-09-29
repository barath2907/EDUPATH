import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, CheckCircle, AlertCircle, Calculator, Info, RefreshCw } from "lucide-react";
import PageFlow from "../components/PageFlow";
import { useAuth } from "../contexts/AuthContext";
import { EduPathAPI } from "../lib/apiClient";
import { useTranslation } from "react-i18next";

type Step = "upload" | "review" | "result";

export default function CutoffCalculator() {
  const { user, profile, academicRecord, saveAcademic } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("upload");
  const [marks, setMarks] = useState({ maths: "", physics: "", chemistry: "" });
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState("OC");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverCutoffResult, setServerCutoffResult] = useState<{ totalCutoff: number; physicsContribution: number; chemistryContribution: number } | null>(null);

  useEffect(() => {
    if (profile?.category) setCategory(profile.category);
  }, [profile]);

  useEffect(() => {
    if (academicRecord) {
      setMarks({ maths: String(academicRecord.maths), physics: String(academicRecord.physics), chemistry: String(academicRecord.chemistry) });
      setCategory(academicRecord.category ?? profile?.category ?? "OC");
      setServerCutoffResult({
        totalCutoff: academicRecord.cutoff,
        physicsContribution: academicRecord.physics / 2,
        chemistryContribution: academicRecord.chemistry / 2,
      });
      setStep("result");
    } else if (user) {
      EduPathAPI.profile.get()
        .then(account => {
          if (account?.academicRecord) {
            setMarks({
              maths: String(account.academicRecord.maths),
              physics: String(account.academicRecord.physics),
              chemistry: String(account.academicRecord.chemistry),
            });
            setCategory(account.academicRecord.category ?? account.profile.category ?? "OC");
            setServerCutoffResult({
              totalCutoff: account.academicRecord.cutoff,
              physicsContribution: account.academicRecord.physics / 2,
              chemistryContribution: account.academicRecord.chemistry / 2,
            });
            setStep("result");
          }
        })
        .catch(err => console.warn("Backend academic record fetch note:", err));
    }
  }, [academicRecord, user, profile]);

  const updateMark = (k: keyof typeof marks, v: string) => {
    const n = v.replace(/[^0-9.]/g, "");
    if (Number(n) <= 100) setMarks(m => ({ ...m, [k]: n }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file.name);
  };

  const simulateUpload = (name: string) => {
    setUploadedFile(name);
    setTimeout(() => {
      // Simulate OCR extraction
      setMarks({ maths: "96", physics: "93", chemistry: "90" });
      setStep("review");
    }, 1200);
  };

  const cutoff = () => {
    const m = Number(marks.maths) || 0;
    const p = Number(marks.physics) || 0;
    const c = Number(marks.chemistry) || 0;
    return { maths: m, physicsContrib: (p / 100) * 50, chemContrib: (c / 100) * 50, total: m + (p / 100) * 50 + (c / 100) * 50 };
  };

  const result = serverCutoffResult ? {
    maths: Number(marks.maths) || 0,
    physicsContrib: serverCutoffResult.physicsContribution,
    chemContrib: serverCutoffResult.chemistryContribution,
    total: serverCutoffResult.totalCutoff,
  } : cutoff();

  const handleSaveToProfile = async () => {
    setSaving(true);
    const m = Number(marks.maths) || 0;
    const p = Number(marks.physics) || 0;
    const c = Number(marks.chemistry) || 0;

    try {
      // Execute through Backend Cutoff API
      const res = await EduPathAPI.cutoff.calculate(m, p, c, true, category);
      setServerCutoffResult(res);

      await saveAcademic({
        maths: m,
        physics: p,
        chemistry: c,
        cutoff: res.totalCutoff,
        category,
        source: uploadedFile ? "ocr" : "manual",
        academic_year: "2024",
        confirmed: true,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.warn("Cutoff save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1">{t("calculator.title")}</h1>
        <p className="text-gray-500 text-xs sm:text-sm">{t("calculator.subtitle")}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(["upload", "review", "result"] as Step[]).map((s, i) => {
          const labels = ["Enter Marks", "Review", "View Cutoff"];
          const done = ["upload", "review", "result"].indexOf(step) > i;
          const active = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                  ${done ? "bg-green-500 text-white" : active ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                  {done ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${active ? "text-[#0f1e33]" : "text-gray-400"}`}>{labels[i]}</span>
              </div>
              {i < 2 && <div className={`h-0.5 w-8 ${done ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step: Upload / Manual entry */}
      {step === "upload" && (
        <div className="space-y-6">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all cursor-pointer
              ${dragging ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"}`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => e.target.files?.[0] && simulateUpload(e.target.files[0].name)} />
            <div className="w-12 sm:w-14 h-12 sm:h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload size={22} className="text-amber-600" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-[#0f1e33] mb-1 sm:mb-2">{t("calculator.uploadTitle")}</h3>
            <p className="text-gray-400 text-xs sm:text-sm mb-3">{t("calculator.dragDrop")} · {t("calculator.fileTypes")}</p>
            {uploadedFile && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 sm:px-4 py-2 mt-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-green-700 text-xs sm:text-sm">{uploadedFile} — Processing...</span>
                <span className="w-3 h-3 border-2 border-green-400/40 border-t-green-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">{t("calculator.or")} {t("calculator.enterManually")}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-[#0f1e33] mb-4">{t("calculator.enterManually")}</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              {[{ key: "maths" as const, labelKey: "calculator.maths" }, { key: "physics" as const, labelKey: "calculator.physics" }, { key: "chemistry" as const, labelKey: "calculator.chemistry" }].map(({ key, labelKey }) => (
                <div key={key}>
                  <label className="block text-gray-500 text-[10px] sm:text-xs font-medium mb-1.5 truncate">{t(labelKey)} (/100)</label>
                  <input type="number" min="0" max="100" value={marks[key]} onChange={e => updateMark(key, e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 text-center font-mono text-base sm:text-lg text-[#0f1e33] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-gray-500 text-xs font-medium mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#0f1e33] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
                {["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setStep("review")} disabled={!marks.maths || !marks.physics || !marks.chemistry}
              className="w-full bg-[#0f1e33] hover:bg-[#162c4a] disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
              <Calculator size={16} /> {t("calculator.calculate")}
            </button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-semibold text-sm mb-1">Review your marks before calculating</p>
              <p className="text-amber-700 text-xs">Edit any value if it was extracted incorrectly or entered wrong.</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-[#0f1e33] mb-4">Subject Marks</h3>
            <div className="space-y-3">
              {[
                { key: "maths" as const, label: "Mathematics", note: "Counts at full value" },
                { key: "physics" as const, label: "Physics", note: "Counts as half (÷2)" },
                { key: "chemistry" as const, label: "Chemistry", note: "Counts as half (÷2)" },
              ].map(({ key, label, note }) => (
                <div key={key} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0f1e33] text-sm truncate">{label}</p>
                    <p className="text-gray-400 text-xs truncate">{note}</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <input type="number" min="0" max="100" value={marks[key]} onChange={e => updateMark(key, e.target.value)}
                      className="w-16 sm:w-20 border border-gray-200 rounded-lg px-2 sm:px-3 py-2 text-center font-mono font-semibold text-base sm:text-lg text-[#0f1e33] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                    <span className="text-gray-400 text-xs sm:text-sm">/ 100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-2">
            <Info size={14} className="text-blue-500 shrink-0" />
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Formula: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] sm:text-xs">Maths + (Phys ÷ 2) + (Chem ÷ 2)</span>
              <span className="text-gray-400 text-xs block sm:inline sm:ml-2">Max: 200 · DTE Tamil Nadu</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="flex items-center gap-2 border border-gray-200 text-gray-600 font-medium px-4 sm:px-5 py-3 rounded-xl hover:bg-gray-50 transition-all text-sm">
              <RefreshCw size={13} /> Re-enter
            </button>
            <button onClick={() => setStep("result")}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
              <Calculator size={16} /> {t("calculator.calculate")}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <div className="space-y-5">
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-green-700 font-medium text-sm">{t("calculator.savedSuccess")}</span>
            </div>
          )}

          <div className="bg-[#0f1e33] rounded-2xl p-6 sm:p-8 text-white text-center">
            <p className="text-blue-300/70 text-xs sm:text-sm mb-2 uppercase tracking-wider">{t("calculator.result")}</p>
            <p className="font-display text-5xl sm:text-7xl text-amber-400 mb-2">{result.total.toFixed(1)}</p>
            <p className="text-blue-300/60 text-xs sm:text-sm mb-4">out of 200 · {category} Category · 2024</p>
            <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 rounded-full px-3.5 sm:px-4 py-1.5">
              <CheckCircle size={13} className="text-green-400" />
              <span className="text-green-300 text-xs sm:text-sm">Student-confirmed · Based on verified marks</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-[#0f1e33] mb-4">{t("calculator.breakdown")}</h3>
            <div className="space-y-3">
              {[
                { label: "Mathematics", marks: result.maths, contrib: result.maths, formula: "× 1.0" },
                { label: "Physics", marks: Number(marks.physics), contrib: result.physicsContrib, formula: "÷ 2" },
                { label: "Chemistry", marks: Number(marks.chemistry), contrib: result.chemContrib, formula: "÷ 2" },
              ].map(({ label, marks: m, contrib, formula }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                    <span className="text-gray-600">{label} <span className="text-gray-400 font-mono text-[11px] sm:text-xs">({m}/100 {formula})</span></span>
                    <span className="font-semibold text-[#0f1e33] font-mono">{contrib.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(contrib / 100) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-semibold text-sm sm:text-base text-[#0f1e33]">{t("calculator.totalCutoff")}</span>
                <span className="font-display text-xl sm:text-2xl text-amber-500">{result.total.toFixed(1)} / 200</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <button onClick={() => { setStep("upload"); setMarks({ maths: "", physics: "", chemistry: "" }); setSaveSuccess(false); }}
              className="border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all text-sm">
              {t("calculator.recalculate")}
            </button>
            <button onClick={handleSaveToProfile} disabled={saving}
              className="flex items-center justify-center gap-2 border border-amber-400 text-amber-600 font-medium py-3 rounded-xl hover:bg-amber-50 transition-all text-sm disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-500 rounded-full animate-spin" /> : null}
              {t("calculator.saveToProfile")}
            </button>
            <Link to="/recommendations" className="bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl text-center text-sm transition-all flex items-center justify-center">
              {t("calculator.viewColleges")}
            </Link>
          </div>
        </div>
      )}

      <PageFlow className="mt-6 rounded-2xl" />
    </div>
  );
}
