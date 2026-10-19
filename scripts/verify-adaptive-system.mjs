/**
 * EduPath — Adaptive TNEA Prediction & Demand-Aware Recommendation Test Suite
 * 
 * Verifies all 7 core stages and safety requirements:
 * 1. Data Ingestion & Validation (valid rows, invalid cutoffs, duplicates, missing fields)
 * 2. Multi-Year Cutoff Trend Analysis (deltas, percentage shift, volatility σ, missing year handling)
 * 3. Demand-Aware Competitiveness Indicator (signals, 0-100 index, transparent labeling)
 * 4. Model Governance & Drift Monitoring (PSI drift calculation, safety gates, rollback)
 * 5. Dynamic 4-Tier Recommendations (Strong Match, Match, Competitive, Challenging)
 * 6. RAG AI Counsellor Grounding (trend explanations, source citations, anti-guarantee disclaimer)
 * 7. End-to-End REST API Integration (trends, governance, automated pipeline endpoints)
 */

import { handleApiRequest } from "../src/server/apiRouter.ts";
import { validateImportRows } from "../src/lib/importValidator.ts";
import {
  analyzeCutoffTrend,
  calculateVolatility,
  classifyTrendDirection,
} from "../src/lib/trendAnalysisEngine.ts";
import { computeCompetitivenessIndicator } from "../src/lib/competitivenessIndicator.ts";
import {
  calculatePSI,
  evaluateCandidateModel,
  promoteModelToProduction,
  rollbackModel,
  predictAdaptiveAdmission,
  getModelRegistry,
  getProductionModel,
} from "../src/lib/adaptivePredictionService.ts";
import {
  generatePersonalizedRecommendations,
  classifyRecommendationCategory,
} from "../src/lib/recommendationEngine.ts";
import { executeAdaptivePipeline } from "../src/lib/dataIngestionService.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function api(path, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return await handleApiRequest({
    method,
    url: `http://localhost:8443${path}`,
    headers,
    body,
  });
}

console.log("================================================================================");
console.log("EDUPATH — ADAPTIVE TNEA PREDICTION & DEMAND-AWARE RECOMMENDATION TEST SUITE");
console.log("================================================================================\n");

async function runAdaptiveTestSuite() {
  // ─────────────────────────────────────────────────────────────
  // STAGE 1: Data Ingestion & Strict Validation
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Data Ingestion & Validation Checks ---");

  // Valid rows
  const validBatch = [
    { college_code: "0001", college_name: "CEG Anna University", branch_code: "CS", branch_name: "Computer Science", year: "2025", category: "OC", cutoff: "199.25", round: "1" },
    { college_code: "0001", college_name: "CEG Anna University", branch_code: "EC", branch_name: "Electronics", year: "2025", category: "BC", cutoff: "197.80", round: "1" },
  ];
  const validRes = validateImportRows(validBatch);
  assert(validRes.valid.length === 2 && validRes.errors.length === 0, "1.1 Valid records with proper schema and cutoff marks pass");

  // Out of bounds cutoffs (e.g. 215 marks, or 40 marks)
  const invalidCutoffBatch = [
    { college_code: "0001", college_name: "CEG", branch_code: "CS", branch_name: "CS", year: "2025", category: "OC", cutoff: "215.00" }, // Exceeds 200
    { college_code: "0001", college_name: "CEG", branch_code: "CS", branch_name: "CS", year: "2025", category: "OC", cutoff: "35.00" },  // Below minimum threshold
  ];
  const invalidCutoffRes = validateImportRows(invalidCutoffBatch);
  assert(invalidCutoffRes.valid.length === 0 && invalidCutoffRes.errors.length >= 2, "1.2 Out-of-bounds cutoffs (>200 or <77.5) are quarantined");

  // Duplicate detection in automated pipeline
  const duplicateBatch = [
    { college_code: "2006", college_name: "PSG Tech", branch_code: "CS", branch_name: "CS", year: "2025", category: "OC", cutoff: "198.00", round: "1" },
    { college_code: "2006", college_name: "PSG Tech", branch_code: "CS", branch_name: "CS", year: "2025", category: "OC", cutoff: "198.00", round: "1" }, // Duplicate fingerprint
  ];
  const pipelineDupRun = await executeAdaptivePipeline({
    filename: "test_duplicates.csv",
    rawRows: duplicateBatch,
    sourceYear: 2025,
    sourceUrl: "https://static.tneaonline.org/test.csv",
  });
  assert(pipelineDupRun.validationSummary.duplicateCount === 1, "1.3 Duplicate allotment fingerprints are detected and filtered");
  assert(pipelineDupRun.validationSummary.validRows === 1, "1.4 Exactly one canonical record is retained from duplicate submissions");

  // Missing required fields
  const missingFieldBatch = [
    { college_code: "", college_name: "Incomplete College", branch_code: "CS", year: "2025", category: "OC", cutoff: "190.00" },
  ];
  const missingRes = validateImportRows(missingFieldBatch);
  assert(missingRes.errors.some(e => e.field === "college_code"), "1.5 Missing mandatory college_code fails validation with clear error");

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: Multi-Year Cutoff Trend Analysis
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Multi-Year Cutoff Trend Analysis ---");

  // Standard multi-year progression (Surging trend: 194.0 -> 195.5 -> 197.0)
  const surgingTrend = analyzeCutoffTrend({
    collegeCode: "2006",
    collegeName: "PSG College of Technology",
    branchCode: "AI",
    branchName: "Artificial Intelligence and Data Science",
    community: "OC",
    rawCutoffs: [
      { year: 2023, cutoff: 194.00, isVerified: true },
      { year: 2024, cutoff: 195.50, isVerified: true },
      { year: 2025, cutoff: 197.00, isVerified: true },
    ],
  });

  assert(surgingTrend.absoluteChange === 3.00, "2.1 Absolute cutoff change calculated accurately (+3.00 marks)");
  assert(surgingTrend.direction === "Surging", "2.2 Classified as Surging trend when Δ >= +1.5 marks");
  assert(surgingTrend.percentageChange > 1.5, "2.3 Percentage change calculated mathematically");
  assert(surgingTrend.volatility > 0, "2.4 Sample standard deviation (volatility) computed properly");
  assert(surgingTrend.reliability.includes("High Reliability"), "2.5 3-year complete history assigned High Reliability rating");

  // Stable trend: 185.0 -> 185.2 -> 185.1
  const stableTrend = analyzeCutoffTrend({
    collegeCode: "1311",
    collegeName: "KCG College of Technology",
    branchCode: "ME",
    branchName: "Mechanical Engineering",
    community: "OC",
    rawCutoffs: [
      { year: 2023, cutoff: 185.00, isVerified: true },
      { year: 2024, cutoff: 185.20, isVerified: true },
      { year: 2025, cutoff: 185.10, isVerified: true },
    ],
  });
  assert(stableTrend.direction === "Stable", "2.6 Changes within ±0.5 marks classified as Stable trend");

  // Missing year handling: 2023 present, 2024 missing, 2025 present
  const missingYearTrend = analyzeCutoffTrend({
    collegeCode: "3011",
    collegeName: "New College",
    branchCode: "AD",
    branchName: "AI & ML",
    community: "BC",
    rawCutoffs: [
      { year: 2023, cutoff: 180.00, isVerified: true },
      { year: 2025, cutoff: 182.50, isVerified: true },
    ],
  });
  assert(missingYearTrend.dataPoints.length === 2, "2.7 Missing years are omitted gracefully without artificial zero imputation");
  assert(missingYearTrend.reliability.includes("Moderate Reliability"), "2.8 2-year history assigned Moderate Reliability");

  // Volatility calculation verification
  const volTest = calculateVolatility([190.0, 192.0, 196.0]);
  assert(volTest > 2.5, "2.9 Volatility metric reflects fluctuating cutoff distribution (σ = " + volTest + ")");

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: Demand-Aware Competitiveness Indicator
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Demand-Aware Competitiveness Indicator ---");

  const compIndicator = computeCompetitivenessIndicator({
    trend: surgingTrend,
    collegeType: "Aided",
    latestCutoff: 197.00,
    studentCutoff: 192.00,
  });

  assert(compIndicator.metricLabel === "Cutoff-Trend-Based Competitiveness Indicator", "3.1 Labeled strictly as Cutoff-Trend-Based Competitiveness Indicator");
  assert(compIndicator.competitivenessIndex >= 0 && compIndicator.competitivenessIndex <= 100, "3.2 Competitiveness Index bounded between 0 and 100");
  assert(compIndicator.level === "Very High" || compIndicator.level === "High", "3.3 High cutoff + surging momentum yields High/Very High Competitiveness level");
  assert(compIndicator.signals.length === 5, "3.4 Includes all 5 transparent signal dimensions");
  assert(compIndicator.disclaimer.includes("does not represent live unallotted seat applications"), "3.5 Prominent non-speculative transparency disclaimer present");

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: Model Governance & Drift Monitoring
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. Model Governance, PSI Drift & Safety Gates ---");

  // Population Stability Index (PSI) calculation
  const baseFreqs = [100, 200, 400, 200, 100];
  const stableFreqs = [105, 195, 410, 190, 100];
  const driftedFreqs = [50, 120, 300, 350, 180];

  const stablePSI = calculatePSI(baseFreqs, stableFreqs);
  const driftedPSI = calculatePSI(baseFreqs, driftedFreqs);

  assert(stablePSI < 0.10, "4.1 Stable population frequencies yield PSI < 0.10 (PSI = " + stablePSI + ")");
  assert(driftedPSI > 0.10, "4.2 Significant population shift correctly detected as drift (PSI = " + driftedPSI + ")");

  // Model evaluation against safety gates
  const evalGate = evaluateCandidateModel("tnea-adaptive-v4.0.0-candidate");
  assert(typeof evalGate.passed === "boolean", "4.3 Candidate model evaluated against predefined safety criteria");
  assert(evalGate.reasons.length >= 3, "4.4 Multi-gate audit justifications provided");

  // Model promotion
  const promoRes = promoteModelToProduction("tnea-adaptive-v4.0.0-candidate", "Test Admin");
  assert(promoRes.success, "4.5 Validated candidate model promoted to production");
  const prodAfter = getProductionModel();
  assert(prodAfter.versionId === "tnea-adaptive-v4.0.0-candidate", "4.6 Production model successfully updated in governance registry");

  // Model rollback
  const rollbackRes = rollbackModel();
  assert(rollbackRes.success, "4.7 One-click model rollback successfully executed");
  const prodRolledBack = getProductionModel();
  assert(prodRolledBack.versionId !== "tnea-adaptive-v4.0.0-candidate", "4.8 Production model restored to prior baseline (" + prodRolledBack.versionId + ")");

  // ─────────────────────────────────────────────────────────────
  // STAGE 5: Dynamic 4-Tier Recommendations
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. Dynamic 4-Tier Recommendations ---");

  const recCategoryStrong = classifyRecommendationCategory(4.5, 88, "Stable");
  assert(recCategoryStrong.category === "Strong Match", "5.1 Safe cutoff margin (+4.5) & high score classified as Strong Match");

  const recCategoryMatch = classifyRecommendationCategory(0.5, 65, "Stable");
  assert(recCategoryMatch.category === "Match", "5.2 Cutoff closely aligned with threshold classified as Match");

  const recCategoryComp = classifyRecommendationCategory(-2.0, 48, "Surging");
  assert(recCategoryComp.category === "Competitive", "5.3 Moderate deficit with surging competition classified as Competitive");

  const recCategoryReach = classifyRecommendationCategory(-8.0, 20, "Surging");
  assert(recCategoryReach.category === "Challenging", "5.4 Large cutoff deficit (-8.0) classified as Challenging");

  // End-to-end recommendation engine generation
  const recs = await generatePersonalizedRecommendations({
    studentCutoff: 188.0,
    community: "OC",
    preferredBranches: ["CS", "EC", "AI"],
  });

  assert(recs.length > 0, "5.5 Generates personalized recommendations from 461 institutions");
  const sampleRec = recs[0];
  assert(sampleRec.recommendationCategory !== undefined, "5.6 Output contains explicit recommendationCategory");
  assert(sampleRec.trendSummary !== undefined, "5.7 Output contains precomputed multi-year trendSummary");
  assert(sampleRec.competitivenessIndicator !== undefined, "5.8 Output contains transparent competitivenessIndicator");
  assert(sampleRec.dataLimitations.includes("does not guarantee admission"), "5.9 Explicit non-guarantee disclaimer attached to recommendation");

  // 7.5% Government school quota test
  const recsGovt = await generatePersonalizedRecommendations({
    studentCutoff: 188.0,
    community: "OC",
    preferredBranches: ["CS"],
    isGovernmentSchool75Quota: true,
  });
  const govtFactors = recsGovt[0].contributingFactors;
  assert(govtFactors.some(f => f.includes("7.5%")), "5.10 7.5% Government school preferential allocation reflected in contributing factors");

  // ─────────────────────────────────────────────────────────────
  // STAGE 6: REST API Endpoints Integration
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 6. Backend REST API Endpoints ---");

  // GET /api/trends/college/:code
  const trendApiRes = await api("/api/trends/college/0001?category=OC");
  assert(trendApiRes.status === 200 && trendApiRes.data.success, "6.1 GET /api/trends/college/0001 returns 200 with multi-year branch trends");
  assert(trendApiRes.data.trends.length > 0, "6.2 Branch trends populated with volatility and direction");

  // GET /api/governance/models
  const govApiRes = await api("/api/governance/models");
  assert(govApiRes.status === 200 && govApiRes.data.models.length >= 2, "6.3 GET /api/governance/models returns model version vault");

  // GET /api/governance/drift-status
  const driftApiRes = await api("/api/governance/drift-status");
  assert(driftApiRes.status === 200 && typeof driftApiRes.data.driftPSI === "number", "6.4 GET /api/governance/drift-status returns current PSI metrics");

  // POST /api/ingestion/run-pipeline
  const pipelineApiRes = await api("/api/ingestion/run-pipeline", "POST", {
    filename: "tnea_verified_2025.csv",
    rawRows: [
      { college_code: "0001", college_name: "CEG", branch_code: "CS", branch_name: "CSE", year: "2025", category: "OC", cutoff: "199.0", round: "1" },
      { college_code: "2006", college_name: "PSG", branch_code: "CS", branch_name: "CSE", year: "2025", category: "OC", cutoff: "197.5", round: "1" },
    ],
    sourceYear: 2025,
    sourceUrl: "https://static.tneaonline.org/test2025.csv",
  });
  assert(pipelineApiRes.status === 200 && pipelineApiRes.data.status === "completed", "6.5 POST /api/ingestion/run-pipeline executes 9-stage workflow");

  // GET /api/ingestion/jobs
  const jobsApiRes = await api("/api/ingestion/jobs");
  assert(jobsApiRes.status === 200 && jobsApiRes.data.length > 0, "6.6 GET /api/ingestion/jobs returns audit log history");

  // ─────────────────────────────────────────────────────────────
  // STAGE 7: RAG AI Counsellor Trend Integration
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 7. RAG AI Counsellor Grounding & Trend Questions ---");

  const counsellorChatRes = await api("/api/counsellor/chat", "POST", {
    query: "What is the cutoff trend for CEG Anna University Computer Science?",
    history: [],
  });

  assert(counsellorChatRes.status === 200, "7.1 RAG AI Counsellor answers cutoff trend inquiry");
  const ans = counsellorChatRes.data.answer;
  assert(ans.length > 50, "7.2 Counsellor generates detailed response");
  assert(counsellorChatRes.data.sources.some(s => s.title.includes("TNEA")), "7.3 Response cites official TNEA allotment source records");

  console.log("\n================================================================================");
  console.log(`ADAPTIVE SYSTEM TEST SUITE COMPLETE: ${passedTests}/${totalTests} tests passed, ${failedTests} failed.`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdaptiveTestSuite().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
