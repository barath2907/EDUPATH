import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Phone, ArrowRight, AlertCircle, Shield,
  ChevronLeft, Eye, FlaskConical, CheckCircle, User,
  Award, BookOpen, Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { normalizePhone } from "../lib/studentAccountService";
import { districts, branchOptions } from "../data/mockData";

type Step = "phone" | "otp" | "profile";

const COUNTRY_CODES = [
  { code: "+91", label: "IN +91" },
  { code: "+1",  label: "US +1"  },
  { code: "+44", label: "UK +44" },
];

const CATEGORIES = ["OC", "BC", "BCM", "MBC/DNC", "SC", "SCA", "ST"];

export default function Register() {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [shownOtp, setShownOtp] = useState<string | null>(null);
  const [revealOtp, setRevealOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [existingUserNotice, setExistingUserNotice] = useState("");

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    dob: "",
    category: "OC",
    school: "",
    passingYear: "2024",
    preferredDistrict: "Chennai",
    preferredBranches: ["CS", "EC"],
    budget: 65000,
    maths: "95",
    physics: "90",
    chemistry: "92",
    isGovernmentSchoolQuota: false,
    isFirstGraduate: false,
    specialReservation: "None",
  });

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { sendOtp, verifyOtp, registerNewStudent } = useAuth();
  const navigate = useNavigate();

  const fullPhone = normalizePhone(rawPhone, countryCode);

  const mVal = parseFloat(profileForm.maths) || 0;
  const pVal = parseFloat(profileForm.physics) || 0;
  const cVal = parseFloat(profileForm.chemistry) || 0;
  const calculatedCutoff = Math.min(200, Math.max(0, mVal + (pVal / 2) + (cVal / 2)));

  const startTimer = () => {
    setResendTimer(60);
    const id = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(id); return 0; } return t - 1; }), 1000);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rawPhone.replace(/\D/g, "").length < 10) { setError("Enter a valid 10-digit number."); return; }
    const { otp: generated } = sendOtp(rawPhone, countryCode);
    setShownOtp(generated);
    setOtp(["", "", "", "", "", ""]);
    setRevealOtp(false);
    setStep("otp");
    startTimer();
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
    if (token.length < 6) { setError("Enter the complete 6-digit code."); return; }
    setError("");
    setLoading(true);

    const res = await verifyOtp(rawPhone, countryCode, token);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      return;
    }

    if (res.isExistingUser && res.profile) {
      // Phone already registered -> log in directly without duplicate registration
      setExistingUserNotice(`Existing student account verified for ${fullPhone}! Welcome back, ${res.profile.display_name}. Loading your previous data...`);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } else {
      // New phone number -> proceed to profile creation
      setStep("profile");
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    const { otp: generated } = sendOtp(rawPhone, countryCode);
    setShownOtp(generated);
    setOtp(["", "", "", "", "", ""]);
    setRevealOtp(false);
    setError("");
    startTimer();
  };

  const toggleBranch = (code: string) => {
    setProfileForm(p => ({
      ...p,
      preferredBranches: p.preferredBranches.includes(code)
        ? p.preferredBranches.filter(b => b !== code)
        : p.preferredBranches.length < 5 ? [...p.preferredBranches, code] : p.preferredBranches,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.displayName.trim()) { setError("Please enter your name."); return; }
    setError("");
    setLoading(true);

    try {
      await registerNewStudent(
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

      setLoading(false);
      navigate("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to create account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1e33] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-12 bg-[#0a1628] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[300, 440, 580].map((s, i) => (
            <div key={i} className="absolute border border-blue-400/10 rounded-full" style={{ width: s, height: s }} />
          ))}
        </div>
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <span className="font-display text-xl text-white block leading-none">EduPath</span>
            <span className="text-blue-400/50 text-[10px] tracking-widest uppercase">TNEA Counselling</span>
          </div>
        </Link>
        <div className="relative z-10 space-y-4">
          <h2 className="font-display text-3xl text-white">Start your TNEA journey</h2>
          <p className="text-blue-300/50 text-sm leading-relaxed">
            One mobile number = One persistent student account. Your cutoff, bookmarks, recommendations, and AI counsellor chat are permanently preserved.
          </p>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <Shield size={14} className="text-emerald-400" />
            <p className="text-emerald-300 text-sm">No password required. Secured via phone OTP.</p>
          </div>
        </div>
        <p className="text-blue-400/40 text-xs relative z-10">© 2026 EduPath TNEA Intelligence</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto min-h-screen">
        <div className="w-full max-w-lg my-auto py-6 sm:py-0">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-display text-xl text-white">EduPath</span>
          </Link>

          {existingUserNotice && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                <CheckCircle size={16} />
                <span>Existing Student Account Found</span>
              </div>
              <p className="text-emerald-300/90 text-xs">{existingUserNotice}</p>
            </div>
          )}

          {step === "phone" && (
            <>
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1.5 mb-4">
                  <Phone size={12} className="text-amber-400" />
                  <span className="text-amber-300 text-xs font-medium">Step 1 of 2</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-2">Get Started</h2>
                <p className="text-blue-300/60 text-xs sm:text-sm">Enter your mobile number to begin your TNEA admission journey.</p>
              </div>

              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl p-3.5 sm:p-4 mb-6">
                <FlaskConical size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  <span className="font-semibold text-blue-300">OTP Verification:</span> The OTP code will appear on screen for easy verification.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-blue-300/80 text-sm font-medium mb-2">Mobile Number</label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="bg-white/5 border border-white/10 text-white rounded-xl px-2.5 sm:px-3 py-3 text-xs sm:text-sm outline-none shrink-0"
                    >
                      {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="bg-[#0f1e33]">{c.label}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={rawPhone}
                      onChange={e => setRawPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                      placeholder="98765 43210"
                      maxLength={12}
                      required
                      autoFocus
                      className="flex-1 bg-white/5 border border-white/10 text-white placeholder-blue-400/40 rounded-xl px-3.5 sm:px-4 py-3 text-sm outline-none focus:border-amber-500/60 transition-all tracking-wider sm:tracking-widest font-mono min-w-0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Send Verification Code</span> <ArrowRight size={16} />
                </button>
              </form>

              <p className="mt-6 text-center text-blue-300/60 text-sm">
                Already registered?{" "}
                <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                onClick={() => { setStep("phone"); setError(""); setShownOtp(null); }}
                className="flex items-center gap-1.5 text-blue-300/60 hover:text-blue-200 text-sm mb-6 transition-colors"
              >
                <ChevronLeft size={15} /> Change number
              </button>

              <div className="mb-6">
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-2">Enter Verification Code</h2>
                <p className="text-blue-300/60 text-xs sm:text-sm">
                  We sent a code to <span className="text-amber-300 font-mono font-semibold">{fullPhone}</span>
                </p>
              </div>

              {shownOtp && (
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300 text-xs font-semibold uppercase">Development OTP</span>
                    <button
                      onClick={() => setRevealOtp(r => !r)}
                      className="flex items-center gap-1 text-blue-300/70 hover:text-blue-200 text-xs font-medium"
                    >
                      <Eye size={12} /> {revealOtp ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  <div className="flex justify-center py-2">
                    <span
                      className={`font-mono text-2xl sm:text-3xl font-bold tracking-[0.2em] sm:tracking-[0.25em] ${revealOtp ? "text-amber-400" : "text-transparent select-none"} bg-white/5 rounded-xl px-4 sm:px-6 py-2 border border-white/10`}
                      style={{ filter: revealOtp ? "none" : "blur(8px)" }}
                    >
                      {shownOtp}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

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
                      ${digit ? "bg-amber-500/15 border-amber-500/60 text-amber-300" : "bg-white/5 border-white/10 text-white focus:border-amber-500/60"}`}
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all mb-4 shadow-lg shadow-amber-500/20"
              >
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Verify & Continue</span>}
              </button>

              <p className="text-center text-blue-300/60 text-sm">
                Didn't get the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-blue-400">Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={handleResend} className="text-amber-400 hover:text-amber-300 font-medium">Resend OTP</button>
                )}
              </p>
            </>
          )}

          {step === "profile" && (
            <div className="py-2">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-3">
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span className="text-emerald-300 text-xs font-semibold">Mobile Verified: {fullPhone}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-1">Create Your New Account</h2>
                <p className="text-blue-300/60 text-xs sm:text-sm">
                  Complete your student profile to initialize your persistent TNEA counselling account.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} />
                    <span>Personal Details</span>
                  </h3>

                  <div>
                    <label className="block text-blue-200/80 mb-1 font-medium">Full Name (as per 12th Marksheet) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Dharmarajan"
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
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                        <option value="2025">2025</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Academic Marks & Cutoff */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={13} />
                      <span>Class 12 Academic Marks</span>
                    </h3>
                    <div className="self-start sm:self-auto bg-amber-500/20 text-amber-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-500/30">
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

                {/* Preferences */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} />
                    <span>Preferences & Quota</span>
                  </h3>

                  <div>
                    <label className="block text-blue-200/80 mb-1 font-medium">Preferred District</label>
                    <select
                      value={profileForm.preferredDistrict}
                      onChange={e => setProfileForm(f => ({ ...f, preferredDistrict: e.target.value }))}
                      className="w-full bg-[#0a1628] border border-white/15 text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                    >
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-200/80 mb-1.5 font-medium">Preferred Branches (Pick up to 5)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {branchOptions.map(b => {
                        const isSelected = profileForm.preferredBranches.includes(b.code);
                        return (
                          <button
                            type="button"
                            key={b.code}
                            onClick={() => toggleBranch(b.code)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                              isSelected ? "bg-amber-500 border-amber-400 text-white" : "bg-white/5 border-white/10 text-blue-200/70"
                            }`}
                          >
                            {b.code} · {b.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 space-y-2 border-t border-white/10">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-200/80">
                      <input
                        type="checkbox"
                        checked={profileForm.isGovernmentSchoolQuota}
                        onChange={e => setProfileForm(f => ({ ...f, isGovernmentSchoolQuota: e.target.checked }))}
                        className="w-4 h-4 rounded text-amber-500 bg-white/5 border-white/20 focus:ring-0"
                      />
                      <span>7.5% TN Government School Student Reservation Quota</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-blue-200/80">
                      <input
                        type="checkbox"
                        checked={profileForm.isFirstGraduate}
                        onChange={e => setProfileForm(f => ({ ...f, isFirstGraduate: e.target.checked }))}
                        className="w-4 h-4 rounded text-amber-500 bg-white/5 border-white/20 focus:ring-0"
                      />
                      <span>First Generation Graduate Student</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
                >
                  {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Create Account & Start Counselling</span>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
