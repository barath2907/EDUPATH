import { useState, useEffect } from "react";
import { User, MapPin, GraduationCap, Edit3, Save, CheckCircle, Phone, Award, Shield, Sparkles } from "lucide-react";
import PageFlow from "../components/PageFlow";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { setLanguage, type LangCode } from "../i18n";
import { districts, branchOptions, categories } from "../data/mockData";

export default function Profile() {
  const { user, profile, academicRecord, saveAcademic, updateLocalProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    dob: "",
    school: "",
    passing_year: "2024",
    category: "OC",
    preferred_district: "Chennai",
    preferred_branches: [] as string[],
    budget: "60000",
    language: "English",
    is_government_school_quota: false,
    is_first_graduate: false,
    special_reservation: "None",
    maths: "95",
    physics: "90",
    chemistry: "92",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        dob: profile.dob ?? "",
        school: profile.school ?? "",
        passing_year: profile.passing_year ?? "2024",
        category: profile.category ?? "OC",
        preferred_district: profile.preferred_district ?? "Chennai",
        preferred_branches: profile.preferred_branches ?? [],
        budget: String(profile.budget ?? 60000),
        language: profile.language ?? "English",
        is_government_school_quota: !!profile.is_government_school_quota,
        is_first_graduate: !!profile.is_first_graduate,
        special_reservation: profile.special_reservation ?? "None",
        maths: academicRecord ? String(academicRecord.maths) : "95",
        physics: academicRecord ? String(academicRecord.physics) : "90",
        chemistry: academicRecord ? String(academicRecord.chemistry) : "92",
      });
    }
  }, [profile, academicRecord]);

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleBranch = (code: string) => {
    setForm(f => ({
      ...f,
      preferred_branches: f.preferred_branches.includes(code)
        ? f.preferred_branches.filter(b => b !== code)
        : [...f.preferred_branches, code],
    }));
  };

  const mVal = parseFloat(form.maths) || 0;
  const pVal = parseFloat(form.physics) || 0;
  const cVal = parseFloat(form.chemistry) || 0;
  const currentCutoff = Math.min(200, Math.max(0, mVal + (pVal / 2) + (cVal / 2)));

  const handleSave = async () => {
    setLoading(true);
    const patch = {
      display_name: form.display_name,
      dob: form.dob || null,
      school: form.school,
      passing_year: form.passing_year,
      category: form.category,
      preferred_district: form.preferred_district,
      preferred_branches: form.preferred_branches,
      budget: Number(form.budget),
      language: form.language,
      is_government_school_quota: form.is_government_school_quota,
      is_first_graduate: form.is_first_graduate,
      special_reservation: form.special_reservation !== "None" ? form.special_reservation : null,
      profile_complete: true,
    };

    await updateLocalProfile(patch);

    if (form.maths && form.physics && form.chemistry) {
      await saveAcademic({
        maths: mVal,
        physics: pVal,
        chemistry: cVal,
        cutoff: parseFloat(currentCutoff.toFixed(2)),
        category: form.category,
        academic_year: form.passing_year || "2024",
        source: "profile_update",
        confirmed: true,
      });
    }

    setLoading(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const displayName = form.display_name || "Student";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const completedFields = [form.display_name, form.school, form.category, profile?.phone, form.dob].filter(Boolean).length;
  const progress = Math.round((completedFields / 5) * 100);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#0f1e33] mb-1">{t("profile.title")}</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Permanent Student Record linked to your verified mobile number.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {saved && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-800 font-medium">
              <CheckCircle size={14} className="text-emerald-600" />
              <span>Saved permanently!</span>
            </div>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-[#0f1e33] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Edit3 size={14} /> Edit Profile
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Avatar + Verified Mobile Badge Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 shadow-sm">
        <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-[#0f1e33] flex items-center justify-center shrink-0">
          <span className="font-display text-2xl sm:text-3xl text-amber-400">{initials || "?"}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg sm:text-xl text-[#0f1e33] truncate">{form.display_name || "Student Aspirant"}</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
              <Shield size={11} className="text-emerald-600" />
              Verified Phone Account
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm flex-wrap">
            <Phone size={13} className="text-amber-500 shrink-0" />
            <span className="font-mono font-bold text-slate-800">{profile?.phone ?? "—"}</span>
            <span className="text-gray-400">•</span>
            <span>Category: <strong className="text-slate-800">{form.category}</strong></span>
            {form.dob && (
              <>
                <span className="text-gray-400">•</span>
                <span>DOB: <strong className="text-slate-800">{form.dob}</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-56">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-gray-400 text-xs">{progress}% Profile Completed</span>
          </div>
        </div>
      </div>

      {/* Academic Cutoff & Marks Card */}
      <div className="bg-[#0f1e33] rounded-2xl p-5 sm:p-6 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <h3 className="font-semibold text-base">Class 12 Academic Marks & TNEA Cutoff</h3>
          </div>
          <div className="bg-amber-500/20 text-amber-300 font-mono font-bold text-sm px-3 py-1 rounded-xl border border-amber-500/30">
            Cutoff: {currentCutoff.toFixed(2)} / 200
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-blue-200/70 text-xs mb-1 font-medium">Mathematics (/100)</label>
            {editing ? (
              <input
                type="number"
                min="0"
                max="100"
                value={form.maths}
                onChange={e => update("maths", e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-mono text-center outline-none focus:border-amber-400"
              />
            ) : (
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="font-semibold font-mono text-xl">{form.maths}<span className="text-blue-400 text-xs">/100</span></p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-blue-200/70 text-xs mb-1 font-medium">Physics (/100)</label>
            {editing ? (
              <input
                type="number"
                min="0"
                max="100"
                value={form.physics}
                onChange={e => update("physics", e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-mono text-center outline-none focus:border-amber-400"
              />
            ) : (
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="font-semibold font-mono text-xl">{form.physics}<span className="text-blue-400 text-xs">/100</span></p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-blue-200/70 text-xs mb-1 font-medium">Chemistry (/100)</label>
            {editing ? (
              <input
                type="number"
                min="0"
                max="100"
                value={form.chemistry}
                onChange={e => update("chemistry", e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-mono text-center outline-none focus:border-amber-400"
              />
            ) : (
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="font-semibold font-mono text-xl">{form.chemistry}<span className="text-blue-400 text-xs">/100</span></p>
              </div>
            )}
          </div>
        </div>

        <p className="text-blue-300/60 text-xs italic">
          TNEA Cutoff Formula = Maths + (Physics / 2) + (Chemistry / 2). Saved automatically to your persistent student account.
        </p>
      </div>

      {/* Personal & School Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User size={16} className="text-amber-500" />
          <h3 className="font-semibold text-base text-[#0f1e33]">Personal & School Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Full Name</label>
            {editing ? (
              <input
                type="text"
                value={form.display_name}
                onChange={e => update("display_name", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              />
            ) : (
              <p className="text-slate-800 text-sm font-semibold">{form.display_name || "—"}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Date of Birth</label>
            {editing ? (
              <input
                type="date"
                value={form.dob}
                onChange={e => update("dob", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              />
            ) : (
              <p className="text-slate-800 text-sm font-medium">{form.dob || "—"}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">School / Board</label>
            {editing ? (
              <input
                type="text"
                value={form.school}
                onChange={e => update("school", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              />
            ) : (
              <p className="text-slate-800 text-sm font-medium">{form.school || "—"}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Passing Year</label>
            {editing ? (
              <select
                value={form.passing_year}
                onChange={e => update("passing_year", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2025">2025</option>
              </select>
            ) : (
              <p className="text-slate-800 text-sm font-medium">{form.passing_year}</p>
            )}
          </div>
        </div>
      </div>

      {/* Preferences & Quotas */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap size={16} className="text-amber-500" />
          <h3 className="font-semibold text-base text-[#0f1e33]">Counselling Preferences & Quotas</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Community Category</label>
            {editing ? (
              <select
                value={form.category}
                onChange={e => update("category", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <p className="text-slate-800 text-sm font-semibold">{form.category}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Preferred District</label>
            {editing ? (
              <select
                value={form.preferred_district}
                onChange={e => update("preferred_district", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              >
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <p className="text-slate-800 text-sm font-semibold">{form.preferred_district}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Annual Budget</label>
            {editing ? (
              <input
                type="number"
                value={form.budget}
                onChange={e => update("budget", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              />
            ) : (
              <p className="text-slate-800 text-sm font-semibold">₹{Number(form.budget).toLocaleString("en-IN")} / year</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1">Special Reservation</label>
            {editing ? (
              <select
                value={form.special_reservation}
                onChange={e => update("special_reservation", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-amber-500"
              >
                <option value="None">None (General)</option>
                <option value="Eminet Sports">Eminent Sports Person</option>
                <option value="Ex-Servicemen">Ex-Servicemen Ward</option>
                <option value="Differently Abled">Differently Abled (PwD)</option>
              </select>
            ) : (
              <p className="text-slate-800 text-sm font-semibold">{form.special_reservation}</p>
            )}
          </div>
        </div>

        {/* Quota Checkboxes */}
        <div className="pt-2 space-y-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="govtSchool"
              disabled={!editing}
              checked={form.is_government_school_quota}
              onChange={e => update("is_government_school_quota", e.target.checked)}
              className="w-4 h-4 rounded text-amber-500"
            />
            <label htmlFor="govtSchool" className="text-xs text-gray-700 font-medium cursor-pointer">
              7.5% TN Government School Student Reservation Quota
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="firstGrad"
              disabled={!editing}
              checked={form.is_first_graduate}
              onChange={e => update("is_first_graduate", e.target.checked)}
              className="w-4 h-4 rounded text-amber-500"
            />
            <label htmlFor="firstGrad" className="text-xs text-gray-700 font-medium cursor-pointer">
              First Generation Graduate Student Certificate
            </label>
          </div>
        </div>

        {/* Preferred Branches */}
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-2">Preferred Branches</label>
          <div className="flex flex-wrap gap-1.5">
            {branchOptions.map(b => {
              const selected = form.preferred_branches.includes(b.code);
              return editing ? (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => toggleBranch(b.code)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-all ${
                    selected ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 text-gray-600 hover:border-amber-300"
                  }`}
                >
                  {b.name}
                </button>
              ) : selected ? (
                <span key={b.code} className="bg-amber-50 text-amber-800 text-xs px-2.5 py-1 rounded-xl font-medium border border-amber-200">
                  {b.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>

      <PageFlow className="mt-6 rounded-2xl" />
    </div>
  );
}
