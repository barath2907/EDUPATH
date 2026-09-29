import { useEffect, useState } from "react";
import { GraduationCap, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // ms before fade-out starts
}

const FEATURES = [
  "AI-Powered College Counselling",
  "TNEA Cutoff Analysis",
  "Personalised Recommendations",
];

export default function SplashScreen({ onComplete, duration = 2800 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    // Hold → start fade-out
    const holdTimer = setTimeout(() => setPhase("out"), duration);
    // Unmount after fade-out finishes (500ms)
    const doneTimer = setTimeout(() => onComplete(), duration + 500);
    return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
  }, [duration, onComplete]);

  return (
    <div
      onClick={onComplete}
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer
        ${phase === "out" ? "splash-fade-out" : "splash-fade-in"}`}
      style={{ background: "linear-gradient(135deg, #08111e 0%, #0f1e33 50%, #162c4a 100%)" }}
    >
      {/* Skip Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="absolute top-6 right-6 z-10 text-xs text-blue-300/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-full transition-all"
      >
        Skip →
      </button>
      {/* ── Animated grid bg ── */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#7fa0c9 1px, transparent 1px),
            linear-gradient(90deg, #7fa0c9 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Radial glow behind logo ── */}
      <div
        className="absolute"
        style={{
          width: 480, height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Orbital rings ── */}
      {[
        { size: 200, cls: "splash-ring-1", border: "rgba(245,158,11,0.15)" },
        { size: 300, cls: "splash-ring-2", border: "rgba(127,160,201,0.10)" },
        { size: 400, cls: "splash-ring-3", border: "rgba(245,158,11,0.07)" },
      ].map(({ size, cls, border }) => (
        <div
          key={size}
          className={`absolute rounded-full ${cls}`}
          style={{ width: size, height: size, border: `1px solid ${border}` }}
        />
      ))}

      {/* ── Orbiting dots ── */}
      <div className="absolute" style={{ width: 0, height: 0 }}>
        <div className="splash-orbit-dot-1 absolute" style={{ top: 0, left: 0 }}>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]" />
        </div>
        <div className="splash-orbit-dot-2 absolute" style={{ top: 0, left: 0 }}>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70 shadow-[0_0_6px_2px_rgba(96,165,250,0.5)]" />
        </div>
        <div className="splash-orbit-dot-3 absolute" style={{ top: 0, left: 0 }}>
          <div className="w-2 h-2 rounded-full bg-amber-300/50 shadow-[0_0_6px_2px_rgba(252,211,77,0.4)]" />
        </div>
      </div>

      {/* ── Corner sparkles ── */}
      {[
        { top: "18%", left: "14%",  delay: "0.9s",  size: 14 },
        { top: "22%", right: "12%", delay: "1.3s",  size: 10 },
        { top: "72%", left: "10%",  delay: "1.6s",  size: 12 },
        { top: "76%", right: "15%", delay: "1.1s",  size: 10 },
      ].map((pos, i) => (
        <Sparkles
          key={i}
          size={pos.size}
          className="absolute text-amber-400/30"
          style={{ ...pos, animation: `splash-text-slide 0.6s ease ${pos.delay} both` }}
        />
      ))}

      {/* ── Main content ── */}
      <div className="relative flex flex-col items-center gap-5 px-8 text-center">

        {/* Logo badge */}
        <div className="splash-badge-pop relative">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              boxShadow: "0 0 0 8px rgba(245,158,11,0.12), 0 0 40px 8px rgba(245,158,11,0.2)",
            }}
          />
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              boxShadow: "0 8px 32px rgba(245,158,11,0.45)",
            }}
          >
            <GraduationCap size={48} className="text-white drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand name */}
        <div className="splash-logo-rise flex flex-col items-center gap-1">
          <h1
            className="splash-shimmer-text font-display text-6xl tracking-tight"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            EduPath
          </h1>
          <p
            className="text-blue-300/60 text-xs tracking-[0.25em] uppercase font-medium"
            style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
          >
            TNEA Counselling Platform
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col items-center gap-1.5 mt-1">
          {FEATURES.map((f, i) => (
            <p
              key={f}
              className={`text-blue-200/50 text-sm flex items-center gap-2 splash-text-${i + 1}`}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
            >
              <span className="w-1 h-1 rounded-full bg-amber-400/60 shrink-0" />
              {f}
            </p>
          ))}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-52 flex flex-col items-center gap-3">
        <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="splash-bar h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #d97706, #f59e0b, #fde68a, #f59e0b)",
              backgroundSize: "200% 100%",
              animation: `splash-bar-fill ${duration / 1000}s cubic-bezier(0.4,0,0.2,1) 0.3s both`,
            }}
          />
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 splash-dot-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 splash-dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 splash-dot-3" />
        </div>
      </div>

      {/* ── Version tag ── */}
      <p
        className="absolute bottom-5 text-blue-400/25 text-[10px] tracking-widest uppercase"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        v1.0 · 2024
      </p>
    </div>
  );
}
