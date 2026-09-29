/**
 * EduPath — AI RAG Counsellor & Knowledge Engine
 * Dedicated TNEA Counselling Assistant powered by Hybrid RAG + Centralized TNEA Database.
 *
 * System Identity:
 * "You are EduPath AI Counsellor, a TNEA counselling assistant. Answer TNEA-related questions
 * using verified TNEA information retrieved from the EduPath knowledge base and structured TNEA database."
 *
 * Features:
 * 1. Semantic Document Chunking & Rich Metadata (document_id, section, page, source_url)
 * 2. RAG Query Router (A-R Query Categories)
 * 3. Hybrid RAG Architecture (SQL DB + ML Model + Vector RAG + Grounded LLM Response)
 * 4. Multilingual Processing (English, Tamil, Tanglish)
 * 5. Integrated Speech-to-Text & Text-to-Speech Voice Engine
 */

import { getCollegesWithCutoffs, type CollegeWithBranches } from "./tneaData";
import { predictAdmissionProbability } from "./mlPrediction";

// ──────────────────────────────────────────────
// Query Router Categories (A - R)
// ──────────────────────────────────────────────
export type QueryCategory =
  | "GENERAL_TNEA_INFO" // A
  | "ELIGIBILITY" // B
  | "COUNSELLING_PROCESS" // C
  | "COMMUNITY_RESERVATION" // D
  | "CHOICE_FILLING" // E
  | "ALLOTMENT" // F
  | "UPWARD_MOVEMENT" // G
  | "SEAT_VACANCY" // H
  | "COLLEGE_INFO" // I
  | "BRANCH_INFO" // J
  | "CUTOFF_QUERY" // K
  | "PERSONALIZED_RECOMMENDATION" // L
  | "ADMISSION_PREDICTION" // M
  | "COLLEGE_COMPARISON" // N
  | "STUDENT_PROFILE_QUERY" // O
  | "REPORT_QUERY" // P
  | "CURRENT_UPDATE" // Q
  | "OUT_OF_SCOPE"; // R

export interface RAGDocumentChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_year: number;
  document_type: "Official Brochure" | "Counselling Procedure" | "Eligibility Guidelines" | "Reservation Policy" | "FAQ";
  page_number: number;
  section: string;
  source_url: string;
  source_authority: string;
  effective_date: string;
  retrieved_at: string;
  version: string;
  content: string;
}

export interface StudentProfileContext {
  studentName?: string;
  cutoff?: number;
  maths?: number;
  physics?: number;
  chemistry?: number;
  category?: string; // OC, BC, BCM, MBC, SC, SCA, ST
  preferredDistrict?: string;
  preferredBranches?: string[];
  isGovernmentSchool75Quota?: boolean;
}

export interface GroundedRAGResponse {
  queryCategory: QueryCategory;
  detectedLanguage: "en" | "ta" | "tanglish";
  answer: string;
  relevantSteps?: string[];
  importantConditions?: string[];
  sources: Array<{ title: string; year: number; page?: number; section?: string; url?: string }>;
  evidenceData?: any;
  recommendations?: any[];
  predictionResult?: any;
}

// ──────────────────────────────────────────────
// Indexed Knowledge Base Chunks (ChromaDB / Vector Store Simulation)
// ──────────────────────────────────────────────
export const OFFICIAL_TNEA_KNOWLEDGE_BASE: RAGDocumentChunk[] = [
  {
    chunk_id: "tnea-2024-brochure-001",
    document_id: "DOC-TNEA-2024-INF",
    document_title: "TNEA 2024 Official Information Brochure",
    document_year: 2024,
    document_type: "Official Brochure",
    page_number: 14,
    section: "4. Cut-off Mark Calculation",
    source_url: "https://static.tneaonline.org/docs/tnea2024_information_brochure.pdf",
    source_authority: "Directorate of Technical Education, Tamil Nadu",
    effective_date: "2024-05-01",
    retrieved_at: "2025-06-01T10:00:00Z",
    version: "v2024.1",
    content: `TNEA Cutoff Mark Calculation Rules:
The aggregate mark out of 200 is determined as follows:
• Mathematics: 100 Marks (Full weightage)
• Physics: 50 Marks (Physics score ÷ 2)
• Chemistry: 50 Marks (Chemistry score ÷ 2)
Formula: Cutoff = Mathematics + (Physics / 2) + (Chemistry / 2).
Maximum total cutoff is 200.00. No round-off is permitted prior to ranking.`,
  },
  {
    chunk_id: "tnea-2024-reservation-002",
    document_id: "DOC-TNEA-2024-RES",
    document_title: "Tamil Nadu Engineering Admissions Reservation Guidelines",
    document_year: 2024,
    document_type: "Reservation Policy",
    page_number: 8,
    section: "6. Communal Reservation Breakdown",
    source_url: "https://static.tneaonline.org/docs/tnea2024_reservation_policy.pdf",
    source_authority: "Government of Tamil Nadu - Higher Education Dept",
    effective_date: "2024-05-01",
    retrieved_at: "2025-06-01T10:00:00Z",
    version: "v2024.1",
    content: `TNEA Communal Reservation Percentages:
• Open Competition (OC): 31.0%
• Backward Class (BC): 26.5%
• Backward Class Muslim (BCM): 3.5%
• Most Backward Class & Denotified Communities (MBC & DNC): 20.0%
• Scheduled Caste (SC): 15.0%
• Scheduled Caste Arunthathiyar (SCA): 3.0% (Horizontal within SC)
• Scheduled Tribe (ST): 1.0%

Special Horizontal Quotas:
• 7.5% Preference for Government School Students (Studied 6th to 12th in TN Govt Schools).
• Differently Abled Persons: 5%
• Children of Ex-Servicemen: 1%
• Eminent Sports Persons: 2%`,
  },
  {
    chunk_id: "tnea-2024-proc-003",
    document_id: "DOC-TNEA-2024-PROC",
    document_title: "TNEA Online Counselling Procedure & Choice Filling",
    document_year: 2024,
    document_type: "Counselling Procedure",
    page_number: 22,
    section: "9. Choice Filling & Upward Movement",
    source_url: "https://static.tneaonline.org/docs/tnea2024_counselling_procedure.pdf",
    source_authority: "TNEA Counselling Committee",
    effective_date: "2024-06-15",
    retrieved_at: "2025-06-01T10:00:00Z",
    version: "v2024.2",
    content: `TNEA Online Counselling Stages:
1. Registration & Document Upload: Candidates register at tneaonline.org and submit original certificates for online verification.
2. Rank List Publication: Overall and communal ranks assigned based on normalized cut-off marks.
3. Choice Filling: Candidates enter unlimited choices in order of preference.
4. Tentative Allotment: System allocates seats based on rank, category, and choice list.
5. Confirmation Options: Candidates must choose:
   - Option A: Accept and Join
   - Option B: Accept and Opt for Upward Movement
   - Option C: Decline and Opt for Upward Movement
   - Option D: Decline and Move to Subsequent Round
   - Option E: Quit Counselling
6. Provisional Allotment & College Joining: Report to allocated college within specified reporting window with fee payment.`,
  },
  {
    chunk_id: "tnea-2024-govt-004",
    document_id: "DOC-TNEA-2024-GOVT75",
    document_title: "Government School 7.5% Preferential Reservation Scheme",
    document_year: 2024,
    document_type: "Eligibility Guidelines",
    page_number: 4,
    section: "3. 7.5% Govt School Quota Eligibility",
    source_url: "https://static.tneaonline.org/docs/7.5_percent_reservation_rules.pdf",
    source_authority: "Directorate of Technical Education",
    effective_date: "2024-05-10",
    retrieved_at: "2025-06-01T10:00:00Z",
    version: "v2024.1",
    content: `Government School 7.5% Quota Rules:
Applicable to students who have studied continuously from 6th Standard to 12th Standard in Tamil Nadu Government Schools (Corporation, Municipal, ADW, Tribal Welfare schools).
Full tuition fee, hostel fee, and counselling fees for candidates admitted under this 7.5% quota are completely borne by the Government of Tamil Nadu.`,
  },
];

// ──────────────────────────────────────────────
// Query Router Engine
// ──────────────────────────────────────────────
export function classifyQuery(query: string): { category: QueryCategory; language: "en" | "ta" | "tanglish" } {
  const lower = query.toLowerCase().trim();

  // Language Detection
  let language: "en" | "ta" | "tanglish" = "en";
  if (/[\u0B80-\u0BFF]/.test(query)) {
    language = "ta";
  } else if (/\b(epdi|nadakkum|yenna|irukku|enna|kidaikuma|sollunga|varum|kaatunga)\b/i.test(lower)) {
    language = "tanglish";
  }

  // Query Category Classification
  if (lower.includes("cutoff") && (lower.includes("calculate") || lower.includes("formula") || lower.includes("how to"))) {
    return { category: "CUTOFF_QUERY", language };
  }
  if (lower.includes("recommend") || lower.includes("suggest") || lower.includes("best college for me") || lower.includes("which college")) {
    return { category: "PERSONALIZED_RECOMMENDATION", language };
  }
  if (lower.includes("predict") || lower.includes("chance") || lower.includes("can i get") || lower.includes("kidaikuma")) {
    return { category: "ADMISSION_PREDICTION", language };
  }
  if (lower.includes("compare") || lower.includes("vs") || lower.includes("difference between")) {
    return { category: "COLLEGE_COMPARISON", language };
  }
  if (lower.includes("reserv") || lower.includes("quota") || lower.includes("community") || lower.includes("7.5") || lower.includes("bc") || lower.includes("mbc")) {
    return { category: "COMMUNITY_RESERVATION", language };
  }
  if (lower.includes("choice") || lower.includes("filling") || lower.includes("option")) {
    return { category: "CHOICE_FILLING", language };
  }
  if (lower.includes("upward") || lower.includes("move") || lower.includes("tentative")) {
    return { category: "UPWARD_MOVEMENT", language };
  }
  if (lower.includes("document") || lower.includes("certificate") || lower.includes("eligible")) {
    return { category: "ELIGIBILITY", language };
  }
  if (lower.includes("process") || lower.includes("steps") || lower.includes("procedure") || lower.includes("nadakkum")) {
    return { category: "COUNSELLING_PROCESS", language };
  }
  if (lower.includes("college") || lower.includes("district") || lower.includes("chennai") || lower.includes("coimbatore")) {
    return { category: "COLLEGE_INFO", language };
  }

  return { category: "GENERAL_TNEA_INFO", language };
}

import { counsellorAgent, type AgentResponse } from "./counsellorAgent";
export { counsellorAgent };

// ──────────────────────────────────────────────
// Hybrid RAG Query Execution Engine
// ──────────────────────────────────────────────
export async function processRAGQuery(
  userQuery: string,
  profile?: StudentProfileContext,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<GroundedRAGResponse> {
  const agentRes: AgentResponse = await counsellorAgent.processQuery(userQuery, history, profile);

  // Map Agent intent to QueryCategory for backwards compatibility
  const categoryMap: Record<string, QueryCategory> = {
    GENERAL_TNEA: "GENERAL_TNEA_INFO",
    TNEA_ELIGIBILITY: "ELIGIBILITY",
    COUNSELLING_PROCEDURE: "COUNSELLING_PROCESS",
    CUTOFF_CALCULATION: "CUTOFF_QUERY",
    HISTORICAL_CUTOFF: "CUTOFF_QUERY",
    COLLEGE_SEARCH: "COLLEGE_INFO",
    COLLEGE_DETAILS: "COLLEGE_INFO",
    BRANCH_SEARCH: "BRANCH_INFO",
    BRANCH_AVAILABILITY: "BRANCH_INFO",
    RECOMMENDATION: "PERSONALIZED_RECOMMENDATION",
    PERSONALIZED_RECOMMENDATION: "PERSONALIZED_RECOMMENDATION",
    ML_PREDICTION: "ADMISSION_PREDICTION",
    COLLEGE_COMPARISON: "COLLEGE_COMPARISON",
    STUDENT_PROFILE: "STUDENT_PROFILE_QUERY",
    UPWARD_MOVEMENT: "UPWARD_MOVEMENT",
    GENERAL_CONVERSATION: "GENERAL_TNEA_INFO",
  };

  const category = categoryMap[agentRes.intent] || "GENERAL_TNEA_INFO";

  return {
    queryCategory: category,
    detectedLanguage: agentRes.detectedLanguage,
    answer: agentRes.answer,
    sources: agentRes.sources,
    predictionResult: agentRes.predictionResult,
    recommendations: agentRes.recommendations,
  };
}

// ──────────────────────────────────────────────
// Voice Engine STT & TTS Utilities
// ──────────────────────────────────────────────

export interface VoiceState {
  isListening: boolean;
  isPlaying: boolean;
  transcript: string;
  speechSynthesisSupported: boolean;
}

export function synthesizeSpeech(text: string, lang = "en-IN") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[*#_]/g, ""); // Strip markdown
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
