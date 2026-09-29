/**
 * EduPath — Provider-Independent LLM Service
 * 
 * Supports:
 * 1. OpenAI GPT (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
 * 2. Google Gemini (gemini-1.5-flash, gemini-1.5-pro, gemini-pro)
 * 3. Automatic Bi-directional Provider Fallback (OpenAI <-> Gemini)
 * 4. Safe Grounded Synthesis Engine (when API keys are unconfigured or rate-limited)
 * 
 * Strict Grounding & Anti-Hallucination:
 * Both providers share the identical canonical TNEA counselling system prompt.
 */

export type LLMProviderType = "openai" | "gemini";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  provider?: LLMProviderType;
}

export interface LLMResponse {
  content: string;
  providerUsed: "openai" | "gemini" | "grounded_synthesis";
  modelUsed: string;
  fallbackTriggered: boolean;
}

// ──────────────────────────────────────────────
// Canonical System Prompt (Shared by OpenAI & Gemini)
// ──────────────────────────────────────────────
export const COMMON_TNEA_COUNSELLOR_SYSTEM_PROMPT = `You are the EduPath AI Counsellor, an intelligent, empathetic, and factual Tamil Nadu Engineering Admissions (TNEA) expert assistant.

CORE RULES:
1. Grounding & Anti-Hallucination:
   - Base all factual answers strictly on the supplied TNEA context, verified documents, and structured database records.
   - NEVER invent cutoff marks, college codes, rank ranges, seat matrices, or counselling deadlines.
   - If specific information is not in the supplied context, clearly state: "I couldn't find verified information for this in the current EduPath TNEA knowledge base. Please check the latest official TNEA notification at tneaonline.org."
   - NEVER guarantee admission (e.g. do not say "You will definitely get this seat"). Always state that admission depends on dynamic merit rank, choice list ordering, and seat availability.

2. STRICT TOPIC SCOPE — TNEA ONLY:
   - You ONLY answer questions related to TNEA, Tamil Nadu engineering college admissions, cutoffs, branches, counselling procedure, college comparison, and student academic profiles.
   - If the question is unrelated to TNEA (e.g., current date/time, weather, cricket scores, movies, jokes, cooking, general knowledge), respond ONLY with: "Naan TNEA counselling assistant. TNEA related questions — cutoffs, colleges, branch selection, counselling procedure — ku mattum help pannuven." Do NOT attempt to answer off-topic questions.

3. Tone & Persona:
   - ChatGPT-style friendly, structured, encouraging, and highly articulate.
   - When explaining ML predictions, explain that Random Forest + XGBoost models evaluate historical admission margins and trends without guaranteeing seat allotment.
   - When comparing colleges, present clear comparative points (cutoffs, branches, district, autonomous status).

4. Multilingual Support:
   - Seamlessly understand and respond in the student's chosen language:
     • English: Professional, accessible, well-structured.
     • Tamil (தமிழ்): Natural, grammatically sound Tamil script.
     • Tanglish: Friendly conversational Romanized Tamil (e.g., "KCG la IT branch nalla option. Unga cutoff ku match aagum.").
   - Keep official technical terms clear (e.g., Cutoff, Choice Filling, Upward Movement, TNEA, Allotment, Rank).

5. Follow-up Suggestions:
   - At the end of helpful responses, provide 2-3 brief, relevant TNEA follow-up questions the student might want to ask next.`;

// Configuration access helpers
function getEnv(key: string): string {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env as any)[key]) {
      return (import.meta.env as any)[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key]!;
    }
  } catch {}
  return "";
}

export class LLMService {
  private primaryProvider: LLMProviderType;
  private openaiApiKey: string;
  private openaiModel: string;
  private geminiApiKey: string;
  private geminiModel: string;

  constructor() {
    const configuredProvider = (
      getEnv("VITE_LLM_PROVIDER") ||
      getEnv("LLM_PROVIDER") ||
      "openai"
    ).toLowerCase();

    this.primaryProvider = configuredProvider === "gemini" ? "gemini" : "openai";

    this.openaiApiKey = getEnv("VITE_OPENAI_API_KEY") || getEnv("OPENAI_API_KEY") || "";
    this.openaiModel = getEnv("VITE_OPENAI_MODEL") || getEnv("OPENAI_MODEL") || "gpt-4o-mini";

    this.geminiApiKey = getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY") || "";
    this.geminiModel = getEnv("VITE_GEMINI_MODEL") || getEnv("GEMINI_MODEL") || "gemini-1.5-flash";
  }

  public getPrimaryProvider(): LLMProviderType {
    return this.primaryProvider;
  }

  public setProvider(provider: LLMProviderType) {
    this.primaryProvider = provider;
  }

  /**
   * Main unified entry point with automatic bi-directional fallback
   */
  public async generateChatResponse(
    messages: LLMMessage[],
    options: LLMGenerateOptions = {}
  ): Promise<LLMResponse> {
    const targetProvider = options.provider || this.primaryProvider;
    const secondaryProvider: LLMProviderType = targetProvider === "openai" ? "gemini" : "openai";

    // 1. Try Primary Provider
    try {
      if (targetProvider === "openai" && this.openaiApiKey) {
        const content = await this.callOpenAI(messages, options);
        return {
          content,
          providerUsed: "openai",
          modelUsed: this.openaiModel,
          fallbackTriggered: false,
        };
      } else if (targetProvider === "gemini" && this.geminiApiKey) {
        const content = await this.callGemini(messages, options);
        return {
          content,
          providerUsed: "gemini",
          modelUsed: this.geminiModel,
          fallbackTriggered: false,
        };
      }
    } catch (primaryErr) {
      console.warn(`[LLMService] Primary provider (${targetProvider}) failed:`, primaryErr);
    }

    // 2. Try Secondary Provider Fallback
    try {
      if (secondaryProvider === "openai" && this.openaiApiKey) {
        const content = await this.callOpenAI(messages, options);
        return {
          content,
          providerUsed: "openai",
          modelUsed: this.openaiModel,
          fallbackTriggered: true,
        };
      } else if (secondaryProvider === "gemini" && this.geminiApiKey) {
        const content = await this.callGemini(messages, options);
        return {
          content,
          providerUsed: "gemini",
          modelUsed: this.geminiModel,
          fallbackTriggered: true,
        };
      }
    } catch (secondaryErr) {
      console.warn(`[LLMService] Secondary provider (${secondaryProvider}) failed:`, secondaryErr);
    }

    // 3. Fallback to Grounded Synthesis Engine (Offline / Local / Safe)
    return {
      content: this.generateGroundedSynthesis(messages),
      providerUsed: "grounded_synthesis",
      modelUsed: "EduPath Grounded Context Engine v3.2",
      fallbackTriggered: true,
    };
  }

  /**
   * OpenAI API Call
   */
  private async callOpenAI(messages: LLMMessage[], options: LLMGenerateOptions): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Google Gemini API Call
   */
  private async callGemini(messages: LLMMessage[], options: LLMGenerateOptions): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system")?.content || COMMON_TNEA_COUNSELLOR_SYSTEM_PROMPT;
    const chatMsgs = messages.filter(m => m.role !== "system");

    const contents = chatMsgs.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemMsg }],
        },
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 1000,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  /**
   * High-accuracy grounded domain fallback — generates clean, human-readable answers
   * from structured retrieved context. Never dumps raw JSON or debug output.
   */
  private generateGroundedSynthesis(messages: LLMMessage[]): string {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const systemMsg = messages.find(m => m.role === "system")?.content || "";

    // ── Extract structured fields from context string ──
    const extract = (key: string): string => {
      const regex = new RegExp(`${key}:\\s*([^\\n]+)`);
      return (systemMsg.match(regex)?.[1] || "").trim();
    };

    const intent = extract("Intent");
    const language = extract("Detected Language");

    // Try to parse Structured Database Facts JSON block
    let structuredData: any = null;
    try {
      const sdMatch = systemMsg.match(/Structured Database Facts:\s*\n([\s\S]*?)(?:ChromaDB Document Chunks:|$)/);
      if (sdMatch && sdMatch[1].trim() && sdMatch[1].trim() !== "None requested") {
        structuredData = JSON.parse(sdMatch[1].trim());
      }
    } catch { /* ignore JSON parse errors */ }

    // Try to parse ChromaDB chunks
    let ragContext = "";
    const ragMatch = systemMsg.match(/ChromaDB Document Chunks:\s*\n([\s\S]*?)$/);
    if (ragMatch) ragContext = ragMatch[1].trim();

    // ── INTENT-BASED RESPONSE GENERATION ──

    // Off-topic / general conversation redirect
    if (intent === "GENERAL_CONVERSATION") {
      if (language === "tanglish") {
        return `Naan TNEA college admission AI counsellor. TNEA related questions — cutoff, college search, branch selection, counselling procedure, seat allotment — ku mattum help pannuven.\n\n💡 Try asking:\n• **Unga cutoff ku enna college kedaikum?**\n• **KCG College la CS branch cutoff evlo?**\n• **Counselling procedure epdi irukku?**`;
      }
      if (language === "ta") {
        return `நான் TNEA கல்லூரி சேர்க்கை உதவியாளர். கட்-ஆஃப், கல்லூரி தேர்வு, கிளை, கவுன்சலிங் நடைமுறை தொடர்பான கேள்விகளுக்கு மட்டுமே பதில் சொல்வேன்.\n\n💡 கேட்டு பாருங்கள்:\n• உங்கள் கட்-ஆஃப்க்கு ஏற்ற கல்லூரிகள் எவை?\n• KCG College la CS cutoff evlo?`;
      }
      return `I'm the EduPath TNEA AI Counsellor, specialised in Tamil Nadu Engineering Admissions.\n\nI can help you with:\n• 🎓 College cutoffs & branch availability\n• 📋 TNEA counselling procedure & rounds\n• 📊 Choice filling strategy & upward movement\n• 🤖 ML-based admission probability\n• ⚖️ College comparison\n\nFor other topics, please use a general-purpose assistant.`;
    }

    // Historical Cutoff / Branch Availability / College Details
    if (["HISTORICAL_CUTOFF", "BRANCH_AVAILABILITY", "COLLEGE_DETAILS"].includes(intent) && structuredData?.college) {
      const col = structuredData.college;
      const branches = col.branches || [];
      const targetBranch = structuredData.targetBranch;
      const colName = (col.name || col.college_name || "").split(",")[0];
      const colCode = col.code || col.college_code || "";
      const colType = col.type || col.college_type || "";
      const district = col.district || "";

      if (intent === "BRANCH_AVAILABILITY" || branches.length > 0) {
        const branchLines = branches.map((b: any) =>
          `  • **${b.code}** — ${b.name} | Cutoff 2024: **${(b.cutoff2024 || b.cutoff2023 || 0).toFixed(1)}** | Fees: ₹${Math.round((b.fees || 0) / 1000)}K/yr`
        ).join("\n");
        return `## ${colName} (Code: ${colCode})\n**${colType} | ${district} District**\n\n### Available Engineering Branches:\n${branchLines || "Branch data not available in current dataset."}\n\n> 📌 All cutoffs are based on 2023–2025 official TNEA allotment records. Verify at [tneaonline.org](https://www.tneaonline.org).`;
      }

      if (targetBranch) {
        return `## ${colName} — ${targetBranch.name || targetBranch.code}\n\n| Year | Cutoff (OC) |\n|------|-------------|\n| 2023 | **${(targetBranch.cutoff2023 || 0).toFixed(1)}** |\n| 2024 | **${(targetBranch.cutoff2024 || targetBranch.cutoff2023 || 0).toFixed(1)}** |\n| 2025 | **${(targetBranch.cutoff2025 || targetBranch.cutoff2024 || 0).toFixed(1)}** |\n\n📍 ${colType} · ${district} District\n\n> Cutoffs are category-adjusted. For BC, MBC, SC categories the cutoff will be lower. Check official TNEA allotment list at [tneaonline.org](https://www.tneaonline.org).`;
      }
    }

    // ML Prediction
    if (intent === "ML_PREDICTION" && structuredData?.mlPrediction) {
      const pred = structuredData.mlPrediction;
      const score = pred.predictionScore || 0;
      const emoji = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";
      return `## ${emoji} Admission Probability\n\n**${pred.predictionClass || "Moderate Probability"}** — Score: **${score}%**\n\n| Model | Score |\n|-------|-------|\n| Random Forest | ${pred.randomForestScore || score}% |\n| XGBoost | ${pred.xgboostScore || score}% |\n\n📊 **Cutoff Margin:** ${pred.cutoffMargin >= 0 ? "+" : ""}${(pred.cutoffMargin || 0).toFixed(2)} marks\n\n> ⚠️ This is a statistical estimate based on 2023–2025 historical admission data. Actual allotment depends on live merit rank, seat availability, and choice list ordering.`;
    }

    // Recommendations
    if (intent === "RECOMMENDATION" && structuredData?.topOptions) {
      const opts = structuredData.topOptions.slice(0, 5);
      const lines = opts.map((o: any, i: number) =>
        `${i + 1}. **${o.collegeName?.split(",")[0]}** (${o.collegeCode}) — ${o.branchCode} | Cutoff: ${(o.historicalCutoff2024 || 0).toFixed(1)} | ${o.suitability}`
      ).join("\n");
      return `## 🎯 Personalised College Recommendations\n\nBased on your profile (${structuredData.topOptionsCount} matches found):\n\n${lines}\n\n> Rankings are based on EduPath Fit Score (Cutoff 40% + Branch 20% + ML 15% + Location 10% + Budget 10% + Trend 5%). Head to the **Recommendations** tab for detailed fit analysis.`;
    }

    // Cutoff Calculation
    if (intent === "CUTOFF_CALCULATION") {
      return `## 📐 TNEA Cutoff Calculation Formula\n\n**Cutoff = Maths + (Physics ÷ 2) + (Chemistry ÷ 2)**\n\nMaximum Cutoff: **200 marks**\n\n### Example:\n| Subject | Marks | Weight |\n|---------|-------|--------|\n| Maths | 100 | 100 |\n| Physics | 80 | 40 (÷2) |\n| Chemistry | 90 | 45 (÷2) |\n| **Cutoff** | | **185.00** |\n\n### 7.5% Government School Quota:\nGovernment school students get +6.5 marks effective benefit in allotment priority.\n\n> Use the **Cutoff Calculator** page for instant calculation with your marks.`;
    }

    // Upward Movement
    if (intent === "UPWARD_MOVEMENT") {
      return `## ↗️ TNEA Upward Movement\n\nDuring counselling rounds, you have **3 options** after receiving a tentative allotment:\n\n1. **Accept & Join** — Confirm this seat. You will NOT be considered for better choices.\n2. **Accept & Upward** — Keep this seat AND try for higher-preference choices in the next round. If a better seat is allotted, you move up; if not, you keep the current seat.\n3. **Decline & Upward** — Reject this seat and try for higher-preference choices. ⚠️ Risky — if no better seat is available, you lose this allotment.\n\n> 💡 **Best Strategy:** Always use **Accept & Upward** to secure your current seat while trying for better options.`;
    }

    // Counselling Procedure
    if (intent === "COUNSELLING_PROCEDURE" || intent === "GENERAL_TNEA") {
      return `## 📋 TNEA Counselling Procedure\n\n**TNEA (Tamil Nadu Engineering Admissions)** is conducted by the Directorate of Technical Education (DTE), Tamil Nadu for 461+ Engineering Colleges.\n\n### Key Steps:\n1. **Registration** — Register on tneaonline.org with +2 marks & community certificate\n2. **Cutoff Calculation** — Maths + Physics/2 + Chemistry/2 (Max: 200)\n3. **Certificate Verification** — Upload documents for verification\n4. **Tentative Allotment** — Based on merit rank & choice list\n5. **Upward Movement Rounds** — Multiple rounds for better choices\n6. **Final Allotment & Joining** — Report to allotted college\n\n> 🔗 Official Portal: [tneaonline.org](https://www.tneaonline.org)`;
    }

    // RAG chunks available
    if (ragContext && ragContext.length > 30 && !ragContext.includes("No knowledge")) {
      const clean = ragContext
        .replace(/\[.*?\]:\s*/g, "")
        .replace(/Section:.*?\n/g, "")
        .trim()
        .slice(0, 600);
      return `Based on TNEA official documents:\n\n${clean}\n\n> 📚 Source: Official TNEA Knowledge Base. For complete details, visit [tneaonline.org](https://www.tneaonline.org).`;
    }

    // Generic fallback
    const lower = lastUserMsg.toLowerCase();
    if (lower.includes("cutoff") || lower.includes("mark")) {
      return `To check cutoffs for a specific college, please mention the **college name or code** (e.g., "KCG college 1311 CS branch cutoff" or "PSG Tech cutoff for EC 2024").\n\nI have cutoff data for all 461 TNEA institutions from 2023–2025.`;
    }
    return `I'm ready to help with TNEA counselling! Ask me about:\n\n• **College cutoffs** — "KCG CS branch 2024 cutoff evlo?"\n• **Branch availability** — "PSG Tech la AI branch iruka?"\n• **Recommendations** — "My cutoff 186, BC category — which colleges?"\n• **Counselling procedure** — "Upward movement epdi work aagum?"\n• **College comparison** — "Compare KCG vs SSN"\n\nAll answers are grounded in official TNEA 2023–2025 data. 🎓`;
  }
}

export const llmService = new LLMService();
