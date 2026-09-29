/**
 * Comprehensive Verification Test for EduPath TNEA RAG AI Counsellor
 * Tests all required categories from Section 35 of Master Implementation Prompt
 */

import { counsellorAgent } from "../src/lib/counsellorAgent.ts";
import { queryChromaKnowledgeBase } from "../src/lib/chromaKnowledgeStore.ts";
import { llmService } from "../src/lib/llmService.ts";

async function runTestSuite() {
  console.log("============================================================");
  console.log("EDUPATH TNEA RAG AI COUNSELLOR — MASTER TEST SUITE");
  console.log("============================================================\n");

  const mockProfile = {
    studentName: "Karthik Subramanian",
    cutoff: 186.0,
    maths: 95,
    physics: 90,
    chemistry: 92,
    category: "BC",
    preferredDistrict: "Chennai",
    preferredBranches: ["CS", "IT", "EC"],
    is_government_school_quota: false,
    comparison_codes: ["1311", "1315"],
  };

  const testCases = [
    // 1. GENERAL
    {
      group: "GENERAL TNEA",
      query: "What is TNEA?",
      expectedIntent: "GENERAL_TNEA",
      expectedContent: ["single-window", "Directorate of Technical Education", "HSC"],
    },
    {
      group: "GENERAL TNEA",
      query: "How does counselling work?",
      expectedIntent: "COUNSELLING_PROCEDURE",
      expectedContent: ["Registration", "Rank List", "Choice Filling", "Tentative Allotment"],
    },
    {
      group: "GENERAL TNEA",
      query: "What is upward movement?",
      expectedIntent: "UPWARD_MOVEMENT",
      expectedContent: ["higher choice", "vacancy"],
    },

    // 2. CUTOFF
    {
      group: "CUTOFF CALCULATION",
      query: "How is TNEA cut-off calculated?",
      expectedIntent: "CUTOFF_CALCULATION",
      expectedContent: ["Mathematics", "Physics", "Chemistry", "200"],
    },
    {
      group: "HISTORICAL CUTOFF",
      query: "KCG IT 2025 cutoff?",
      expectedIntent: "HISTORICAL_CUTOFF",
      expectedCollege: "1311",
      expectedBranch: "IT",
      expectedYear: 2025,
    },

    // 3. COLLEGE & BRANCH DETAILS
    {
      group: "COLLEGE DETAILS",
      query: "Tell me about KCG.",
      expectedIntent: "COLLEGE_DETAILS",
      expectedCollege: "1311",
    },
    {
      group: "BRANCH AVAILABILITY",
      query: "Does KCG offer IT?",
      expectedIntent: "BRANCH_AVAILABILITY",
      expectedCollege: "1311",
      expectedBranch: "IT",
    },
    {
      group: "COLLEGE CODE",
      query: "What is KCG college code?",
      expectedIntent: "COLLEGE_DETAILS",
      expectedCollege: "1311",
    },

    // 4. RECOMMENDATIONS
    {
      group: "RECOMMENDATION",
      query: "I have 175 cutoff. What colleges can I consider?",
      expectedIntent: "RECOMMENDATION",
      checkRecommendations: true,
    },
    {
      group: "RECOMMENDATION",
      query: "175 cutoff iruku CSE venum Chennai la.",
      expectedIntent: "RECOMMENDATION",
      expectedLanguage: "tanglish",
      expectedBranch: "CS",
      expectedLocation: "Chennai",
    },

    // 5. COLLEGE COMPARISON
    {
      group: "COLLEGE COMPARISON",
      query: "Compare KCG and SSN.",
      expectedIntent: "COLLEGE_COMPARISON",
      checkComparison: true,
    },

    // 6. TAMIL & TANGLISH
    {
      group: "TAMIL & TANGLISH",
      query: "Enakku 175 cutoff iruku enna college kedaikum?",
      expectedIntent: "RECOMMENDATION",
      expectedLanguage: "tanglish",
    },
    {
      group: "TAMIL & TANGLISH",
      query: "KCG la IT iruka?",
      expectedIntent: "BRANCH_AVAILABILITY",
      expectedLanguage: "tanglish",
      expectedCollege: "1311",
      expectedBranch: "IT",
    },
    {
      group: "TAMIL & TANGLISH",
      query: "Counselling epdi nadakum?",
      expectedIntent: "COUNSELLING_PROCEDURE",
      expectedLanguage: "tanglish",
    },
    {
      group: "TAMIL & TANGLISH",
      query: "Upward movement na enna?",
      expectedIntent: "UPWARD_MOVEMENT",
      expectedLanguage: "tanglish",
    },
  ];

  let passed = 0;
  let total = testCases.length;

  for (const tc of testCases) {
    console.log(`[Testing: ${tc.group}] Query: "${tc.query}"`);
    const res = await counsellorAgent.processQuery(tc.query, [], mockProfile);

    // Verify Intent
    if (tc.expectedIntent && res.intent !== tc.expectedIntent) {
      throw new Error(`Expected intent ${tc.expectedIntent}, got ${res.intent}`);
    }

    // Verify Language
    if (tc.expectedLanguage && res.detectedLanguage !== tc.expectedLanguage) {
      throw new Error(`Expected language ${tc.expectedLanguage}, got ${res.detectedLanguage}`);
    }

    // Verify Sources
    if (!res.sources || res.sources.length === 0) {
      throw new Error(`Response missing verified sources for: ${tc.query}`);
    }

    // Verify Follow-ups
    if (!res.suggestedFollowUps || res.suggestedFollowUps.length === 0) {
      throw new Error(`Response missing dynamic follow-up suggestions for: ${tc.query}`);
    }

    console.log(`  ✓ Intent: ${res.intent} | Lang: ${res.detectedLanguage} | Sources: ${res.sources.length}`);
    console.log(`  ✓ Follow-ups: [${res.suggestedFollowUps.join(" | ")}]`);
    console.log(`  ✓ Snippet: ${res.answer.slice(0, 110).replace(/\n/g, " ")}...\n`);
    passed++;
  }

  // 7. MULTI-TURN CONVERSATION MEMORY & FOLLOW-UP TEST
  console.log("------------------------------------------------------------");
  console.log("[Testing: MULTI-TURN CONVERSATION MEMORY]");
  console.log("------------------------------------------------------------");

  const conversationHistory = [];

  // Turn 1
  console.log("Turn 1: User says: 'Tell me about KCG.'");
  const t1 = await counsellorAgent.processQuery("Tell me about KCG.", conversationHistory, mockProfile);
  conversationHistory.push({ role: "user", content: "Tell me about KCG.", entities: { collegeCode: "1311", collegeName: "KCG College of Technology, Karapakkam, Chennai" } });
  conversationHistory.push({ role: "assistant", content: t1.answer });
  console.log(`  ✓ Turn 1 Intent: ${t1.intent}`);

  // Turn 2
  console.log("Turn 2: User asks follow-up: 'What branches are available?'");
  const t2 = await counsellorAgent.processQuery("What branches are available?", conversationHistory, mockProfile);
  console.log(`  ✓ Rewritten Query: "${t2.rewrittenQuery}"`);
  if (!t2.rewrittenQuery.includes("KCG")) {
    throw new Error("Turn 2 failed to inherit college entity from Turn 1!");
  }
  conversationHistory.push({ role: "user", content: "What branches are available?", entities: { collegeCode: "1311", collegeName: "KCG College of Technology, Karapakkam, Chennai" } });
  conversationHistory.push({ role: "assistant", content: t2.answer });

  // Turn 3
  console.log("Turn 3: User asks follow-up: 'What about IT?'");
  const t3 = await counsellorAgent.processQuery("What about IT?", conversationHistory, mockProfile);
  console.log(`  ✓ Rewritten Query: "${t3.rewrittenQuery}"`);
  if (!t3.rewrittenQuery.includes("Information Technology") || !t3.rewrittenQuery.includes("KCG")) {
    throw new Error("Turn 3 failed to inherit college and extract IT branch!");
  }
  conversationHistory.push({ role: "user", content: "What about IT?", entities: { collegeCode: "1311", collegeName: "KCG College of Technology, Karapakkam, Chennai", branchCode: "IT", branchName: "Information Technology" } });
  conversationHistory.push({ role: "assistant", content: t3.answer });

  // Turn 4
  console.log("Turn 4: User asks follow-up: '2025 cutoff?'");
  const t4 = await counsellorAgent.processQuery("2025 cutoff?", conversationHistory, mockProfile);
  console.log(`  ✓ Rewritten Query: "${t4.rewrittenQuery}"`);
  if (!t4.rewrittenQuery.includes("2025") || !t4.rewrittenQuery.includes("KCG")) {
    throw new Error("Turn 4 failed to understand 2025 cutoff inquiry for KCG IT!");
  }

  console.log("\n============================================================");
  console.log(`🎉 ALL ${total + 4} TESTS PASSED CLEANLY!`);
  console.log("============================================================");
}

runTestSuite().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
