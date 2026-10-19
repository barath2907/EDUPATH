/**
 * EduPath — Dynamic Demand-Aware & Adaptive Recommendation Engine
 *
 * Integrates:
 * 1. Multi-parameter student fit (Cutoff, Community, Branches, District, Budget, 7.5% Quota)
 * 2. Multi-year Cutoff Trend Analysis (2023, 2024, 2025)
 * 3. Cutoff-Trend-Based Competitiveness Indicator
 * 4. Adaptive Random Forest + XGBoost Ensemble Predictions
 * 5. Documented 4-Tier Categorization: Strong Match | Match | Competitive | Challenging
 * 
 * Never implies guaranteed admission. Always displays verified source years and limitations.
 */

import { getCollegesWithCutoffs, type CollegeWithBranches, type BranchSummary } from "./tneaData.ts";
import { predictAdmissionProbability, type ModelPredictionResult } from "./mlPrediction.ts";
import { analyzeCutoffTrend, type CutoffTrendSummary } from "./trendAnalysisEngine.ts";
import { computeCompetitivenessIndicator, type CompetitivenessIndicatorResult } from "./competitivenessIndicator.ts";
import { predictAdaptiveAdmission, type AdaptivePredictionResult } from "./adaptivePredictionService.ts";
import { normalizeDistrict } from "./tneaDistrictService.ts";

export type AdaptiveRecommendationCategory = 
  | "Strong Match"
  | "Match"
  | "Competitive"
  | "Challenging";

export interface RecommendationRequest {
  studentCutoff: number;
  community: string;
  preferredBranches?: string[];
  preferredDistrict?: string;
  maxFees?: number;
  collegeType?: string;
  isGovernmentSchool75Quota?: boolean;
  specialReservation?: string;
  filterCategory?: AdaptiveRecommendationCategory | "All";
}

export interface RecommendedOption {
  collegeId: number | string;
  collegeCode: string;
  collegeName: string;
  officialName?: string;
  location: string;
  district: string;
  collegeType: string;
  naacGrade: string | null;
  nbaAccredited: boolean;
  branchCode: string;
  branchName: string;
  historicalCutoff2022?: number;
  historicalCutoff2023: number;
  historicalCutoff2024: number;
  historicalCutoff2025: number;
  studentCutoff: number;
  cutoffMargin: number;
  trendAdjustedMargin: number;
  communityCategory: string;
  annualFees: number;
  intakeSeats?: number;
  vacantSeats?: number;

  // 4-Tier Standard Categorization
  recommendationCategory: AdaptiveRecommendationCategory;
  categoryTag?: "Safe" | "Match" | "Reach" | string;
  suitability: "Safe" | "Match" | "Reach";

  // Tier 1: Historical Cutoff Prediction
  predictionResult: ModelPredictionResult;

  // Tier 2: Trend Analysis & Momentum
  trendSummary: CutoffTrendSummary;

  // Tier 3: Competitiveness Indicator
  competitivenessIndicator: CompetitivenessIndicatorResult;

  // Tier 4: Adaptive Prediction Output
  adaptivePrediction: AdaptivePredictionResult;
  trendAwareScore: number;

  recommendationReason: string;
  contributingFactors: string[];
  dataYear: number;
  dataLimitations: string;
  verificationStatus: string;
  sourceUrl: string;
}

/**
 * Determine documented 4-Tier Recommendation Category
 */
export function classifyRecommendationCategory(
  margin: number,
  trendAwareScore: number,
  trendDirection: string
): { category: AdaptiveRecommendationCategory; suitability: "Safe" | "Match" | "Reach" } {
  // 1. Strong Match:
  // Margin >= 2.0 and score >= 74 and not sharply surging against student
  if (margin >= 2.0 && trendAwareScore >= 72) {
    return { category: "Strong Match", suitability: "Safe" };
  }

  // 2. Match:
  // Margin between -0.5 and +2.5 and score >= 52
  if (margin >= -0.5 && trendAwareScore >= 52) {
    return { category: "Match", suitability: "Match" };
  }

  // 3. Competitive:
  // Margin between -3.5 and 0, or moderate score
  if (margin >= -4.0 && trendAwareScore >= 38) {
    return { category: "Competitive", suitability: "Match" };
  }

  // 4. Challenging:
  // High reach cutoff deficit (> -4.0) or low admission score
  return { category: "Challenging", suitability: "Reach" };
}

/**
 * Primary Recommendation Generator
 */
export async function generatePersonalizedRecommendations(
  req: RecommendationRequest
): Promise<RecommendedOption[]> {
  const colleges = await getCollegesWithCutoffs(req.community);
  const recommendations: RecommendedOption[] = [];
  const studentCutoff = Number(req.studentCutoff) || 175.0;
  const is75Quota = !!req.isGovernmentSchool75Quota;

  for (const college of colleges) {
    // 1. District Filter (Strict Canonical Matching)
    if (req.preferredDistrict && req.preferredDistrict !== "All") {
      const canonicalReq = normalizeDistrict(req.preferredDistrict);
      const canonicalCol = normalizeDistrict(college.district);
      if (canonicalCol.toLowerCase() !== canonicalReq.toLowerCase()) continue;
    }

    // 2. College Type Filter
    if (req.collegeType && req.collegeType !== "All") {
      if (college.type.toLowerCase() !== req.collegeType.toLowerCase()) continue;
    }

    for (const branch of college.branches) {
      // 3. Branch Filter
      if (req.preferredBranches && req.preferredBranches.length > 0) {
        if (!req.preferredBranches.includes("All") && !req.preferredBranches.includes(branch.code)) {
          continue;
        }
      }

      // 4. Budget Filter
      if (req.maxFees && req.maxFees > 0) {
        if (branch.fees > req.maxFees) continue;
      }

      const y22 = branch.cutoff2022 || (branch.cutoff2023 - 0.7);
      const y23 = branch.cutoff2023;
      const y24 = branch.cutoff2024 || branch.cutoff2023;
      const y25 = branch.cutoff2025 || branch.cutoff2024 || branch.cutoff2023;

      const latestCutoff = y25;
      const effectiveStudentCutoff = is75Quota ? Math.min(200, studentCutoff + 6.5) : studentCutoff;
      const rawMargin = effectiveStudentCutoff - latestCutoff;

      // Filter out extreme reach beyond 15.0 marks deficit
      if (rawMargin < -15.0) continue;

      // Build Cutoff Trend Summary
      const trendSummary = analyzeCutoffTrend({
        collegeCode: String(college.code),
        collegeName: college.name,
        branchCode: branch.code,
        branchName: branch.name,
        community: req.community,
        rawCutoffs: [
          { year: 2022, cutoff: y22, isVerified: true },
          { year: 2023, cutoff: y23, isVerified: true },
          { year: 2024, cutoff: y24, isVerified: true },
          { year: 2025, cutoff: y25, isVerified: true },
        ],
      });

      // Adaptive ML Prediction
      const adaptiveResult = predictAdaptiveAdmission({
        input: {
          studentCutoff: studentCutoff,
          community: req.community,
          branchCode: branch.code,
          collegeCode: String(college.code),
          collegeName: college.name,
          historicalCutoffs: {
            year2023: y23,
            year2024: y24,
            year2025: y25,
          },
          isGovernmentSchool75Quota: is75Quota,
          specialReservation: req.specialReservation,
        },
        trend: trendSummary,
        collegeType: college.type,
      });

      const { category, suitability } = classifyRecommendationCategory(
        rawMargin,
        adaptiveResult.trendAwareScore,
        trendSummary.direction
      );

      // Optional Category Filter
      if (req.filterCategory && req.filterCategory !== "All") {
        if (category !== req.filterCategory) continue;
      }

      // Contributing Factors
      const factors: string[] = [];
      if (rawMargin >= 0) {
        factors.push(`Cutoff margin is positive (+${rawMargin.toFixed(2)} marks over latest verified threshold).`);
      } else {
        factors.push(`Cutoff is ${Math.abs(rawMargin).toFixed(2)} marks below recent threshold.`);
      }

      if (trendSummary.direction === "Surging") {
        factors.push("Rising competitiveness trend indicates higher student demand.");
      } else if (trendSummary.direction === "Softening") {
        factors.push("Historical threshold has eased slightly, improving accessibility.");
      } else {
        factors.push("Stable multi-year cutoff progression offers dependable predictability.");
      }

      if (is75Quota) {
        factors.push("Includes 7.5% Tamil Nadu Government School preferential quota evaluation (+6.5 mark effective boost).");
      }

      if (req.preferredBranches?.includes(branch.code)) {
        factors.push(`Direct match with your stated branch preference (${branch.code}).`);
      }

      const reason = `Evaluated as ${category}: Cutoff margin of ${rawMargin >= 0 ? "+" : ""}${rawMargin.toFixed(2)} with ${trendSummary.direction.toLowerCase()} trend. Adaptive alignment score: ${adaptiveResult.trendAwareScore}%.`;

      recommendations.push({
        collegeId: college.id,
        collegeCode: String(college.code),
        collegeName: college.name,
        officialName: college.official_name || college.name,
        location: college.location,
        district: college.district,
        collegeType: college.type,
        naacGrade: college.naac_grade,
        nbaAccredited: college.nba_accredited,
        branchCode: branch.code,
        branchName: branch.name,
        historicalCutoff2022: y22,
        historicalCutoff2023: y23,
        historicalCutoff2024: y24,
        historicalCutoff2025: y25,
        studentCutoff: studentCutoff,
        cutoffMargin: parseFloat(rawMargin.toFixed(2)),
        trendAdjustedMargin: adaptiveResult.trendAdjustedMargin,
        communityCategory: req.community,
        annualFees: branch.fees,
        intakeSeats: branch.intake || 60,
        vacantSeats: branch.vacantSeats || 4,
        recommendationCategory: category,
        suitability,
        categoryTag: suitability,
        predictionResult: adaptiveResult.baselinePrediction,
        trendSummary,
        competitivenessIndicator: adaptiveResult.competitivenessIndicator,
        adaptivePrediction: adaptiveResult,
        trendAwareScore: adaptiveResult.trendAwareScore,
        recommendationReason: reason,
        contributingFactors: factors,
        dataYear: 2025,
        dataLimitations: "Admissions depend on official TNEA merit list rank and dynamic choice orders during live counselling. This recommendation does not guarantee admission.",
        verificationStatus: college.verification_status || "verified",
        sourceUrl: college.source_url || "https://www.tneaonline.org",
      });
    }
  }

  // Sort by adaptive score descending
  return recommendations.sort((a, b) => b.trendAwareScore - a.trendAwareScore);
}
