import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Phone, ArrowRight, AlertCircle, Shield,
  ChevronLeft, Eye, FlaskConical, CheckCircle, User,
  Calendar, Award, BookOpen, MapPin, Sparkles, Check
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { normalizePhone } from "../lib/studentAccountService";
import { useTranslation } from "react-i18next";
import { districts, branchOptions } from "../data/mockData";

type Step = "phone" | "otp" | "create_account";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", label: "IN +91" },
  { code: "+1",  flag: "🇺🇸", label: "US +1"  },
  { code: "+44", flag: "🇬🇧", label: "UK +44" },
  { code: "+65", flag: "🇸🇬", label: "SG +65" },
];

const CATEGORIES = ["OC", "BC", "BCM", "MBC/DNC", "SC", "SCA", "ST"];

export default function Login() {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [shownOtp, setShownOtp] = useState<string | null>(null);
  const [revealOtp, setRevealOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [existingUserMsg, setExistingUserMsg] = useState("");
  // Flag: set to true after account creation/login — triggers navigation via useEffect
  const [pendingNavToDashboard, setPendingNavToDashboard] = useState(false);

  // New User Profile Form State
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    dob: "",
    category: "OC",
    school: "",
    passingYear: "2026",
    preferredDistrict: "Chennai",
    preferredBranches: ["CS", "EC"],
    budget: 85000,
    maths: "95",
    physics: "90",
    chemistry: "92",
    isGovernmentSchoolQuota: false,
    isFirstGraduate: false,
    specialReservation: "None",
  });

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { sendOtp, verifyOtp, registerNewStudent, profile, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── AUTH-STATE DRIVEN NAVIGATION ──────────────────────────
  // Navigate to Dashboard only AFTER React auth state (profile/user)
  // has been updated — avoids the race condition where ProtectedRoute
  // sees an empty auth state and redirects back to /login.
  useEffect(() => {
    if (pendingNavToDashboard && (profile || user)) {
      console.log("[AUTH] Auth state confirmed — navigating to Dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [pendingNavToDashboard, profile, user, navigate]);

  const fullPhone = normalizePhone(rawPhone, countryCode);

  // Live Cutoff calculation
  const mVal = parseFloat(profileForm.maths) || 0;
  const pVal = parseFloat(profileForm.physics) || 0;
  const cVal = parseFloat(profileForm.chemistry) || 0;
  const calculatedCutoff = Math.min(200, Math.max(0, mVal + (pVal / 2) + (cVal / 2)));

  const startResendTimer = () => {
    setResendTimer(60);
    const id = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rawPhone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const { otp: generated } = sendOtp(rawPhone, countryCode);
    setShownOtp(generated);
    setOtp(["", "", "", "", "", ""]);
    setRevealOtp(false);
    setStep("otp");
    startResendTimer();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every(d => d)) handleVerify(next.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleVerify = async (code?: string) => {
    const token = code ?? otp.join("");
    if (token.length < 6) { setError("Please enter the complete 6-digit code."); return; }
    setError("");
    setLoading(true);

    console.log("[AUTH] Verifying OTP for phone:", rawPhone);
    const res = await verifyOtp(rawPhone, countryCode, token);
    setLoading(false);

    if (res.error) {
      console.log("[AUTH] OTP verification failed:", res.error);
      setError(res.error);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      return;
    }

    if (res.isExistingUser && res.profile) {
      // ── EXISTING USER: auth state already applied by verifyOtp in AuthContext ──
      console.log("[AUTH] Existing user found:", res.profile.display_name, "— triggering dashboard nav");
      setExistingUserMsg(`Welcome back, ${res.profile.display_name}! Restoring your data...`);
      // Auth state (profile/user) was set by applyStudentAccount in AuthContext.verifyOtp.
      // Trigger the auth-state-driven useEffect to navigate.
      setPendingNavToDashboard(true);
    } else {
      // ── NEW USER FLOW ──
      console.log("[AUTH] New user — showing account creation form");
      setStep("create_account");
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    const { otp: generated } = sendOtp(rawPhone, countryCode);
    setShownOtp(generated);
    setOtp(["", "", "", "", "", ""]);
    setRevealOtp(false);
    setError("");
    startResendTimer();
  };

  const toggleBranch = (code: string) => {
    setProfileForm(p => ({
      ...p,
      preferredBranches: p.preferredBranches.includes(code)
        ? p.preferredBranches.filter(b => b !== code)
        : p.preferredBranches.length < 5 ? [...p.preferredBranches, code] : p.preferredBranches,
    }));
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      console.log("[AUTH] Creating new student account for phone:", fullPhone);
      const account = await registerNewStudent(
        fullPhone,
        {
          displayName: profileForm.displayName.trim(),
          dob: profileForm.dob || undefined,
          category: profileForm.category,
          school: profileForm.school || undefined,
          passingYear: profileForm.passingYear,
          preferredDistrict: profileForm.preferredDistrict,
          preferredBranches: profileForm.preferredBranches,
          budget: Number(profileForm.budget) || 60000,
          language: "English",
          isGovernmentSchoolQuota: profileForm.isGovernmentSchoolQuota,
          isFirstGraduate: profileForm.isFirstGraduate,
          specialReservation: profileForm.specialReservation !== "None" ? profileForm.specialReservation : undefined,
        },
        {
          maths: Number(profileForm.maths) || 0,
          physics: Number(profileForm.physics) || 0,
          chemistry: Number(profileForm.chemistry) || 0,
          cutoff: parseFloat(calculatedCutoff.toFixed(2)),
          academicYear: profileForm.passingYear || "2024",
        }
      );
      console.log("[AUTH] Account created, studentId:", account?.profile?.user_id);
      console.log("[AUTH] Auth state updated — waiting for React re-render before navigating");
      // ✅ DO NOT call navigate() here!
      // applyStudentAccount() in AuthContext has already been called (sets profile + user).
      // The useEffect above will fire once React re-renders with the new profile/user state.
      setLoading(false);
      setPendingNavToDashboard(true);
    } catch (err: any) {
      console.log("[AUTH] Account creation failed:", err?.message);
      setLoading(false);
      setError(err?.message || "Failed to create student account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1e33] flex">
      {/* Left decorative brand panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 bg-[#0a1628] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[300, 440, 580, 720].map((s, i) => (
            <div key={i} className="absolute border border-blue-400/10 rounded-full" style={{ width: s, height: s }} />
          ))}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl" />

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <span className="font-display text-xl text-white block leading-none">EduPath</span>
            <span className="text-blue-400/50 text-[10px] tracking-widest uppercase">TNEA Admissions & Counselling</span>
          </div>
        </Link>

        <div className="relative z-10 space-y-6">
          <blockquote className="font-display text-3xl text-white leading-snug">
            "One Phone Number.<br />One Permanent Account.<br />Your Admission Journey."
          </blockquote>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Persistent Student Identity</span>
            </div>
            <p className="text-blue-200/70 text-xs leading-relaxed">
              Your verified mobile number permanently links all your TNEA marks, calculated cutoff, personalized college recommendations, comparison matrices, and AI counsellor transcripts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[{ v: "461", l: "Official Colleges" }, { v: "2024", l: "TNEA Data Year" }, { v: "100%", l: "Free & Private" }, { v: "OTP", l: "Secure Auth" }].map(({ v, l }) => (
              <div key={l} className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="font-display text-xl text-amber-400">{v}</p>
                <p className="text-blue-300/50 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <Shield size={14} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-xs">No password needed. Verified via fast OTP every session.</p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto min-h-screen">
        <div className="w-full max-w-lg my-auto">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-display text-xl text-white">EduPath</span>
          </Link>

          {existingUserMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 mb-6 animate-fadeIn">
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm mb-1">
                <CheckCircle size={16} />
                <span>Existing Student Account Detected</span>
              </div>
              <p className="text-emerald-300/90 text-xs">{existingUserMsg}</p>
            </div>
          )}

          {/* ──────────────────────────────────────────────
              STEP 1: ENTER MOBILE NUMBER
              ────────────────────────────────────────────── */}
          {step === "phone" && (
            <>
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1.5 mb-4">
                  <Phone size={12} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-medium">Student Mobile Authentication</span>
                </div>
                <h2 className="font-display text-3xl text-white mb-2">{t("login.phoneStep")}</h2>
                <p className="text-blue-300/60 text-sm">
                  Enter your mobile number to sign in or create your persistent student account.
                </p>
              </div>

              {/* Development Mode Notice */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl p-4 mb-6">
                <FlaskConical size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-blue-300">Instant OTP Verification Mode:</p>
                  <p className="text-blue-300/80 leading-relaxed">
                    OTP will be displayed on your screen. Any 10-digit mobile number can be entered. Test numbers like <code className="bg-blue-900/50 px-1 py-0.5 rounded text-amber-300 font-mono">9876543210</code> are supported.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-blue-300/80 text-sm font-medium mb-2">{t("login.phoneLabel")}</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-3 text-sm outline-none focus:border-amber-500/60 transition-all shrink-0"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0f1e33]">{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={rawPhone}
                      onChange={e => setRawPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                      placeholder="98765 43210"
                      maxLength={12}
                      required
                      autoFocus
                      className="flex-1 bg-white/5 border border-white/10 text-white placeholder-blue-400/40 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500/60 focus:bg-white/8 transition-all tracking-widest font-mono"
                    />
                  </div>
                  <p className="text-blue-400/40 text-xs mt-2">10-digit number without 0 or +91</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-amber-500/20"
                >
                  <span>{t("login.sendOtp")}</span> <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-xs text-blue-300/50">
                  By continuing, you agree to EduPath's TNEA Counselling Guidance Terms & Privacy Policy.
                </p>
              </div>
            </>
          )}

          {/* ──────────────────────────────────────────────
              STEP 2: OTP VERIFICATION
              ────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <button
                onClick={() => { setStep("phone"); setError(""); setShownOtp(null); }}
                className="flex items-center gap-1.5 text-blue-300/60 hover:text-blue-200 text-sm mb-7 transition-colors"
              >
                <ChevronLeft size={15} /> Change number
              </button>

              <div className="mb-7">
                <div className="w-14 h-14 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-4">
                  <Phone size={24} className="text-amber-400" />
                </div>
                <h2 className="font-display text-3xl text-white mb-2">{t("login.otpStep")}</h2>
                <p className="text-blue-300/60 text-sm">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="text-amber-300 font-mono font-semibold">{fullPhone}</span>
                </p>
              </div>

              {/* Demo OTP Display Banner */}
              {shownOtp && (
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={14} className="text-blue-400" />
                      <span className="text-blue-300 text-xs font-semibold uppercase tracking-wide">Development OTP</span>
                    </div>
                    <button
                      onClick={() => setRevealOtp(r => !r)}
                      className="flex items-center gap-1.5 text-blue-300/70 hover:text-blue-200 text-xs font-medium transition-colors"
                    >
                      <Eye size={13} /> {revealOtp ? t("login.hide") : t("login.reveal")}
                    </button>
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <span
                      className={`font-mono text-3xl font-bold tracking-[0.25em] transition-all ${
                        revealOtp ? "text-amber-400" : "text-transparent select-none"
                      } bg-white/5 rounded-xl px-6 py-2 border border-white/10`}
                      style={{ filter: revealOtp ? "none" : "blur(8px)" }}
                    >
                      {shownOtp}
                    </span>
                  </div>
                  <p className="text-blue-400/50 text-[11px] text-center mt-2">
                    Click "Reveal" to view code or click any digit box to auto-fill.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* OTP Boxes - Clean Mobile Responsive */}
              <div className="flex gap-1.5 sm:gap-2.5 mb-6 justify-between max-w-[340px] mx-auto w-full">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    autoFocus={i === 0}
                    className={`flex-1 min-w-[38px] max-w-[48px] h-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition-all outline-none
                      ${digit
                        ? "bg-amber-500/15 border-amber-500/60 text-amber-300"
                        : "bg-white/5 border-white/10 text-white focus:border-amber-500/60 focus:bg-white/8"
                      }`}
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 mb-4 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span> <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-center text-blue-300/60 text-sm">
                Didn't get the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-blue-400">Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={handleResend} className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
                    Resend OTP
                  </button>
                )}
              </p>
            </>
          )}

          {/* ──────────────────────────────────────────────
              STEP 3: NEW USER — CREATE YOUR NEW ACCOUNT
              ────────────────────────────────────────────── */}
          {step === "create_account" && (
            <div className="py-2">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-3">
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-semibold">Mobile Verified: {fullPhone}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-1">Create Your New Account</h2>
                <p className="text-blue-300/60 text-xs sm:text-sm">
                  Complete your student profile once. All your data will be permanently saved to your mobile number.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreateAccountSubmit} className="space-y-4 text-xs sm:text-sm">
                {/* 1. Basic Details */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} />
                    <span>Personal Information</span>
                  </h3>

                  <div>
                    <label className="block text-blue-200/80 mb-1 font-medium">Full Name (as per 12th Marksheet) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senthil Kumar R"
                      value={profileForm.displayName}
                      onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                      className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">Date of Birth</label>
                      <input
                        type="date"
                        value={profileForm.dob}
                        onChange={e => setProfileForm(f => ({ ...f, dob: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">Community / Category *</label>
                      <select
                        value={profileForm.category}
                        onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">School / Board</label>
                      <input
                        type="text"
                        placeholder="State Board / CBSE"
                        value={profileForm.school}
                        onChange={e => setProfileForm(f => ({ ...f, school: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">Passing Year</label>
                      <select
                        value={profileForm.passingYear}
                        onChange={e => setProfileForm(f => ({ ...f, passingYear: e.target.value }))}
                        className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      >
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2025">2025 (Appearing)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Academic Marks & Cutoff */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={13} />
                      <span>Class 12 Academic Marks</span>
                    </h3>
                    <div className="bg-amber-500/20 text-amber-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-500/30">
                      TNEA Cutoff: {calculatedCutoff.toFixed(2)} / 200
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-blue-200/70 text-xs mb-1">Maths (/100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={profileForm.maths}
                        onChange={e => setProfileForm(f => ({ ...f, maths: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3 py-2 font-mono text-center outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200/70 text-xs mb-1">Physics (/100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={profileForm.physics}
                        onChange={e => setProfileForm(f => ({ ...f, physics: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3 py-2 font-mono text-center outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200/70 text-xs mb-1">Chemistry (/100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={profileForm.chemistry}
                        onChange={e => setProfileForm(f => ({ ...f, chemistry: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-3 py-2 font-mono text-center outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Counselling Preferences */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} />
                    <span>Counselling Preferences</span>
                  </h3>

                  <div>
                    <label className="block text-blue-200/80 mb-1 font-medium">Preferred District / Location</label>
                    <select
                      value={profileForm.preferredDistrict}
                      onChange={e => setProfileForm(f => ({ ...f, preferredDistrict: e.target.value }))}
                      className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                    >
                      {districts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-200/80 mb-1.5 font-medium">Preferred Engineering Branches (Pick up to 5)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {branchOptions.map(b => {
                        const isSelected = profileForm.preferredBranches.includes(b.code);
                        return (
                          <button
                            type="button"
                            key={b.code}
                            onClick={() => toggleBranch(b.code)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                              isSelected
                                ? "bg-amber-500 border-amber-400 text-white"
                                : "bg-white/5 border-white/10 text-blue-200/70 hover:border-amber-400/50"
                            }`}
                          >
                            {b.code} · {b.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">Annual College Budget</label>
                      <select
                        value={profileForm.budget}
                        onChange={e => setProfileForm(f => ({ ...f, budget: Number(e.target.value) }))}
                        className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      >
                        <option value="25000">₹25,000 (Govt College Fees)</option>
                        <option value="50000">₹50,000 (Govt / Aided)</option>
                        <option value="85000">₹85,000 (Autonomous Private)</option>
                        <option value="150000">₹1,50,000+ (Flexible)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-blue-200/80 mb-1 font-medium">Special Reservation</label>
                      <select
                        value={profileForm.specialReservation}
                        onChange={e => setProfileForm(f => ({ ...f, specialReservation: e.target.value }))}
                        className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                      >
                        <option value="None">None (General)</option>
                        <option value="Eminent Sports">Eminent Sports Person</option>
                        <option value="Ex-Servicemen">Ex-Servicemen Ward</option>
                        <option value="Differently Abled">Differently Abled (PwD)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quota Checkboxes */}
                  <div className="pt-2 space-y-2 border-t border-white/10">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-200/80">
                      <input
                        type="checkbox"
                        checked={profileForm.isGovernmentSchoolQuota}
                        onChange={e => setProfileForm(f => ({ ...f, isGovernmentSchoolQuota: e.target.checked }))}
                        className="w-4 h-4 rounded text-amber-500 bg-white/5 border-white/20 focus:ring-0"
                      />
                      <span>Studied 6th to 12th in Tamil Nadu Government School (Eligible for 7.5% Quota)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-200/80">
                      <input
                        type="checkbox"
                        checked={profileForm.isFirstGraduate}
                        onChange={e => setProfileForm(f => ({ ...f, isFirstGraduate: e.target.checked }))}
                        className="w-4 h-4 rounded text-amber-500 bg-white/5 border-white/20 focus:ring-0"
                      />
                      <span>First Generation Graduate Certificate holder</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/25"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Permanent Student Account</span> <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
