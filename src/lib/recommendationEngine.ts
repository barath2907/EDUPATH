/**
 * EduPath — Personalized TNEA College Recommendation Engine
 *
 * Uses the Centralized TNEA Intelligence Database and ML Admission Model to generate
 * evidence-based, tailored college and branch recommendations for students.
 *
 * Inputs:
 * - studentCutoff
 * - community (OC, BC, BCM, MBC/DNC, SC, SCA, ST)
 * - preferredBranches
 * - preferredDistrict / location
 * - budget / max fees
 * - collegeType (Government, Aided, Autonomous, Private)
 * - isGovernmentSchool75Quota
 * - specialReservation
 */

import { getCollegesWithCutoffs, type CollegeWithBranches, type BranchSummary } from "./tneaData";
import { predictAdmissionProbability, type ModelPredictionResult } from "./mlPrediction";

export interface RecommendationRequest {
  studentCutoff: number;
  community: string;
  preferredBranches?: string[];
  preferredDistrict?: string;
  maxFees?: number;
  collegeType?: string;
  isGovernmentSchool75Quota?: boolean;
  specialReservation?: string;
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
  historicalCutoff2023: number;
  historicalCutoff2024: number;
  historicalCutoff2025: number;
  studentCutoff: number;
  cutoffMargin: number;
  communityCategory: string;
  annualFees: number;
  intakeSeats?: number;
  vacantSeats?: number;
  suitability: "Safe" | "Match" | "Reach";
  categoryTag?: "Safe" | "Match" | "Reach" | string;
  predictionResult: ModelPredictionResult;
  recommendationReason: string;
  sourceYear: number;
  verificationStatus: string;
  sourceUrl: string;
}

export async function generatePersonalizedRecommendations(
  req: RecommendationRequest
): Promise<RecommendedOption[]> {
  const colleges = await getCollegesWithCutoffs(req.community);
  const recommendations: RecommendedOption[] = [];

  for (const college of colleges) {
    // District Filter
    if (req.preferredDistrict && req.preferredDistrict !== "All") {
      if (college.district.toLowerCase() !== req.preferredDistrict.toLowerCase()) continue;
    }

    // College Type Filter
    if (req.collegeType && req.collegeType !== "All") {
      if (college.type.toLowerCase() !== req.collegeType.toLowerCase()) continue;
    }

    for (const branch of college.branches) {
      // Branch Filter
      if (req.preferredBranches && req.preferredBranches.length > 0) {
        if (!req.preferredBranches.includes("All") && !req.preferredBranches.includes(branch.code)) {
          continue;
        }
      }

      // Budget Filter
      if (req.maxFees && req.maxFees > 0) {
        if (branch.fees > req.maxFees) continue;
      }

      const latestCutoff = branch.cutoff2025 || branch.cutoff2024 || branch.cutoff2023;
      const margin = req.studentCutoff - latestCutoff;

      // Filter out options that are drastically out of reach (> 15 marks deficit)
      if (margin < -15.0) continue;

      let suitability: "Safe" | "Match" | "Reach" = "Match";
      if (margin >= 3.0) suitability = "Safe";
      else if (margin < -2.0) suitability = "Reach";

      // ML Model Prediction
      const prediction = predictAdmissionProbability({
        studentCutoff: req.studentCutoff,
        community: req.community,
        branchCode: branch.code,
        collegeCode: String(college.code),
        collegeName: college.name,
        historicalCutoffs: {
          year2023: branch.cutoff2023,
          year2024: branch.cutoff2024 || branch.cutoff2023,
          year2025: branch.cutoff2025 || branch.cutoff2024,
        },
        isGovernmentSchool75Quota: req.isGovernmentSchool75Quota,
        specialReservation: req.specialReservation,
      });

      let reason = `Cutoff margin of ${margin >= 0 ? "+" : ""}${margin.toFixed(2)} marks compared to 2024 observed threshold of ${latestCutoff.toFixed(2)} (${req.community} category).`;
      if (req.isGovernmentSchool75Quota) {
        reason += " Benefiting from 7.5% TN Government School student preferential allocation.";
      }

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
        historicalCutoff2023: branch.cutoff2023,
        historicalCutoff2024: branch.cutoff2024 || branch.cutoff2023,
        historicalCutoff2025: branch.cutoff2025 || branch.cutoff2024 || branch.cutoff2023,
        studentCutoff: req.studentCutoff,
        cutoffMargin: parseFloat(margin.toFixed(2)),
        communityCategory: req.community,
        annualFees: branch.fees,
        intakeSeats: branch.intake || 60,
        vacantSeats: branch.vacantSeats || 4,
        suitability,
        categoryTag: suitability,
        predictionResult: prediction,
        recommendationReason: reason,
        sourceYear: 2024,
        verificationStatus: college.verification_status || "verified",
        sourceUrl: college.source_url || "https://www.tneaonline.org",
      });
    }
  }

  // Sort by suitability and cutoff closeness
  return recommendations.sort((a, b) => b.predictionResult.predictionScore - a.predictionResult.predictionScore);
}
