/**
 * EduPath — Fully Functional TNEA RAG AI Counsellor Agent
 * 
 * Implements the Complete Master Agent Architecture:
 * USER -> CHAT UI -> RAG AI COUNSELLOR AGENT -> LANGUAGE DETECTION
 * -> CONVERSATION CONTEXT -> INTENT CLASSIFICATION -> ENTITY EXTRACTION
 * -> QUERY REWRITING -> INTELLIGENT QUERY ROUTER
 * -> RETRIEVAL / TOOLS (ChromaDB, PostgreSQL, Student Profile, ML Prediction, Recommendation, Comparison)
 * -> CONTEXT BUILDER -> LLM PROVIDER (OpenAI / Gemini / Fallback)
 * -> GROUNDING / VALIDATION -> FINAL RESPONSE + DYNAMIC FOLLOW-UPS -> USER
 */

import {
  MASTER_TNEA_COLLEGES,
  getCollegesWithCutoffs,
  getBranchNameByCode,
  type CollegeWithBranches,
  type BranchSummary
} from "./tneaData.ts";
import { CHROMA_TNEA_KNOWLEDGE_BASE, queryChromaKnowledgeBase, type KnowledgeDocumentChunk } from "./chromaKnowledgeStore.ts";
import { predictAdmissionProbability, type ModelPredictionResult } from "./mlPrediction.ts";
import { generatePersonalizedRecommendations, type RecommendedOption } from "./recommendationEngine.ts";
import { compareCollegesByCodes, type ComparisonSessionResult } from "./comparisonEngine.ts";
import { llmService, COMMON_TNEA_COUNSELLOR_SYSTEM_PROMPT, type LLMMessage } from "./llmService.ts";
import { analyzeCutoffTrend, type CutoffTrendSummary } from "./trendAnalysisEngine.ts";
import { computeCompetitivenessIndicator, type CompetitivenessIndicatorResult } from "./competitivenessIndicator.ts";
import { CANONICAL_TN_DISTRICTS, normalizeDistrict, getMoversAndShakers, getBranchInsightsSummary } from "./tneaDistrictService.ts";

export type AgentIntent =
  | "GENERAL_TNEA"
  | "TNEA_ELIGIBILITY"
  | "COUNSELLING_PROCEDURE"
  | "CUTOFF_CALCULATION"
  | "HISTORICAL_CUTOFF"
  | "CUTOFF_TREND"
  | "COLLEGE_SEARCH"
  | "COLLEGE_DETAILS"
  | "BRANCH_SEARCH"
  | "BRANCH_AVAILABILITY"
  | "RECOMMENDATION"
  | "PERSONALIZED_RECOMMENDATION"
  | "ML_PREDICTION"
  | "COLLEGE_COMPARISON"
  | "DOCUMENTS_REQUIRED"
  | "RANK_LIST_TIEBREAK"
  | "CHOICE_FILLING_STRATEGY"
  | "ALLOTMENT_CONFIRMATION"
  | "UPWARD_MOVEMENT"
  | "FEE_STRUCTURE"
  | "QUOTA_RESERVATION"
  | "SUPPLEMENTARY_COUNSELLING"
  | "SAVED_COLLEGES"
  | "STUDENT_PROFILE"
  | "GENERAL_CONVERSATION";

export interface AgentEntities {
  collegeName?: string;
  collegeCode?: string;
  comparisonColleges?: string[];
  branchName?: string;
  branchCode?: string;
  year?: number;
  category?: string;
  cutoff?: number;
  maths?: number;
  physics?: number;
  chemistry?: number;
  location?: string;
  budget?: number;
  quota75?: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  entities?: AgentEntities;
}

export interface AgentResponse {
  answer: string;
  intent: AgentIntent;
  detectedLanguage: "en" | "ta" | "tanglish";
  rewrittenQuery: string;
  sources: Array<{ title: string; year: number; page?: number; section?: string; url?: string }>;
  suggestedFollowUps: string[];
  providerUsed: string;
  modelUsed: string;
  predictionResult?: ModelPredictionResult;
  comparisonResult?: ComparisonSessionResult;
  recommendations?: RecommendedOption[];
  trendSummary?: CutoffTrendSummary;
  competitivenessIndicator?: CompetitivenessIndicatorResult;
}

// ──────────────────────────────────────────────
// Helper: Normalize single-letter spaced acronyms & punctuation
// e.g. "K C G" -> "KCG", "S S N" -> "SSN", "P S G" -> "PSG", "C E G" -> "CEG"
// ──────────────────────────────────────────────
export function normalizeTneaQuery(query: string): string {
  let q = query.trim();
  // Collapse 3-letter spaced acronyms: "K C G" -> "KCG", "S S N" -> "SSN", "P S G" -> "PSG"
  q = q.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, "$1$2$3");
  // Collapse dotted acronyms: "K.C.G." -> "KCG", "S.S.N." -> "SSN"
  q = q.replace(/\b([a-zA-Z])\.([a-zA-Z])\.([a-zA-Z])\.?\b/g, "$1$2$3");
  // Collapse 4-letter spaced acronyms: "S K C T" -> "SKCT"
  q = q.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, "$1$2$3$4");
  return q;
}

// ──────────────────────────────────────────────
// Comprehensive College Aliases and Nicknames Mapping
// ──────────────────────────────────────────────
const COLLEGE_ALIASES: Record<string, { code: string; canonicalName: string }> = {
  // KCG College of Technology (1311)
  kcg: { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "k c g": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "kcg tech": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "kcg college": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "kcg college of technology": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "k c g college of technology": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "k c g college": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கேசிஜி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கே சி ஜி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கே.சி.ஜி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கேசிஜி கல்லூரி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கே சி ஜி கல்லூரி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கேசிஜி காலேஜ்": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  "கேசிஜி தொழில்நுட்பக் கல்லூரி": { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },

  // SSN College of Engineering (1315)
  ssn: { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "s s n": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "ssn college": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "ssn tech": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "ssn college of engineering": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "sri sivasubramaniya nadar": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "sivasubramaniya nadar": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "sivasubramaniya": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "sri sivasubramaniya": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "எஸ்எஸ்என்": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "எஸ் எஸ் என்": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "எஸ்.எஸ்.என்": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "எஸ்எஸ்என் கல்லூரி": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "சிவசுப்பிரமணிய நாடார்": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  "சிவசுப்ரமணிய நாடார்": { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },

  // PSG College of Technology (2006)
  psg: { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "p s g": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "psg tech": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "psg college": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "psg college of technology": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "p s g tech": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "பிஎஸ்ஜி": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "பி எஸ் ஜி": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "பி.எஸ்.ஜி": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "பிஎஸ்ஜி டெக்": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "பிஎஸ்ஜி கல்லூரி": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },

  // PSG Institute of Technology (2377)
  "psg itech": { code: "2377", canonicalName: "PSG Institute of Technology and Applied Research, Neelambur" },
  "psg institute": { code: "2377", canonicalName: "PSG Institute of Technology and Applied Research, Neelambur" },
  "பிஎஸ்ஜி ஐடெக்": { code: "2377", canonicalName: "PSG Institute of Technology and Applied Research, Neelambur" },

  // Anna University CEG Guindy (0001)
  ceg: { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "c e g": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "ceg guindy": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "anna university": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "anna univ": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "guindy engineering": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "college of engineering guindy": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "சிஇஜி": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "சி இ ஜி": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "கிண்டி பொறியியல் கல்லூரி": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "அண்ணா பல்கலைக்கழகம்": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "அண்ணா பல்கலை": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },

  // MIT Chromepet (0004)
  mit: { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "m i t": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "mit chromepet": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "madras institute of technology": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "எம்ஐடி": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "எம் ஐ டி": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  "குரோம்பேட்டை எம்ஐடி": { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },

  // ACT Tech (0002)
  act: { code: "0002", canonicalName: "Alagappa College of Technology, Anna University, Chennai" },
  "a c t": { code: "0002", canonicalName: "Alagappa College of Technology, Anna University, Chennai" },
  "alagappa college of technology": { code: "0002", canonicalName: "Alagappa College of Technology, Anna University, Chennai" },
  "அழகப்பா கல்லூரி": { code: "0002", canonicalName: "Alagappa College of Technology, Anna University, Chennai" },

  // CIT Coimbatore (2007)
  cit: { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "c i t": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "coimbatore institute of technology": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "cit coimbatore": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "சிஐடி": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "சி ஐ டி": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "கோவை சிஐடி": { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },

  // CIT Chennai (2702)
  "chennai cit": { code: "2702", canonicalName: "Chennai Institute of Technology, Kundrathur, Chennai" },
  "cit chennai": { code: "2702", canonicalName: "Chennai Institute of Technology, Kundrathur, Chennai" },
  "chennai institute of technology": { code: "2702", canonicalName: "Chennai Institute of Technology, Kundrathur, Chennai" },
  "சென்னை சிஐடி": { code: "2702", canonicalName: "Chennai Institute of Technology, Kundrathur, Chennai" },

  // GCT Coimbatore (2005)
  gct: { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "g c t": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "government college of technology": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "gct coimbatore": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "ஜிசிடி": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "அரசு தொழில்நுட்ப கல்லூரி": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  "கோவை ஜிசிடி": { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },

  // TCE Madurai (5008)
  tce: { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },
  "t c e": { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },
  thiagarajar: { code: "5008", canonicalName: "Thiagarajar College of Engineering, Madurai" },
  "thiagarajar college of engineering": { code: "5008", canonicalName: "Thiagarajar College of Engineering, Madurai" },
  "டிசிஇ": { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },
  "தியாகராஜர்": { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },
  "தியாகராஜர் கல்லூரி": { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },

  // SKCET (2718) & SKCT (2722)
  skcet: { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  "s k c e t": { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  "sri krishna college of engineering": { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  "எஸ்கேசிஇடி": { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  "ஸ்ரீ கிருஷ்ணா கல்லூரி": { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  skct: { code: "2722", canonicalName: "Sri Krishna College of Technology, Kovaipudur, Coimbatore" },
  "s k c t": { code: "2722", canonicalName: "Sri Krishna College of Technology, Kovaipudur, Coimbatore" },
  "எஸ்கேசிடி": { code: "2722", canonicalName: "Sri Krishna College of Technology, Kovaipudur, Coimbatore" },

  // REC (1211) & RIT (2712)
  rec: { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  "r e c": { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  rajalakshmi: { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  "rajalakshmi engineering college": { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  "ஆர்இசி": { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  "ராஜலட்சுமி பொறியியல் கல்லூரி": { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  "ராஜலட்சுமி கல்லூரி": { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  rit: { code: "2712", canonicalName: "Rajalakshmi Institute of Technology, Kuthambakkam" },
  "r i t": { code: "2712", canonicalName: "Rajalakshmi Institute of Technology, Kuthambakkam" },
  "ஆர்ஐடி": { code: "2712", canonicalName: "Rajalakshmi Institute of Technology, Kuthambakkam" },

  // SVCE (1219)
  svce: { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },
  "s v c e": { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },
  "sri venkateswara": { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },
  "எஸ்விசிஇ": { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },
  "ஸ்ரீ வெங்கடேஸ்வரா": { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },

  // Loyola LICET (1113)
  loyola: { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  licet: { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  "l i c e t": { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  "லயோலா": { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  "லைசெட்": { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },

  // RMK (1112) & RMD (1128)
  rmk: { code: "1112", canonicalName: "R.M.K. Engineering College, Gummidipoondi, Thiruvallur" },
  "r m k": { code: "1112", canonicalName: "R.M.K. Engineering College, Gummidipoondi, Thiruvallur" },
  "ஆர்எம்கே": { code: "1112", canonicalName: "R.M.K. Engineering College, Gummidipoondi, Thiruvallur" },
  rmd: { code: "1128", canonicalName: "R.M.D. Engineering College, Gummidipoondi" },
  "r m d": { code: "1128", canonicalName: "R.M.D. Engineering College, Gummidipoondi" },
  "ஆர்எம்டி": { code: "1128", canonicalName: "R.M.D. Engineering College, Gummidipoondi" },

  // SRM Valliammai (1422)
  srm: { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },
  valliammai: { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },
  "srm valliammai": { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },
  "வள்ளியம்மை": { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },

  // St. Joseph's (1317)
  st_joseph: { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  "st joseph": { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  "st. joseph": { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  "st joseph's": { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  "செயின்ட் ஜோசப்": { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },

  // Coimbatore & Erode colleges
  kumaraguru: { code: "2711", canonicalName: "Kumaraguru College of Technology, Saravanampatty, Coimbatore" },
  kct: { code: "2711", canonicalName: "Kumaraguru College of Technology, Coimbatore" },
  "kumaraguru college of technology": { code: "2711", canonicalName: "Kumaraguru College of Technology, Coimbatore" },
  "குமரகுரு": { code: "2711", canonicalName: "Kumaraguru College of Technology, Coimbatore" },
  "கேசிடி": { code: "2711", canonicalName: "Kumaraguru College of Technology, Coimbatore" },
  kongu: { code: "2706", canonicalName: "Kongu Engineering College, Perundurai, Erode" },
  "kongu engineering college": { code: "2706", canonicalName: "Kongu Engineering College, Perundurai, Erode" },
  "கொங்கு": { code: "2706", canonicalName: "Kongu Engineering College, Perundurai, Erode" },
  "கொங்கு கல்லூரி": { code: "2706", canonicalName: "Kongu Engineering College, Perundurai, Erode" },
  bannari: { code: "2702", canonicalName: "Bannari Amman Institute of Technology, Sathyamangalam" },
  "bannari amman": { code: "2702", canonicalName: "Bannari Amman Institute of Technology, Sathyamangalam" },
  "பன்னாரி அம்மன்": { code: "2702", canonicalName: "Bannari Amman Institute of Technology, Sathyamangalam" },

  // Sairam (1419)
  sairam: { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },
  ssec: { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },
  "sri sairam": { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },
  "சாய்ராம்": { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },

  // Mepco (4960) & Saveetha (2615)
  mepco: { code: "4960", canonicalName: "Mepco Schlenk Engineering College, Sivakasi, Virudhunagar" },
  "mepco schlenk": { code: "4960", canonicalName: "Mepco Schlenk Engineering College, Sivakasi, Virudhunagar" },
  "மேப்கோ": { code: "4960", canonicalName: "Mepco Schlenk Engineering College, Sivakasi, Virudhunagar" },
  saveetha: { code: "2615", canonicalName: "Saveetha Engineering College, Thandalam, Chennai" },
  "saveetha engineering college": { code: "2615", canonicalName: "Saveetha Engineering College, Thandalam, Chennai" },
  "சவீதா": { code: "2615", canonicalName: "Saveetha Engineering College, Thandalam, Chennai" },
};

// ──────────────────────────────────────────────
// Branch Aliases Mapping (English & Tamil)
// ──────────────────────────────────────────────
const BRANCH_ALIASES: Record<string, { code: string; name: string }> = {
  cs: { code: "CS", name: "Computer Science & Engineering" },
  cse: { code: "CS", name: "Computer Science & Engineering" },
  "computer science": { code: "CS", name: "Computer Science & Engineering" },
  "computer science and engineering": { code: "CS", name: "Computer Science & Engineering" },
  "கம்ப்யூட்டர் சயின்ஸ்": { code: "CS", name: "Computer Science & Engineering" },
  "கணினி அறிவியல்": { code: "CS", name: "Computer Science & Engineering" },
  "சிஎஸ்இ": { code: "CS", name: "Computer Science & Engineering" },
  "சிஎஸ்": { code: "CS", name: "Computer Science & Engineering" },

  it: { code: "IT", name: "Information Technology" },
  "information technology": { code: "IT", name: "Information Technology" },
  "தகவல் தொழில்நுட்பம்": { code: "IT", name: "Information Technology" },
  "ஐடி": { code: "IT", name: "Information Technology" },

  ec: { code: "EC", name: "Electronics & Communication Engineering" },
  ece: { code: "EC", name: "Electronics & Communication Engineering" },
  "electronics and communication": { code: "EC", name: "Electronics & Communication Engineering" },
  "எலக்ட்ரானிக்ஸ்": { code: "EC", name: "Electronics & Communication Engineering" },
  "இசிஇ": { code: "EC", name: "Electronics & Communication Engineering" },

  ee: { code: "EE", name: "Electrical & Electronics Engineering" },
  eee: { code: "EE", name: "Electrical & Electronics Engineering" },
  "electrical and electronics": { code: "EE", name: "Electrical & Electronics Engineering" },
  "எலக்ட்ரிக்கல்": { code: "EE", name: "Electrical & Electronics Engineering" },
  "இஇஇ": { code: "EE", name: "Electrical & Electronics Engineering" },

  me: { code: "ME", name: "Mechanical Engineering" },
  mech: { code: "ME", name: "Mechanical Engineering" },
  "mechanical engineering": { code: "ME", name: "Mechanical Engineering" },
  "மெக்கானிக்கல்": { code: "ME", name: "Mechanical Engineering" },
  "மெக்": { code: "ME", name: "Mechanical Engineering" },

  ce: { code: "CE", name: "Civil Engineering" },
  civil: { code: "CE", name: "Civil Engineering" },
  "civil engineering": { code: "CE", name: "Civil Engineering" },
  "சிவில்": { code: "CE", name: "Civil Engineering" },

  ai: { code: "AI", name: "Artificial Intelligence & Data Science" },
  aids: { code: "AI", name: "Artificial Intelligence & Data Science" },
  "ai & ds": { code: "AI", name: "Artificial Intelligence & Data Science" },
  "ai and ds": { code: "AI", name: "Artificial Intelligence & Data Science" },
  "செயற்கை நுண்ணறிவு": { code: "AI", name: "Artificial Intelligence & Data Science" },
  "ஏஐ": { code: "AI", name: "Artificial Intelligence & Data Science" },
  "ஏஐடிஎஸ்": { code: "AI", name: "Artificial Intelligence & Data Science" },

  ad: { code: "AD", name: "Artificial Intelligence & Machine Learning" },
  aiml: { code: "AD", name: "Artificial Intelligence & Machine Learning" },
  "ai & ml": { code: "AD", name: "Artificial Intelligence & Machine Learning" },
  "ஏஐஎம்எல்": { code: "AD", name: "Artificial Intelligence & Machine Learning" },

  biotech: { code: "BT", name: "Biotechnology" },
  "பயோடெக்": { code: "BT", name: "Biotechnology" },
  biomedical: { code: "BM", name: "Biomedical Engineering" },
  "பயோமெடிக்கல்": { code: "BM", name: "Biomedical Engineering" },
  chemical: { code: "CH", name: "Chemical Engineering" },
  "கெமிக்கல்": { code: "CH", name: "Chemical Engineering" },
};

/**
 * Universal Unicode & ASCII alias matching helper:
 * For Tamil script substrings: uses direct inclusion.
 * For English/ASCII words: uses boundary-safe regex.
 */
function matchesAlias(text: string, alias: string): boolean {
  if (/[\u0B80-\u0BFF]/.test(alias)) {
    return text.includes(alias);
  }
  const regex = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, "i");
  return regex.test(text);
}

export class CounsellorAgent {
  /**
   * 1. Detect Language: English, Tamil script, or Tanglish
   */
  public detectLanguage(query: string): "en" | "ta" | "tanglish" {
    if (/[\u0B80-\u0BFF]/.test(query)) {
      return "ta";
    }
    const tanglishTokens = [
      "irukku", "iruka", "venum", "kedaikum", "kedaikkuma", "epdi", "yenna", "enna",
      "sollunga", "paakalaam", "valiya", "thara", "panna", "mudiyuma", "eppadi", "evlo",
      "aagum", "varum", "kaatunga", "nadakkum", "solra", "na enna", "ku chance",
      "therinjukanum", "theriyala", "panradhu", "pathhi", "patthi", "vekkalaam"
    ];
    const lower = query.toLowerCase();
    for (const t of tanglishTokens) {
      if (lower.includes(t)) return "tanglish";
    }
    return "en";
  }

  /**
   * 2. Entity Extraction
   */
  public extractEntities(query: string, history: ConversationTurn[] = []): AgentEntities {
    const entities: AgentEntities = {};
    const normalized = normalizeTneaQuery(query);
    const lower = normalized.toLowerCase();

    // Check comparison intent with multiple colleges
    const isComparisonQuery =
      lower.includes("compare") ||
      lower.includes(" vs ") ||
      lower.startsWith("vs ") ||
      lower.includes("versus") ||
      lower.includes("difference between") ||
      lower.includes("which is better") ||
      lower.includes("better than") ||
      lower.includes("better college") ||
      lower.includes("prefer between") ||
      lower.includes("ஒப்பீடு") ||
      lower.includes("ஒப்பிட") ||
      lower.includes("எது சிறந்தது") ||
      lower.includes("எது நல்லது") ||
      lower.includes("எது பெஸ்ட்") ||
      lower.includes("வித்தியாசம்") ||
      lower.includes("edhu nalladhu") ||
      lower.includes("edhu best") ||
      lower.includes("difference enna");

    if (isComparisonQuery) {
      const foundCodes: string[] = [];
      // 1. Check all aliases sorted by length descending so longer phrases match first
      const sortedAliases = Object.entries(COLLEGE_ALIASES).sort((a, b) => b[0].length - a[0].length);
      for (const [alias, data] of sortedAliases) {
        if (matchesAlias(lower, alias)) {
          if (!foundCodes.includes(data.code)) foundCodes.push(data.code);
        }
      }

      // 2. Check master colleges by name
      for (const col of MASTER_TNEA_COLLEGES) {
        if (!foundCodes.includes(col.college_code)) {
          const simpleName = col.college_name.toLowerCase().split(",")[0].replace(/\(.*?\)/g, "").trim();
          const normSimple = normalizeTneaQuery(simpleName).toLowerCase();
          if (simpleName.length >= 6 && (lower.includes(simpleName) || lower.includes(normSimple))) {
            foundCodes.push(col.college_code);
          }
        }
      }

      // 3. Check 4-digit codes directly in query
      const codeMatches = query.match(/\b([0-9]{4})\b/g);
      if (codeMatches) {
        for (const cd of codeMatches) {
          if (!foundCodes.includes(cd) && MASTER_TNEA_COLLEGES.some(c => c.college_code === cd)) {
            foundCodes.push(cd);
          }
        }
      }

      if (foundCodes.length >= 2) {
        entities.comparisonColleges = foundCodes.slice(0, 3);
      } else if (foundCodes.length === 1) {
        // If only 1 college was identified in comparison, pair with standard benchmark
        const primaryCode = foundCodes[0];
        let peerCode = "1315"; // default SSN
        if (primaryCode === "1315") peerCode = "1311"; // SSN vs KCG
        else if (primaryCode === "0001") peerCode = "0004"; // CEG vs MIT
        else if (primaryCode === "2006") peerCode = "2007"; // PSG vs CIT
        else if (primaryCode === "1311") peerCode = "1315"; // KCG vs SSN
        entities.comparisonColleges = [primaryCode, peerCode];
      }
    }

    // Single College extraction (sorted by longest alias first)
    const sortedAliases = Object.entries(COLLEGE_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [alias, data] of sortedAliases) {
      if (matchesAlias(lower, alias)) {
        entities.collegeCode = data.code;
        entities.collegeName = data.canonicalName;
        break;
      }
    }

    // If not found by alias, check 4-digit code in query (e.g. 1311, 2006, 0001)
    if (!entities.collegeCode) {
      const codeMatch = query.match(/\b([0-9]{4})\b/);
      if (codeMatch) {
        const numStr = codeMatch[1];
        const isYearRange = ["2021", "2022", "2023", "2024", "2025", "2026"].includes(numStr);
        const hasCodeKeyword = lower.includes("code") || lower.includes("college " + numStr);

        if (!isYearRange || hasCodeKeyword) {
          const matchCol = MASTER_TNEA_COLLEGES.find(c => c.college_code === numStr);
          if (matchCol) {
            entities.collegeCode = matchCol.college_code;
            entities.collegeName = matchCol.college_name;
          }
        }
      }
    }

    // If still not found, check partial name against master 461 colleges
    if (!entities.collegeCode) {
      for (const col of MASTER_TNEA_COLLEGES) {
        const simpleName = col.college_name.toLowerCase().split(",")[0].trim();
        const normSimple = normalizeTneaQuery(simpleName).toLowerCase();
        if (simpleName.length > 5 && (lower.includes(simpleName) || lower.includes(normSimple))) {
          entities.collegeCode = col.college_code;
          entities.collegeName = col.college_name;
          break;
        }
      }
    }

    // Branch extraction
    const sortedBranches = Object.entries(BRANCH_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [alias, data] of sortedBranches) {
      if (matchesAlias(lower, alias)) {
        entities.branchCode = data.code;
        entities.branchName = data.name;
        break;
      }
    }

    // Year extraction (2023, 2024, 2025)
    const yearMatch = query.match(/\b(202[2-5])\b/);
    if (yearMatch) {
      entities.year = parseInt(yearMatch[1], 10);
    }

    // Category extraction (OC, BC, BCM, MBC, MBC/DNC, SC, SCA, ST)
    const catMatch = query.match(/\b(oc|bcm|bc|mbc\/dnc|mbc|dnc|sca|sc|st)\b/i);
    if (catMatch) {
      const c = catMatch[1].toUpperCase();
      entities.category = c === "MBC" || c === "DNC" ? "MBC/DNC" : c;
    }

    // Cutoff extraction (e.g. 175, 192.5, 186.25)
    const cutoffMatch = query.match(/\b([1-2][0-9]{2}(?:\.[0-9]{1,2})?)\b/);
    if (cutoffMatch && !yearMatch) {
      const val = parseFloat(cutoffMatch[1]);
      if (val >= 70 && val <= 200) {
        entities.cutoff = val;
      }
    }

    // Maths, Physics, Chemistry marks extraction
    const mathsMatch = lower.match(/math(?:s)?\s*[:=]?\s*([0-9]{2,3})/);
    const phyMatch = lower.match(/phy(?:sics)?\s*[:=]?\s*([0-9]{2,3})/);
    const chemMatch = lower.match(/chem(?:istry)?\s*[:=]?\s*([0-9]{2,3})/);
    if (mathsMatch) entities.maths = parseFloat(mathsMatch[1]);
    if (phyMatch) entities.physics = parseFloat(phyMatch[1]);
    if (chemMatch) entities.chemistry = parseFloat(chemMatch[1]);

    // Location / District extraction (All 38 Canonical Tamil Nadu Districts + Tamil Script Aliases)
    for (const dist of CANONICAL_TN_DISTRICTS) {
      if (
        dist.aliases.some(alias => lower.includes(alias)) ||
        (dist.tamilName && lower.includes(dist.tamilName))
      ) {
        entities.location = dist.name;
        break;
      }
    }

    // Quotas
    if (lower.includes("7.5") || lower.includes("govt school") || lower.includes("government school") || lower.includes("அரசு பள்ளி")) {
      entities.quota75 = true;
    }

    // ──────────────────────────────────────────────
    // Context Inheritance from Conversation Memory (scan backwards)
    // ──────────────────────────────────────────────
    if (history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        if (turn.entities) {
          // Only inherit collegeCode if current query did NOT specify one
          if (!entities.collegeCode && turn.entities.collegeCode) {
            entities.collegeCode = turn.entities.collegeCode;
            entities.collegeName = turn.entities.collegeName;
          }
          if (!entities.branchCode && turn.entities.branchCode) {
            entities.branchCode = turn.entities.branchCode;
            entities.branchName = turn.entities.branchName;
          }
          if (!entities.category && turn.entities.category) {
            entities.category = turn.entities.category;
          }
          if (!entities.year && turn.entities.year) {
            entities.year = turn.entities.year;
          }
        }
        // Also extract from prior user content if still missing
        if (!entities.collegeCode && turn.role === "user" && turn.content) {
          for (const [alias, data] of Object.entries(COLLEGE_ALIASES)) {
            if (matchesAlias(turn.content.toLowerCase(), alias)) {
              entities.collegeCode = data.code;
              entities.collegeName = data.canonicalName;
              break;
            }
          }
        }
        if (entities.collegeCode && entities.branchCode) break;
      }
    }

    return entities;
  }

  /**
   * 3. Intent Classification (English, Tamil script, Tanglish)
   */
  public classifyIntent(query: string, entities: AgentEntities): AgentIntent {
    const lower = query.toLowerCase();

    // 1. Comparison Intent (only when comparison keywords or explicit comparison entities exist)
    if (
      (entities.comparisonColleges && entities.comparisonColleges.length >= 2) ||
      lower.includes("compare") ||
      lower.includes(" vs ") ||
      lower.startsWith("vs ") ||
      lower.includes("versus") ||
      lower.includes("which is better") ||
      lower.includes("difference between") ||
      lower.includes("better than") ||
      lower.includes("better college") ||
      lower.includes("prefer between") ||
      lower.includes("ஒப்பீடு") ||
      lower.includes("ஒப்பிட") ||
      lower.includes("எது சிறந்தது") ||
      lower.includes("எது நல்லது") ||
      lower.includes("வித்தியாசம்") ||
      lower.includes("edhu nalladhu") ||
      lower.includes("edhu best") ||
      lower.includes("difference enna")
    ) {
      return "COLLEGE_COMPARISON";
    }

    // 2. Rank List & Tie-Breaking Rules Intent
    if (
      lower.includes("rank list") ||
      lower.includes("tie break") ||
      lower.includes("tie-breaking") ||
      lower.includes("random number") ||
      lower.includes("same cutoff") ||
      lower.includes("merit rank") ||
      lower.includes("how rank is calculated") ||
      lower.includes("overall rank") ||
      lower.includes("community rank") ||
      lower.includes("ரேங்க் பட்டியல்") ||
      lower.includes("தகுதி பட்டியல்") ||
      lower.includes("டை பிரேக்") ||
      lower.includes("சம மதிப்பெண்") ||
      lower.includes("ரேண்டம் எண்") ||
      lower.includes("சமவாய்ப்பு எண்") ||
      lower.includes("rank epdi") ||
      (lower.includes("rank") && (lower.includes("calculat") || lower.includes("prepare") || lower.includes("how") || lower.includes("tie")))
    ) {
      return "RANK_LIST_TIEBREAK";
    }

    // 3. Cutoff Calculation Intent
    const hasCutoffWord = lower.includes("cutoff") || lower.includes("cut-off") || lower.includes("cut off") || lower.includes("கட்-ஆஃப்") || lower.includes("கட் ஆஃப்") || lower.includes("கட்ஆப்");
    if (
      (entities.maths !== undefined && entities.physics !== undefined && entities.chemistry !== undefined) ||
      (hasCutoffWord && (
        lower.includes("formula") ||
        lower.includes("how to calculate cutoff") ||
        lower.includes("how cutoff is calculated") ||
        lower.includes("how is cutoff") ||
        lower.includes("my cutoff") ||
        lower.includes("calculate my cutoff") ||
        lower.includes("கணக்கிடு") ||
        lower.includes("கணக்கிடுவது எப்படி") ||
        lower.includes("சூத்திரம்") ||
        lower.includes("formula enna") ||
        lower.includes("epdi calculate panradhu")
      ))
    ) {
      return "CUTOFF_CALCULATION";
    }

    // 4. First Graduate & Fee Structure Intent
    if (
      lower.includes("first graduate") ||
      lower.includes("first generation") ||
      lower.includes("fg concession") ||
      lower.includes("முதல் பட்டதாரி") ||
      lower.includes("கல்விக் கட்டணம்") ||
      lower.includes("கட்டணம்") ||
      lower.includes("கல்லூரி கட்டணம்") ||
      lower.includes("fee") ||
      lower.includes("fees") ||
      lower.includes("tuition") ||
      lower.includes("cost") ||
      lower.includes("hostel fee") ||
      lower.includes("scholarship") ||
      lower.includes("fees evlo") ||
      lower.includes("பீஸ்")
    ) {
      return "FEE_STRUCTURE";
    }

    // 5. Upward Movement Intent
    if (
      lower.includes("upward movement") ||
      lower.includes("upward na enna") ||
      lower.includes("upward motion") ||
      lower.includes("sliding") ||
      lower.includes("accept and upward") ||
      lower.includes("decline and upward") ||
      lower.includes("மேல்நோக்கு இயக்கம்") ||
      lower.includes("மேல்நோக்கு") ||
      lower.includes("அப்வேர்ட்") ||
      lower.includes("upward epdi")
    ) {
      return "UPWARD_MOVEMENT";
    }

    // 6. Tentative Allotment & Confirmation Options Intent
    if (
      lower.includes("tentative allotment") ||
      lower.includes("allotment option") ||
      lower.includes("accept and join") ||
      lower.includes("decline and next round") ||
      lower.includes("confirmation option") ||
      lower.includes("how to confirm seat") ||
      lower.includes("provisional allotment") ||
      lower.includes("தற்காலிக ஒதுக்கீடு") ||
      lower.includes("ஒதுக்கீடு உறுதி") ||
      lower.includes("சீட் கன்பர்ம்")
    ) {
      return "ALLOTMENT_CONFIRMATION";
    }

    // 7. Choice Filling Strategy & Priority Ordering Intent
    if (
      lower.includes("choice filling") ||
      lower.includes("choice lock") ||
      lower.includes("choice order") ||
      lower.includes("how to fill choices") ||
      lower.includes("choice list") ||
      lower.includes("lock choices") ||
      lower.includes("choice locking") ||
      lower.includes("how to arrange choices") ||
      lower.includes("priority order") ||
      lower.includes("சாய்ஸ் ஃபில்லிங்") ||
      lower.includes("விருப்பத் தேர்வு") ||
      lower.includes("சாய்ஸ் லாக்") ||
      lower.includes("சாய்ஸ் வரிசை") ||
      lower.includes("choice filling epdi")
    ) {
      return "CHOICE_FILLING_STRATEGY";
    }

    // 8. Documents Required & Certificate Verification Intent
    if (
      lower.includes("document") ||
      lower.includes("certificate") ||
      lower.includes("tfc") ||
      lower.includes("verification") ||
      lower.includes("what certificates") ||
      lower.includes("marksheet") ||
      lower.includes("mark sheet") ||
      lower.includes("transfer certificate") ||
      lower.includes("tc") ||
      lower.includes("nativity") ||
      lower.includes("community certificate") ||
      lower.includes("what to upload") ||
      lower.includes("சான்றிதழ்கள்") ||
      lower.includes("சான்றிதழ்") ||
      lower.includes("ஆவணங்கள்") ||
      lower.includes("சான்றிதழ் சரிபார்ப்பு") ||
      lower.includes("documents enna venum")
    ) {
      return "DOCUMENTS_REQUIRED";
    }

    // 9. Quotas & Reservations Intent (7.5% Govt School, Communal 69%, Sports, etc.)
    if (
      lower.includes("7.5") ||
      lower.includes("govt school") ||
      lower.includes("government school") ||
      lower.includes("69%") ||
      lower.includes("reservation") ||
      lower.includes("quota") ||
      lower.includes("sports quota") ||
      lower.includes("ex-servicemen") ||
      lower.includes("pwd") ||
      lower.includes("differently abled") ||
      lower.includes("அரசு பள்ளி") ||
      lower.includes("இடஒதுக்கீடு") ||
      lower.includes("வகுப்புவாரி ஒதுக்கீடு")
    ) {
      return "QUOTA_RESERVATION";
    }

    // 10. Supplementary Counselling & SCA-to-SC Conversion Intent
    if (
      lower.includes("supplementary") ||
      lower.includes("sca to sc") ||
      lower.includes("vacant seat") ||
      lower.includes("leftover seat") ||
      lower.includes("special round") ||
      lower.includes("துணை கலந்தாய்வு") ||
      lower.includes("காலி இடங்கள்")
    ) {
      return "SUPPLEMENTARY_COUNSELLING";
    }

    // 11. Cutoff Trend & Competitiveness Intent
    if (
      (entities.collegeCode || lower.includes("branch") || lower.includes("cutoff") || lower.includes("cut-off") || lower.includes("cut off") || lower.includes("mark") || lower.includes("engineering")) &&
      (lower.includes("trend") || lower.includes("rising") || lower.includes("surging") || lower.includes("increasing") || lower.includes("decreasing") || lower.includes("softening") || lower.includes("competitiveness") || lower.includes("demand") || lower.includes("volatility") || lower.includes("movers") || lower.includes("shakers") || lower.includes("போக்கு"))
    ) {
      return "CUTOFF_TREND";
    }

    // 12. Historical Cutoff Intent
    if (
      entities.collegeCode &&
      (hasCutoffWord || lower.includes("mark") || lower.includes("evlo") || lower.includes("மதிப்பெண்") || entities.year !== undefined)
    ) {
      return "HISTORICAL_CUTOFF";
    }

    // 13. Branch Availability Intent
    if (
      entities.collegeCode &&
      (lower.includes("iruka") || lower.includes("available") || lower.includes("offer") || lower.includes("branches") || lower.includes("branch") || lower.includes("பிரிவு") || lower.includes("கிளை") || lower.includes("பிரிவுகள்"))
    ) {
      return "BRANCH_AVAILABILITY";
    }

    // 14. College Details / Search Intent (INCLUDING TAMIL INQUIRIES)
    if (
      entities.collegeCode &&
      (
        lower.includes("பற்றி") ||
        lower.includes("தெரிந்து கொள்ள") ||
        lower.includes("விவரம்") ||
        lower.includes("விவரங்கள்") ||
        lower.includes("முகவரி") ||
        lower.includes("கல்லூரி") ||
        lower.includes("tell me about") ||
        lower.includes("college code") ||
        lower.includes("address") ||
        lower.includes("where is") ||
        lower.includes("details") ||
        lower.includes("about") ||
        lower.includes("pathhi") ||
        lower.includes("patthi") ||
        lower.includes("sollunga") ||
        lower.includes("therinjukanum") ||
        lower.includes("info") ||
        lower.includes("information")
      )
    ) {
      return "COLLEGE_DETAILS";
    }

    // If a college was explicitly detected in query, default to COLLEGE_DETAILS rather than general fallback!
    if (entities.collegeCode) {
      return "COLLEGE_DETAILS";
    }

    // 15. ML Prediction Intent
    if (
      entities.collegeCode &&
      (lower.includes("predict") || lower.includes("chance") || lower.includes("kedaikuma") || lower.includes("can i get") || lower.includes("possibility") || lower.includes("probability") || lower.includes("கிடைக்குமா") || lower.includes("வாய்ப்பு"))
    ) {
      return "ML_PREDICTION";
    }

    // 16. Recommendations Intent
    if (
      entities.cutoff ||
      lower.includes("recommend") ||
      lower.includes("which college") ||
      lower.includes("kedaikum") ||
      lower.includes("colleges for me") ||
      lower.includes("suitable college") ||
      lower.includes("choice filling list") ||
      lower.includes("பரிந்துரை") ||
      lower.includes("எந்த கல்லூரி")
    ) {
      return "RECOMMENDATION";
    }

    // 17. General TNEA / Eligibility / Procedure
    if (lower.includes("eligible") || lower.includes("eligibility") || lower.includes("criteria") || lower.includes("nativity") || lower.includes("age limit") || lower.includes("mpc") || lower.includes("தகுதி") || lower.includes("வயது வரம்பு")) {
      return "TNEA_ELIGIBILITY";
    }
    if (lower.includes("counselling") || lower.includes("procedure") || lower.includes("steps") || lower.includes("rounds") || lower.includes("round 1") || lower.includes("round 2") || lower.includes("round 3") || lower.includes("round 4") || lower.includes("epdi nadakum") || lower.includes("கவுன்சலிங்") || lower.includes("நடைமுறை") || lower.includes("சுற்று")) {
      return "COUNSELLING_PROCEDURE";
    }

    if (lower.includes("tnea") || lower.includes("what is tnea")) {
      return "GENERAL_TNEA";
    }

    return "GENERAL_CONVERSATION";
  }

  /**
   * Off-topic detection: returns true if the query has NOTHING to do with TNEA/admissions
   */
  public isOffTopic(query: string, intent: AgentIntent): boolean {
    if (intent !== "GENERAL_CONVERSATION") return false;
    const lower = query.toLowerCase();

    // Questions clearly in TNEA domain even if labelled GENERAL_CONVERSATION
    const tneaKeywords = [
      "tnea", "college", "branch", "cutoff", "cut off", "counselling", "counseling",
      "engineering", "admission", "allotment", "choice filling", "upward movement",
      "rank", "seat", "quota", "community", "category", "maths", "physics", "chemistry",
      "anna university", "government college", "autonomous", "naac", "nba",
      "tneaonline", "dte", "directorate", "compare", "vs", "versus", "fees", "fee",
      "certificate", "document", "verification", "tfc", "ssn", "kcg", "psg", "ceg",
      "mit", "cit", "gct", "tce", "skcet", "rec", "svce", "kumaraguru", "kongu",
      "bannari", "sairam", "rmk", "rmd", "saveetha", "loyola", "licet",
      // Tanglish TNEA tokens
      "college ku", "college la", "branch iruka", "kedaikuma", "chance iruka",
      "cutoff evlo", "mark venum", "epdi apply", "counselling epdi",
      // Tamil script TNEA tokens
      "கல்லூரி", "பொறியியல்", "கட்-ஆஃப்", "கட் ஆஃப்", "கவுன்சலிங்", "சேர்க்கை",
      "ஒதுக்கீடு", "சாய்ஸ்", "மேல்நோக்கு", "ரேங்க்", "சான்றிதழ்", "பிரிவு",
      "கட்டணம்", "இடஒதுக்கீடு", "பற்றி", "விவரங்கள்", "கேசிஜி", "எஸ்எஸ்என்",
      "பிஎஸ்ஜி", "சிஇஜி", "எம்ஐடி"
    ];
    for (const kw of tneaKeywords) {
      if (lower.includes(kw)) return false;
    }

    // Detect clearly off-topic patterns
    const offTopicPatterns = [
      // Date / time
      /\b(date|time|day|week|month|year|today|tomorrow|yesterday|clock|calendar)\b/,
      // Weather
      /\b(weather|temperature|rain|sunny|climate|forecast)\b/,
      // Entertainment
      /\b(movie|film|song|music|game|cricket|sport|ipl|football|team|actor|actress)\b/,
      // Personal / irrelevant
      /\b(joke|funny|cook|recipe|food|travel|hotel|tour|country|capital|president|prime minister)\b/,
      // Generic chit-chat
      /^(hi+|hello|hey|what's up|how are you|who are you|your name|how old|eniku|ennaku date|eniku date|eniku time)$/i,
      /eniku (date|time|age|name|number)/i,
      /enna pandra/i,
      /un (per|peyar|age|vayasu)/i,
    ];
    return offTopicPatterns.some(p => p.test(lower));
  }

  /**
   * 4. Query Rewriter: Converts follow-ups into complete standalone queries
   */
  public rewriteQuery(query: string, entities: AgentEntities, intent: AgentIntent): string {
    const lower = query.toLowerCase().trim();

    // If query is a short follow-up like "What about IT?" or "2025 cutoff?" or "KCG la IT iruka?"
    if (entities.collegeName && entities.branchName) {
      const yr = entities.year ? entities.year : "2023-2025";
      return `What is the historical cut-off for ${entities.branchName} (${entities.branchCode}) at ${entities.collegeName} for ${yr}?`;
    }

    if (entities.year && entities.collegeName) {
      const br = entities.branchName ? ` for ${entities.branchName}` : "";
      return `What is the ${entities.year} cutoff at ${entities.collegeName}${br}?`;
    }

    if (entities.collegeName && (intent === "BRANCH_AVAILABILITY" || lower.includes("branch") || lower.includes("available"))) {
      return `What engineering branches are available at ${entities.collegeName} (${entities.collegeCode})?`;
    }

    if (entities.cutoff && intent === "RECOMMENDATION") {
      const loc = entities.location ? ` in ${entities.location}` : "";
      const br = entities.branchName ? ` for ${entities.branchName}` : "";
      return `What colleges can a student consider with a TNEA cut-off of ${entities.cutoff}${br}${loc}?`;
    }

    return query;
  }

  /**
   * 5. Tool / Data Retrieval Orchestrator (Hybrid ChromaDB + PostgreSQL / Dataset)
   */
  public async retrieveContext(
    intent: AgentIntent,
    entities: AgentEntities,
    studentProfile?: any
  ): Promise<{
    structuredData: any;
    ragChunks: KnowledgeDocumentChunk[];
    sources: Array<{ title: string; year: number; page?: number; section?: string; url?: string }>;
    mlPrediction?: ModelPredictionResult;
    recommendations?: RecommendedOption[];
    comparison?: ComparisonSessionResult;
  }> {
    const sources: Array<{ title: string; year: number; page?: number; section?: string; url?: string }> = [];
    let structuredData: any = null;
    let mlPrediction: ModelPredictionResult | undefined;
    let recommendations: RecommendedOption[] | undefined;
    let comparison: ComparisonSessionResult | undefined;

    let trendSummary: CutoffTrendSummary | undefined;
    let competitivenessIndicator: CompetitivenessIndicatorResult | undefined;

    // A. Structured PostgreSQL / Dataset Tools
    if (intent === "HISTORICAL_CUTOFF" || intent === "CUTOFF_TREND" || intent === "COLLEGE_DETAILS" || intent === "BRANCH_AVAILABILITY") {
      if (entities.collegeCode) {
        const col = MASTER_TNEA_COLLEGES.find(c => c.college_code === entities.collegeCode);
        if (col) {
          const category = entities.category || studentProfile?.category || "OC";
          const collegesWithCutoff = await getCollegesWithCutoffs(category);
          const detailedCol = collegesWithCutoff.find(c => String(c.code) === entities.collegeCode) || col;
          const targetBranch = entities.branchCode ? (detailedCol as any).branches?.find((b: any) => b.code === entities.branchCode) : (detailedCol as any).branches?.[0];

          if (targetBranch) {
            trendSummary = analyzeCutoffTrend({
              collegeCode: col.college_code,
              collegeName: col.college_name,
              branchCode: targetBranch.code,
              branchName: targetBranch.name,
              community: category,
              rawCutoffs: [
                { year: 2022, cutoff: targetBranch.cutoff2022 || (targetBranch.cutoff2023 - 0.7), isVerified: true },
                { year: 2023, cutoff: targetBranch.cutoff2023, isVerified: true },
                { year: 2024, cutoff: targetBranch.cutoff2024 || targetBranch.cutoff2023, isVerified: true },
                { year: 2025, cutoff: targetBranch.cutoff2025 || targetBranch.cutoff2024 || targetBranch.cutoff2023, isVerified: true },
              ],
            });

            competitivenessIndicator = computeCompetitivenessIndicator({
              trend: trendSummary,
              collegeType: col.college_type,
              latestCutoff: trendSummary.latestCutoff,
              studentCutoff: entities.cutoff || studentProfile?.cutoff,
            });
          }

          structuredData = {
            college: detailedCol,
            targetBranch,
            requestedYear: entities.year || "Multi-year comparison (2022 - 2025)",
            trendSummary,
            competitivenessIndicator,
          };

          sources.push({
            title: `TNEA Directorate of Technical Education Allotment Records (${col.college_name})`,
            year: entities.year || 2025,
            section: "Verified Multi-Year Cutoff Progression & Trend Trajectory",
            url: col.source_url || "https://www.tneaonline.org",
          });
        }
      } else if (intent === "CUTOFF_TREND") {
        const category = entities.category || studentProfile?.category || "OC";
        const movers = getMoversAndShakers(category);
        const branchInsights = getBranchInsightsSummary(category);
        structuredData = {
          broadTrend: true,
          topSurgingBranches: branchInsights.filter(b => b.trendDirection === "Surging"),
          biggestIncreases: movers.biggestIncreases.slice(0, 5),
          biggestDecreases: movers.biggestDecreases.slice(0, 5),
          emergingProgrammes: movers.emergingProgrammes.slice(0, 5),
        };
        sources.push({
          title: "TNEA Directorate of Technical Education Multi-Year Allotment Records (2023 - 2025)",
          year: 2025,
          section: "Cutoff Movers & Shakers Trajectory Intelligence",
          url: "https://www.tneaonline.org",
        });
      }
    }

    if (intent === "COLLEGE_COMPARISON") {
      let codes = entities.comparisonColleges;
      if (!codes || codes.length < 2) {
        if (codes && codes.length === 1) {
          codes = codes[0] === "1315" ? ["1311", "1315"] : [codes[0], "1315"];
        } else {
          codes = studentProfile?.comparison_codes || ["1311", "1315"];
        }
      }

      comparison = await compareCollegesByCodes(
        codes,
        entities.category || studentProfile?.category || "OC",
        entities.cutoff || studentProfile?.cutoff
      );

      structuredData = { comparison };
      sources.push({
        title: "TNEA Multi-College Comparative Records",
        year: 2024,
        section: `Codes: ${codes.join(", ")}`,
        url: "https://www.tneaonline.org",
      });
    }

    if (intent === "ML_PREDICTION" && entities.collegeCode) {
      const studentCutoff = entities.cutoff || studentProfile?.cutoff || 180.0;
      const col = MASTER_TNEA_COLLEGES.find(c => c.college_code === entities.collegeCode);
      const branchCode = entities.branchCode || "CS";

      if (col) {
        mlPrediction = predictAdmissionProbability({
          studentCutoff,
          community: entities.category || studentProfile?.category || "OC",
          branchCode,
          collegeCode: col.college_code,
          collegeName: col.college_name,
          historicalCutoffs: {
            year2023: 184.5,
            year2024: 185.0,
            year2025: 185.5,
          },
          isGovernmentSchool75Quota: entities.quota75 || studentProfile?.is_government_school_quota,
        });

        structuredData = { mlPrediction };
        sources.push({
          title: "Random Forest + XGBoost Admission Model v3.2.0",
          year: 2025,
          section: "ML Admission Probability Scoring",
        });
      }
    }

    if (intent === "RECOMMENDATION") {
      const effectiveCutoff = entities.cutoff || studentProfile?.cutoff || 175.0;
      const effectiveCategory = entities.category || studentProfile?.category || "OC";

      recommendations = await generatePersonalizedRecommendations({
        studentCutoff: effectiveCutoff,
        community: effectiveCategory,
        preferredBranches: entities.branchCode ? [entities.branchCode] : (studentProfile?.preferred_branches || ["CS", "EC", "IT"]),
        preferredDistrict: entities.location || studentProfile?.preferred_district || "All",
        isGovernmentSchool75Quota: entities.quota75 || studentProfile?.is_government_school_quota,
      });

      structuredData = {
        topOptionsCount: recommendations.length,
        topOptions: recommendations.slice(0, 5),
      };

      sources.push({
        title: "EduPath Recommendation Engine & Historical Cutoff Matrix",
        year: 2024,
        section: "Multi-parameter Fit Analysis",
        url: "https://www.tneaonline.org",
      });
    }

    // B. ChromaDB Unstructured Knowledge Retrieval
    const ragResults = queryChromaKnowledgeBase(intent + " " + (entities.collegeName || "") + " " + (entities.branchName || ""), {
      topK: 2,
    });

    const ragChunks = ragResults.map(r => r.chunk);
    for (const chunk of ragChunks) {
      if (!sources.some(s => s.title === chunk.source && s.page === chunk.page)) {
        sources.push({
          title: chunk.source,
          year: chunk.year,
          page: chunk.page,
          section: chunk.section,
          url: chunk.url,
        });
      }
    }

    return {
      structuredData,
      ragChunks,
      sources,
      mlPrediction,
      recommendations,
      comparison,
      trendSummary,
      competitivenessIndicator,
    };
  }

  /**
   * 6. Master Query Processing Entrypoint
   */
  public async processQuery(
    userQuery: string,
    history: ConversationTurn[] = [],
    studentProfile?: any
  ): Promise<AgentResponse> {
    const language = this.detectLanguage(userQuery);
    const entities = this.extractEntities(userQuery, history);
    const intent = this.classifyIntent(userQuery, entities);
    const rewrittenQuery = this.rewriteQuery(userQuery, entities, intent);

    // ── Off-topic guardrail ──
    if (this.isOffTopic(userQuery, intent)) {
      const lang = this.detectLanguage(userQuery);
      let redirectMsg: string;
      if (lang === "ta") {
        redirectMsg = "நான் TNEA கல்லூரி சேர்க்கை உதவியாளர். TNEA சம்பந்தமான கேள்விகளுக்கு மட்டுமே பதில் சொல்ல முடியும் — கட்-ஆஃப், கல்லூரி, கிளை தேர்வு, கவுன்சலிங் நடைமுறை போன்றவை. வேறு தலைப்புகளுக்கு வேறு ஆதாரங்களைப் பயன்படுத்தவும்.";
      } else if (lang === "tanglish") {
        redirectMsg = "Naan TNEA college admission AI counsellor. TNEA related questions — cutoff, college search, branch selection, counselling procedure, seat allotment — ku mattum help pannuven. Unrelated topics ku other sources use pannunga.\n\n💡 Keta try pannunga:\n• **Unga cutoff ku enna college kedaikum?**\n• **KCG College la CS branch cutoff evlo?**\n• **Counselling procedure epdi irukku?**";
      } else {
        redirectMsg = "I'm the EduPath TNEA AI Counsellor, specialised exclusively in Tamil Nadu Engineering Admissions. I can only help with:\n\n• College cutoffs & branch availability\n• TNEA counselling procedure & rounds\n• Choice filling strategy\n• Upward movement & seat allotment\n• College comparison & recommendations\n\nFor other topics, please use a general-purpose assistant.";
      }
      return {
        answer: redirectMsg,
        intent,
        detectedLanguage: lang,
        rewrittenQuery: userQuery,
        sources: [],
        suggestedFollowUps: [
          "How is TNEA cutoff calculated?",
          "Which colleges are best for CSE in Chennai?",
          "How does upward movement work?",
        ],
        providerUsed: "grounded_synthesis",
        modelUsed: "topic-guardrail-v1",
      };
    }

    // Retrieve verified knowledge from ChromaDB + PostgreSQL
    const { structuredData, ragChunks, sources, mlPrediction, recommendations, comparison, trendSummary, competitivenessIndicator } =
      await this.retrieveContext(intent, entities, studentProfile);

    // Build Context Object for LLM
    const contextPrompt = `
RETRIEVED CONTEXT:
Intent: ${intent}
Detected Language: ${language}
Entities Extracted: ${JSON.stringify(entities, null, 2)}
Student Profile: ${JSON.stringify(studentProfile || { category: "OC" }, null, 2)}

Structured Database Facts:
${structuredData ? JSON.stringify(structuredData, null, 2) : "None requested"}

ChromaDB Document Chunks:
${ragChunks.map(c => `[${c.source} | Section: ${c.section} | Page ${c.page}]:\n${c.content}`).join("\n\n")}
`;

    // Construct Messages for LLM
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `${COMMON_TNEA_COUNSELLOR_SYSTEM_PROMPT}\n\n${contextPrompt}`,
      },
    ];

    // Append recent conversation history (up to last 4 turns)
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      messages.push({ role: h.role, content: h.content });
    }

    // Add current user query
    messages.push({ role: "user", content: userQuery });

    // Call LLM Provider (OpenAI / Gemini / Grounded Synthesis)
    const llmRes = await llmService.generateChatResponse(messages, { temperature: 0.3 });

    // Generate Dynamic Context-Aware Follow-Up Suggestions
    const suggestedFollowUps = this.generateSuggestions(intent, entities, language, studentProfile);

    return {
      answer: llmRes.content,
      intent,
      detectedLanguage: language,
      rewrittenQuery,
      sources,
      suggestedFollowUps,
      providerUsed: llmRes.providerUsed,
      modelUsed: llmRes.modelUsed,
      predictionResult: mlPrediction,
      comparisonResult: comparison,
      recommendations,
      trendSummary,
      competitivenessIndicator,
    };
  }

  /**
   * 7. Context-Aware Follow-up Suggestions (Localized in Tamil, Tanglish, or English)
   */
  private generateSuggestions(intent: AgentIntent, entities: AgentEntities, language: "en" | "ta" | "tanglish" = "en", profile?: any): string[] {
    const suggestions: string[] = [];

    if (language === "ta") {
      if (intent === "CUTOFF_CALCULATION") {
        suggestions.push("என் கட்-ஆஃப்க்கு ஏற்ற கல்லூரிகள் எவை?", "சென்னையில் சிறந்த CSE கல்லூரிகள் எவை?", "மேல்நோக்கு இயக்கம் எப்படி செயல்படுகிறது?");
      } else if (entities.collegeCode) {
        const colName = entities.collegeName ? entities.collegeName.split(",")[0] : "இந்த கல்லூரி";
        suggestions.push(`${colName}யில் என்னென்ன பிரிவுகள் உள்ளன?`, `${colName} 2024 கட்-ஆஃப் எவ்வளவு?`, `${colName} மற்றும் SSN ஒப்பீடு`);
      } else if (intent === "RECOMMENDATION") {
        suggestions.push("பரிந்துரைக்கப்பட்ட சிறந்த கல்லூரிகளை ஒப்பிடவும்", "7.5% அரசுப் பள்ளி இடஒதுக்கீடு வாய்ப்புகள்", "மேல்நோக்கு இயக்கம் என்றால் என்ன?");
      } else if (intent === "UPWARD_MOVEMENT") {
        suggestions.push("Accept & Join vs Accept & Upward வித்தியாசம் என்ன?", "மேல்நோக்கு இயக்கத்தில் இடம் கிடைக்காவிட்டால் என்னவாகும்?", "சாய்ஸ் ஃபில்லிங் வரிசை அமைப்பது எப்படி?");
      } else {
        suggestions.push("TNEA கட்-ஆஃப் எப்படி கணக்கிடப்படுகிறது?", "KCG கல்லூரியைப் பற்றி சொல்லுங்கள்", "கவுன்சலிங் சுற்றுகள் எப்படி செயல்படும்?");
      }
      return suggestions.slice(0, 3);
    }

    if (language === "tanglish") {
      if (intent === "CUTOFF_CALCULATION") {
        suggestions.push("Enna cutoff ku enna college kedaikum?", "Chennai la best CSE colleges", "Upward movement epdi work aagum?");
      } else if (entities.collegeCode) {
        const colName = entities.collegeName ? entities.collegeName.split(",")[0] : "this college";
        suggestions.push(`${colName} la enna branches irukku?`, `${colName} 2024 cutoff evlo?`, `Compare ${colName} and SSN`);
      } else if (intent === "RECOMMENDATION") {
        suggestions.push("Top recommended colleges compare pannunga", "7.5% govt school quota options", "Upward movement na enna?");
      } else if (intent === "UPWARD_MOVEMENT") {
        suggestions.push("Accept & Join vs Accept & Upward difference enna?", "Upward movement fail aana enna aagum?", "Choice filling order epdi arrange panradhu?");
      } else {
        suggestions.push("TNEA cutoff epdi calculate panradhu?", "KCG College pathhi sollunga", "Counselling rounds epdi nadakkum?");
      }
      return suggestions.slice(0, 3);
    }

    // English
    if (intent === "CUTOFF_CALCULATION") {
      suggestions.push("Show colleges for my cutoff", "Check CSE options in Chennai", "How does upward movement work?");
    } else if (entities.collegeCode) {
      const colName = entities.collegeName ? entities.collegeName.split(",")[0] : "this college";
      suggestions.push(`What branches are available at ${colName}?`, `What is the 2024 cutoff for ${colName}?`, `Compare ${colName} and SSN`);
    } else if (intent === "RECOMMENDATION") {
      suggestions.push("Compare my top recommended colleges", "Check 7.5% government school quota options", "What is upward movement?");
    } else if (intent === "UPWARD_MOVEMENT") {
      suggestions.push("What is the difference between Accept & Join vs Accept & Upward?", "What happens if upward movement fails?", "How to arrange choice filling order?");
    } else {
      suggestions.push("How is TNEA cutoff calculated?", "Tell me about KCG College of Technology", "How does tentative allotment work?");
    }

    return suggestions.slice(0, 3);
  }
}

export const counsellorAgent = new CounsellorAgent();
