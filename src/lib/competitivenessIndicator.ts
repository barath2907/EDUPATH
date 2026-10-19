/**
 * EduPath — Demand-Aware Competitiveness Indicator Engine
 * 
 * Computes a transparent, evidence-grounded Competitiveness Indicator using only verified signals.
 * 
 * CRITICAL TRANSPARENCY RULE:
 * This indicator is explicitly labeled as a "Cutoff-Trend-Based Competitiveness Indicator".
 * It NEVER claims to be live seat application counts or unverified future seat demand.
 * It is maintained as a distinct dimension from the ML admission probability.
 */

import type { CutoffTrendSummary } from "./trendAnalysisEngine.ts";

export type CompetitivenessLevel = "Very High" | "High" | "Moderate" | "Relaxed";

export interface CompetitivenessSignal {
  name: string;
  weight: number;
  score: number; // 0 - 100
  influence: "Pushes Competitiveness Up" | "Neutral / Stable" | "Eases Competitiveness";
  description: string;
}

export interface CompetitivenessIndicatorResult {
  competitivenessIndex: number; // 0 - 100
  level: CompetitivenessLevel;
  badgeColor: { bg: string; text: string; border: string };
  metricLabel: "Cutoff-Trend-Based Competitiveness Indicator";
  signals: CompetitivenessSignal[];
  summary: string;
  dataFreshnessNotice: string;
  disclaimer: string;
}

/**
 * High-demand branch codes based on verified official TNEA choice filling frequency
 */
const HIGH_DEMAND_BRANCHES = new Set(["CS", "AI", "AD", "IT", "EC"]);
const MODERATE_DEMAND_BRANCHES = new Set(["EE", "ME", "CH", "BM", "BT"]);

/**
 * Compute the Cutoff-Trend-Based Competitiveness Indicator
 */
export function computeCompetitivenessIndicator(params: {
  trend: CutoffTrendSummary;
  collegeType?: string;
  latestCutoff?: number;
  studentCutoff?: number;
  studentPreferredBranches?: string[];
}): CompetitivenessIndicatorResult {
  const { trend, collegeType = "Self-Financing", latestCutoff = trend.latestCutoff, studentCutoff, studentPreferredBranches } = params;

  const signals: CompetitivenessSignal[] = [];

  // 1. Cutoff Momentum Signal (30% weight)
  // Evaluates whether cutoffs are surging or dropping
  let momentumScore = 50;
  let momentumInfluence: CompetitivenessSignal["influence"] = "Neutral / Stable";
  let momentumDesc = "Cutoff movement has remained within ±0.5 marks over recent cycles.";

  if (trend.absoluteChange >= 2.0) {
    momentumScore = 95;
    momentumInfluence = "Pushes Competitiveness Up";
    momentumDesc = `Cutoffs rose sharply by +${trend.absoluteChange.toFixed(2)} marks, indicating intensifying competition.`;
  } else if (trend.absoluteChange >= 0.75) {
    momentumScore = 78;
    momentumInfluence = "Pushes Competitiveness Up";
    momentumDesc = `Steady cutoff upward trend (+${trend.absoluteChange.toFixed(2)} marks).`;
  } else if (trend.absoluteChange <= -2.0) {
    momentumScore = 20;
    momentumInfluence = "Eases Competitiveness";
    momentumDesc = `Cutoffs declined by ${trend.absoluteChange.toFixed(2)} marks, expanding accessibility.`;
  } else if (trend.absoluteChange <= -0.75) {
    momentumScore = 35;
    momentumInfluence = "Eases Competitiveness";
    momentumDesc = `Modest cutoff softening observed (${trend.absoluteChange.toFixed(2)} marks).`;
  }

  signals.push({
    name: "Cutoff Momentum & Trajectory",
    weight: 0.30,
    score: momentumScore,
    influence: momentumInfluence,
    description: momentumDesc,
  });

  // 2. Threshold Tightness Signal (25% weight)
  // Higher absolute cutoffs (>190) naturally have much smaller margin for error
  let tightnessScore = 50;
  let tightnessInfluence: CompetitivenessSignal["influence"] = "Neutral / Stable";
  let tightnessDesc = `Baseline cutoff of ${latestCutoff.toFixed(2)} is in the balanced mid-range bracket.`;

  if (latestCutoff >= 195.0) {
    tightnessScore = 98;
    tightnessInfluence = "Pushes Competitiveness Up";
    tightnessDesc = `Extremely tight threshold (${latestCutoff.toFixed(2)}/200). Very narrow margin for qualification.`;
  } else if (latestCutoff >= 188.0) {
    tightnessScore = 85;
    tightnessInfluence = "Pushes Competitiveness Up";
    tightnessDesc = `High threshold tier (${latestCutoff.toFixed(2)}/200), historically allotted in early rounds.`;
  } else if (latestCutoff >= 170.0) {
    tightnessScore = 65;
    tightnessInfluence = "Neutral / Stable";
    tightnessDesc = `Moderate threshold (${latestCutoff.toFixed(2)}/200). Standard Round 2-3 allotment band.`;
  } else if (latestCutoff < 140.0) {
    tightnessScore = 25;
    tightnessInfluence = "Eases Competitiveness";
    tightnessDesc = `Accessible cutoff threshold (${latestCutoff.toFixed(2)}/200). High allotment feasibility.`;
  }

  signals.push({
    name: "Cutoff Threshold Band Tightness",
    weight: 0.25,
    score: tightnessScore,
    influence: tightnessInfluence,
    description: tightnessDesc,
  });

  // 3. Volatility & Round Variation Signal (20% weight)
  // High volatility indicates unpredictable cutoff swings between cycles
  let volScore = 50;
  let volInfluence: CompetitivenessSignal["influence"] = "Neutral / Stable";
  let volDesc = `Consistent threshold behaviour across counselling years (σ = ${trend.volatility.toFixed(2)}).`;

  if (trend.volatility >= 2.5) {
    volScore = 80;
    volInfluence = "Pushes Competitiveness Up";
    volDesc = `High historical volatility (σ = ${trend.volatility.toFixed(2)}). Threshold fluctuated noticeably across years.`;
  } else if (trend.volatility <= 0.6) {
    volScore = 40;
    volInfluence = "Neutral / Stable";
    volDesc = `Highly stable cutoff across all recorded years (σ = ${trend.volatility.toFixed(2)}). High predictability.`;
  }

  signals.push({
    name: "Historical Cutoff Volatility",
    weight: 0.20,
    score: volScore,
    influence: volInfluence,
    description: volDesc,
  });

  // 4. Branch Domain Demand Factor (15% weight)
  // Derived from official statewide allotment priority (CS/IT/AI vs others)
  let branchScore = 50;
  let branchInfluence: CompetitivenessSignal["influence"] = "Neutral / Stable";
  let branchDesc = "Standard engineering branch allotment distribution.";

  if (HIGH_DEMAND_BRANCHES.has(trend.branchCode)) {
    branchScore = 90;
    branchInfluence = "Pushes Competitiveness Up";
    branchDesc = `${trend.branchName} consistently records the highest statewide student choice-order concentration.`;
  } else if (MODERATE_DEMAND_BRANCHES.has(trend.branchCode)) {
    branchScore = 55;
    branchInfluence = "Neutral / Stable";
    branchDesc = `${trend.branchName} exhibits moderate, steady counselling allotment uptake.`;
  } else {
    branchScore = 30;
    branchInfluence = "Eases Competitiveness";
    branchDesc = `${trend.branchName} maintains wider seat accessibility across later counselling rounds.`;
  }

  signals.push({
    name: "Domain Allocation Concentration",
    weight: 0.15,
    score: branchScore,
    influence: branchInfluence,
    description: branchDesc,
  });

  // 5. Institutional Accreditation & Status Signal (10% weight)
  let instScore = 50;
  const isGovt = collegeType.toLowerCase().includes("govt") || collegeType.toLowerCase().includes("aided");
  if (isGovt) {
    instScore = 85;
  } else if (collegeType.toLowerCase().includes("autonomous")) {
    instScore = 65;
  } else {
    instScore = 40;
  }

  signals.push({
    name: "Institutional Category Demand",
    weight: 0.10,
    score: instScore,
    influence: isGovt ? "Pushes Competitiveness Up" : "Neutral / Stable",
    description: isGovt
      ? "Government / Aided college — higher candidate priority due to subsidized fee structure."
      : "Self-financing / Private institution seat distribution.",
  });

  // Composite Weighted Calculation
  const totalScore = signals.reduce((sum, s) => sum + s.score * s.weight, 0);
  const competitivenessIndex = Math.min(100, Math.max(0, Math.round(totalScore)));

  let level: CompetitivenessLevel = "Moderate";
  let badgeColor = { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" };

  if (competitivenessIndex >= 82) {
    level = "Very High";
    badgeColor = { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" };
  } else if (competitivenessIndex >= 65) {
    level = "High";
    badgeColor = { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" };
  } else if (competitivenessIndex <= 40) {
    level = "Relaxed";
    badgeColor = { bg: "#f0fdf4", text: "#166534", border: "#86efac" };
  }

  const summary = `Based on multi-year cutoff progression (${trend.direction}) and a threshold band of ${latestCutoff.toFixed(2)}, this option exhibits a ${level.toLowerCase()} competitiveness profile (Indicator Index: ${competitivenessIndex}/100).`;

  return {
    competitivenessIndex,
    level,
    badgeColor,
    metricLabel: "Cutoff-Trend-Based Competitiveness Indicator",
    signals,
    summary,
    dataFreshnessNotice: `Computed from official ${trend.earliestYear}–${trend.latestYear} TNEA verified datasets.`,
    disclaimer: "Transparent Notice: This is a cutoff-trend-based competitiveness indicator derived from verified historical allotment records. It does not represent live unallotted seat applications or future cutoff guarantees.",
  };
}
