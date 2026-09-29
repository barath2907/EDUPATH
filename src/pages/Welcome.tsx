import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, BarChart2, Brain, FileText, Shield } from "lucide-react";

const features = [
  {
    icon: BarChart2,
    title: "AI Cutoff Prediction",
    desc: "Upload your marksheet and get your TNEA cutoff calculated instantly with transparent breakdown.",
  },
  {
    icon: Brain,
    title: "Smart Recommendations",
    desc: "Personalized college and branch suggestions based on your marks, location, and preferences.",
  },
  {
    icon: FileText,
    title: "AI Counsellor",
    desc: "Ask anything about TNEA admissions. Get answers grounded in official documents and real data.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "Your data stays private. Row-level security ensures only you can access your information.",
  },
];

const stats = [
  { value: "500+", label: "Colleges covered" },
  { value: "2024", label: "TNEA data year" },
  { value: "10k+", label: "Students helped" },
  { value: "98%", label: "Accuracy rate" },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[#0f1e33] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-amber-500 flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg sm:text-xl text-white">EduPath</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="text-blue-300 hover:text-white text-xs sm:text-sm font-medium transition-colors px-2.5 sm:px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-amber-500 hover:bg-amber-400 text-white text-xs sm:text-sm font-semibold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 pb-12 sm:pb-20 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-3.5 sm:px-4 py-1.5 mb-5 sm:mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-[11px] sm:text-xs font-semibold tracking-wide uppercase">TNEA 2024 Data Ready</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl leading-tight mb-4 sm:mb-6">
            Your path to the
            <span className="text-amber-400"> right college</span>
            <br />starts here.
          </h1>
          <p className="text-blue-200/70 text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl">
            EduPath uses AI and verified TNEA data to help Tamil Nadu students find their best-fit engineering college —
            with transparent cutoff predictions, personalized recommendations, and an AI counsellor.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 text-center"
            >
              Start for free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white hover:bg-white/10 font-medium px-6 py-3.5 rounded-xl transition-all duration-200 text-center"
            >
              Sign in to your account
            </Link>
          </div>
        </div>

        {/* Hero card */}
        <div className="relative mt-2 lg:mt-0">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-300 text-xs sm:text-sm font-medium">Your Cutoff Score</span>
              <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">Calculated</span>
            </div>
            <div className="text-4xl sm:text-5xl font-display text-white mb-1">192.5</div>
            <p className="text-blue-400 text-xs sm:text-sm mb-4 sm:mb-5">Out of 200 · OC Category · 2024</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
              {[{ s: "Maths", v: 96, m: 100 }, { s: "Physics", v: 50, m: 50 }, { s: "Chemistry", v: 46.5, m: 50 }].map(({ s, v, m }) => (
                <div key={s} className="bg-white/5 rounded-xl p-2.5 sm:p-3 text-center sm:text-left">
                  <p className="text-blue-300/70 text-[10px] mb-1 uppercase tracking-wide truncate">{s}</p>
                  <p className="text-white font-semibold font-mono text-sm sm:text-base">{v}<span className="text-blue-400 text-[10px] sm:text-xs">/{m}</span></p>
                </div>
              ))}
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
              <p className="text-amber-300 text-xs sm:text-sm">
                🎯 Eligible for <span className="font-semibold">23 colleges</span> in your preferred list
              </p>
            </div>
          </div>

          {/* Floating badge */}
          <div className="hidden sm:block absolute -bottom-4 -right-4 bg-[#162c4a] border border-white/10 rounded-xl px-4 py-3 shadow-xl">
            <p className="text-green-400 text-sm font-semibold">✓ Anna University, Chennai</p>
            <p className="text-blue-300/60 text-xs">CS Engineering · Cutoff 198.5</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-3xl text-amber-400 mb-1">{value}</p>
              <p className="text-blue-300/60 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl text-center mb-12">
          Everything you need for TNEA counselling
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
                <Icon size={20} className="text-amber-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-blue-300/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center">
        <p className="text-blue-400/40 text-sm">
          © 2024 EduPath · Not affiliated with TNEA or DTE Tamil Nadu · Data for guidance only
        </p>
      </footer>
    </div>
  );
}
