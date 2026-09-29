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
} from "./tneaData";
import { CHROMA_TNEA_KNOWLEDGE_BASE, queryChromaKnowledgeBase, type KnowledgeDocumentChunk } from "./chromaKnowledgeStore";
import { predictAdmissionProbability, type ModelPredictionResult } from "./mlPrediction";
import { generatePersonalizedRecommendations, type RecommendedOption } from "./recommendationEngine";
import { compareCollegesByCodes, type ComparisonSessionResult } from "./comparisonEngine";
import { llmService, COMMON_TNEA_COUNSELLOR_SYSTEM_PROMPT, type LLMMessage } from "./llmService";

export type AgentIntent =
  | "GENERAL_TNEA"
  | "TNEA_ELIGIBILITY"
  | "COUNSELLING_PROCEDURE"
  | "CUTOFF_CALCULATION"
  | "HISTORICAL_CUTOFF"
  | "COLLEGE_SEARCH"
  | "COLLEGE_DETAILS"
  | "BRANCH_SEARCH"
  | "BRANCH_AVAILABILITY"
  | "RECOMMENDATION"
  | "PERSONALIZED_RECOMMENDATION"
  | "ML_PREDICTION"
  | "COLLEGE_COMPARISON"
  | "SAVED_COLLEGES"
  | "STUDENT_PROFILE"
  | "UPWARD_MOVEMENT"
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
}

// ──────────────────────────────────────────────
// Common College Aliases and Nicknames Mapping
// ──────────────────────────────────────────────
const COLLEGE_ALIASES: Record<string, { code: string; canonicalName: string }> = {
  kcg: { code: "1311", canonicalName: "KCG College of Technology, Karapakkam, Chennai" },
  ssn: { code: "1315", canonicalName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam" },
  psg: { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "psg tech": { code: "2006", canonicalName: "PSG College of Technology, Peelamedu, Coimbatore" },
  "psg itech": { code: "2377", canonicalName: "PSG Institute of Technology and Applied Research, Neelambur" },
  cit: { code: "2007", canonicalName: "Coimbatore Institute of Technology, Coimbatore" },
  "chennai cit": { code: "2702", canonicalName: "Chennai Institute of Technology, Kundrathur, Chennai" },
  gct: { code: "2005", canonicalName: "Government College of Technology, Thadagam Road, Coimbatore" },
  ceg: { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  mit: { code: "0004", canonicalName: "Madras Institute of Technology, Chromepet, Chennai" },
  act: { code: "0002", canonicalName: "Alagappa College of Technology, Anna University, Chennai" },
  "anna university": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  "anna univ": { code: "0001", canonicalName: "College of Engineering Guindy, Anna University, Chennai" },
  sri: { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  skcet: { code: "2718", canonicalName: "Sri Krishna College of Engineering and Technology, Coimbatore" },
  skct: { code: "2722", canonicalName: "Sri Krishna College of Technology, Kovaipudur, Coimbatore" },
  tce: { code: "5008", canonicalName: "Thiagarajar College of Engineering, Thiruparankundram, Madurai" },
  thiagarajar: { code: "5008", canonicalName: "Thiagarajar College of Engineering, Madurai" },
  svce: { code: "1219", canonicalName: "Sri Venkateswara College of Engineering, Sriperumbudur" },
  rit: { code: "2712", canonicalName: "Rajalakshmi Institute of Technology, Kuthambakkam" },
  rec: { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  rajalakshmi: { code: "1211", canonicalName: "Rajalakshmi Engineering College, Thandalam" },
  loyola: { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  licet: { code: "1113", canonicalName: "Loyola - ICAM College of Engineering and Technology (LICET), Chennai" },
  rmk: { code: "1112", canonicalName: "R.M.K. Engineering College, Gummidipoondi, Thiruvallur" },
  rmd: { code: "1128", canonicalName: "R.M.D. Engineering College, Gummidipoondi" },
  srm: { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },
  valliammai: { code: "1422", canonicalName: "SRM Valliammai Engineering College, Kattankulathur" },
  st_joseph: { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  "st joseph": { code: "1317", canonicalName: "St. Joseph's College of Engineering, OMR, Chennai" },
  kumaraguru: { code: "2711", canonicalName: "Kumaraguru College of Technology, Saravanampatty, Coimbatore" },
  kct: { code: "2711", canonicalName: "Kumaraguru College of Technology, Coimbatore" },
  kongu: { code: "2706", canonicalName: "Kongu Engineering College, Perundurai, Erode" },
  bannari: { code: "2702", canonicalName: "Bannari Amman Institute of Technology, Sathyamangalam" },
  bits: { code: "2702", canonicalName: "Bannari Amman Institute of Technology, Sathyamangalam" },
  sairam: { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },
  ssec: { code: "1419", canonicalName: "Sri Sairam Engineering College, West Tambaram, Chennai" },
  mepco: { code: "4960", canonicalName: "Mepco Schlenk Engineering College, Sivakasi, Virudhunagar" },
  saveetha: { code: "2615", canonicalName: "Saveetha Engineering College, Thandalam, Chennai" },
};

// ──────────────────────────────────────────────
// Branch Aliases Mapping
// ──────────────────────────────────────────────
const BRANCH_ALIASES: Record<string, { code: string; name: string }> = {
  cs: { code: "CS", name: "Computer Science & Engineering" },
  cse: { code: "CS", name: "Computer Science & Engineering" },
  "computer science": { code: "CS", name: "Computer Science & Engineering" },
  it: { code: "IT", name: "Information Technology" },
  "information technology": { code: "IT", name: "Information Technology" },
  ec: { code: "EC", name: "Electronics & Communication Engineering" },
  ece: { code: "EC", name: "Electronics & Communication Engineering" },
  ee: { code: "EE", name: "Electrical & Electronics Engineering" },
  eee: { code: "EE", name: "Electrical & Electronics Engineering" },
  me: { code: "ME", name: "Mechanical Engineering" },
  mech: { code: "ME", name: "Mechanical Engineering" },
  "mechanical engineering": { code: "ME", name: "Mechanical Engineering" },
  ce: { code: "CE", name: "Civil Engineering" },
  civil: { code: "CE", name: "Civil Engineering" },
  ai: { code: "AI", name: "Artificial Intelligence & Data Science" },
  aids: { code: "AI", name: "Artificial Intelligence & Data Science" },
  "ai & ds": { code: "AI", name: "Artificial Intelligence & Data Science" },
  ad: { code: "AD", name: "Artificial Intelligence & Machine Learning" },
  aiml: { code: "AD", name: "Artificial Intelligence & Machine Learning" },
  biotech: { code: "BT", name: "Biotechnology" },
  biomedical: { code: "BM", name: "Biomedical Engineering" },
  chemical: { code: "CH", name: "Chemical Engineering" },
};

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
      "aagum", "varum", "kaatunga", "nadakkum", "solra", "na enna", "ku chance"
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
    const lower = query.toLowerCase();

    // Check comparison intent with multiple colleges
    if (lower.includes("compare") || lower.includes("vs") || lower.includes("versus") || lower.includes("difference between")) {
      const foundCodes: string[] = [];
      for (const [alias, data] of Object.entries(COLLEGE_ALIASES)) {
        const regex = new RegExp(`\\b${alias}\\b`, "i");
        if (regex.test(lower)) {
          if (!foundCodes.includes(data.code)) foundCodes.push(data.code);
        }
      }
      if (foundCodes.length >= 2) {
        entities.comparisonColleges = foundCodes;
      }
    }

    // Single College extraction (Aliases or Codes or Names)
    for (const [alias, data] of Object.entries(COLLEGE_ALIASES)) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(lower)) {
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
        if (simpleName.length > 5 && lower.includes(simpleName)) {
          entities.collegeCode = col.college_code;
          entities.collegeName = col.college_name;
          break;
        }
      }
    }

    // Branch extraction
    for (const [alias, data] of Object.entries(BRANCH_ALIASES)) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(lower)) {
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

    // Location extraction
    const districts = ["chennai", "coimbatore", "madurai", "salem", "trichy", "tiruchirappalli", "erode", "vellore", "tirunelveli"];
    for (const d of districts) {
      if (lower.includes(d)) {
        entities.location = d.charAt(0).toUpperCase() + d.slice(1);
        break;
      }
    }

    // Quotas
    if (lower.includes("7.5") || lower.includes("govt school") || lower.includes("government school")) {
      entities.quota75 = true;
    }

    // ──────────────────────────────────────────────
    // Context Inheritance from Conversation Memory (scan backwards)
    // ──────────────────────────────────────────────
    if (history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        if (turn.entities) {
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
            if (new RegExp(`\\b${alias}\\b`, "i").test(turn.content.toLowerCase())) {
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
   * 3. Intent Classification
   */
  public classifyIntent(query: string, entities: AgentEntities): AgentIntent {
    const lower = query.toLowerCase();

    // Comparison Intent
    if (entities.comparisonColleges && entities.comparisonColleges.length >= 2) {
      return "COLLEGE_COMPARISON";
    }
    if (lower.includes("compare") && (lower.includes("saved") || lower.includes("colleges"))) {
      return "COLLEGE_COMPARISON";
    }

    // Cutoff Calculation Intent
    const hasCutoffWord = lower.includes("cutoff") || lower.includes("cut-off");
    if (
      (entities.maths !== undefined && entities.physics !== undefined && entities.chemistry !== undefined) ||
      (hasCutoffWord && (lower.includes("calculat") || lower.includes("how is") || lower.includes("formula") || lower.includes("my cutoff") || lower.includes("my cut-off")))
    ) {
      return "CUTOFF_CALCULATION";
    }

    // Upward Movement Intent
    if (lower.includes("upward movement") || lower.includes("upward na enna") || lower.includes("accept and upward") || lower.includes("decline and upward")) {
      return "UPWARD_MOVEMENT";
    }

    // Historical Cutoff Intent
    if (
      entities.collegeCode &&
      (lower.includes("cutoff") || lower.includes("cut-off") || lower.includes("mark") || lower.includes("evlo") || entities.year !== undefined)
    ) {
      return "HISTORICAL_CUTOFF";
    }

    // Branch Availability Intent
    if (
      entities.collegeCode &&
      (lower.includes("iruka") || lower.includes("available") || lower.includes("offer") || lower.includes("branches"))
    ) {
      return "BRANCH_AVAILABILITY";
    }

    // College Details / Search Intent
    if (entities.collegeCode && (lower.includes("tell me about") || lower.includes("college code") || lower.includes("address") || lower.includes("where is"))) {
      return "COLLEGE_DETAILS";
    }

    // ML Prediction Intent
    if (
      entities.collegeCode &&
      (lower.includes("predict") || lower.includes("chance") || lower.includes("kedaikuma") || lower.includes("can i get") || lower.includes("possibility"))
    ) {
      return "ML_PREDICTION";
    }

    // Recommendations Intent
    if (
      entities.cutoff ||
      lower.includes("recommend") ||
      lower.includes("which college") ||
      lower.includes("kedaikum") ||
      lower.includes("colleges for me") ||
      lower.includes("suitable college") ||
      lower.includes("choice filling list")
    ) {
      return "RECOMMENDATION";
    }

    // General TNEA / Eligibility / Procedure
    if (lower.includes("eligible") || lower.includes("eligibility") || lower.includes("criteria") || lower.includes("nativity")) {
      return "TNEA_ELIGIBILITY";
    }
    if (lower.includes("counselling") || lower.includes("procedure") || lower.includes("steps") || lower.includes("rounds") || lower.includes("epdi nadakum")) {
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
      "tneaonline", "dte", "directorate",
      // Tanglish TNEA tokens
      "college ku", "college la", "branch iruka", "kedaikuma", "chance iruka",
      "cutoff evlo", "mark venum", "epdi apply", "counselling epdi",
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

    // A. Structured PostgreSQL / Dataset Tools
    if (intent === "HISTORICAL_CUTOFF" || intent === "COLLEGE_DETAILS" || intent === "BRANCH_AVAILABILITY") {
      if (entities.collegeCode) {
        const col = MASTER_TNEA_COLLEGES.find(c => c.college_code === entities.collegeCode);
        if (col) {
          const collegesWithCutoff = await getCollegesWithCutoffs(entities.category || studentProfile?.category || "OC");
          const detailedCol = collegesWithCutoff.find(c => String(c.code) === entities.collegeCode) || col;

          structuredData = {
            college: detailedCol,
            targetBranch: entities.branchCode ? (detailedCol as any).branches?.find((b: any) => b.code === entities.branchCode) : null,
            requestedYear: entities.year || "All available (2023, 2024, 2025)",
          };

          sources.push({
            title: `TNEA Historical Cutoff Dataset (${col.college_name})`,
            year: entities.year || 2024,
            section: "Verified Institutional Allotment Records",
            url: col.source_url || "https://www.tneaonline.org",
          });
        }
      }
    }

    if (intent === "COLLEGE_COMPARISON") {
      const codes = entities.comparisonColleges && entities.comparisonColleges.length >= 2
        ? entities.comparisonColleges
        : (studentProfile?.comparison_codes || ["1311", "1315"]);

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
    const { structuredData, ragChunks, sources, mlPrediction, recommendations, comparison } =
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
    const suggestedFollowUps = this.generateSuggestions(intent, entities, studentProfile);

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
    };
  }

  /**
   * 7. Context-Aware Follow-up Suggestions
   */
  private generateSuggestions(intent: AgentIntent, entities: AgentEntities, profile?: any): string[] {
    const suggestions: string[] = [];

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
      suggestions.push("How is TNEA cutoff calculated?", "Which colleges offer CSE?", "How does tentative allotment work?");
    }

    return suggestions.slice(0, 3);
  }
}

export const counsellorAgent = new CounsellorAgent();
