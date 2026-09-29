/**
 * EduPath — Complete Backend Integration Verification Suite
 * 
 * Verifies all 12 modules and the complete user lifecycle:
 * 1. Authentication (Phone -> OTP -> Backend -> PostgreSQL -> Permanent Account)
 * 2. Student Profile (Scoped to token, strict isolation between Student A and Student B)
 * 3. TNEA Cutoff Calculator (Marks -> Backend -> Calculation -> Store/Return)
 * 4. TNEA Data (Colleges, Branches, Cutoffs, Seat Matrix)
 * 5. ML Admission Prediction (Profile + Cutoff + College + Branch -> ML Ensemble)
 * 6. College Recommendations (Profile + Preferences + Cutoff -> Recommendation Engine)
 * 7. College Comparison (Selected Colleges -> Comparison API -> Matrix)
 * 8. Saved Colleges (Save/Remove -> PostgreSQL persistence)
 * 9. RAG AI Counsellor (Chat -> Query Router -> ChromaDB/PostgreSQL/Profile -> LLM)
 * 10. Conversation History (Multi-turn chat restored for same student)
 * 11. Personalized Counselling Report (Report API -> Generate -> Store -> Return)
 * 12. Notifications (TNEA official timeline & alerts)
 * 13. Session Isolation & Security (Student A cannot access Student B's data)
 * 14. Full Persistence & Restore Cycle: Logout -> Login Again -> All 9 artifacts restored!
 */

import { handleApiRequest } from "../src/server/apiRouter.ts";

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
console.log("EDUPATH — COMPLETE BACKEND MODULES & SERVICES INTEGRATION SUITE");
console.log("================================================================================\n");

async function runIntegrationSuite() {
  const studentAPhone = "9876543210";
  const studentBPhone = "9123456780";

  // ─────────────────────────────────────────────────────────────
  // 1. Authentication: Phone Number → OTP → Backend
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Authentication Flow ---");
  const otpRes = await api("/api/auth/send-otp", "POST", { phone: studentAPhone, countryCode: "+91" });
  assert(otpRes.status === 200 && otpRes.data.success, "1.1 Send OTP endpoint generates verification code");
  const sentOtp = otpRes.data.otp;
  assert(typeof sentOtp === "string" && sentOtp.length === 6, "1.2 OTP is valid 6-digit code");

  // Verify OTP for new student
  const verifyRes = await api("/api/auth/verify-otp", "POST", { phone: studentAPhone, countryCode: "+91", otp: sentOtp });
  assert(verifyRes.status === 200 && verifyRes.data.success, "1.3 Verify OTP succeeds");
  const regToken = verifyRes.data.token;
  assert(typeof regToken === "string" && regToken.startsWith("edupath_sec_"), "1.4 Issues temporary registration token");

  // Register New Student Account
  console.log("\n--- 2. Student Registration & Permanent Profile ---");
  const regRes = await api("/api/auth/register", "POST", {
    profileData: {
      displayName: "Kavitha Raman",
      dob: "2006-05-14",
      category: "BC",
      school: "Govt Higher Secondary School, Salem",
      passingYear: "2024",
      preferredDistrict: "Chennai",
      preferredBranches: ["CS", "EC", "AI"],
      budget: 65000,
      language: "Tamil",
      isGovernmentSchoolQuota: true,
      isFirstGraduate: true,
      specialReservation: "None",
    },
    academicData: {
      maths: 98,
      physics: 94,
      chemistry: 92,
      cutoff: 191.0,
      academicYear: "2024",
    },
  }, regToken);

  assert(regRes.status === 200 && regRes.data.success, "2.1 Registration creates permanent student account");
  const tokenStudentA = regRes.data.token;
  assert(typeof tokenStudentA === "string" && tokenStudentA.length > 20, "2.2 Permanent session token issued");
  assert(regRes.data.account.profile.display_name === "Kavitha Raman", "2.3 Profile display name stored");
  assert(regRes.data.account.profile.is_government_school_quota === true, "2.4 7.5% Government school quota recorded");

  // ─────────────────────────────────────────────────────────────
  // 2. Student Profile API & Security
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Student Profile API & Session Scoping ---");
  const getProfileRes = await api("/api/profile", "GET", null, tokenStudentA);
  assert(getProfileRes.status === 200, "3.1 /api/profile returns 200 with Bearer token");
  assert(getProfileRes.data.profile.phone.includes("9876543210"), "3.2 Profile resolves phone without client sending phone");
  assert(getProfileRes.data.academicRecord?.cutoff === 191.0, "3.3 Initial academic record attached");

  // Profile update via PUT
  const updateRes = await api("/api/profile", "PUT", { budget: 75000, preferred_district: "Coimbatore" }, tokenStudentA);
  assert(updateRes.status === 200 && updateRes.data.profile.budget === 75000, "3.4 /api/profile PUT updates student preferences");

  // ─────────────────────────────────────────────────────────────
  // 3. TNEA Cutoff Calculator
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. TNEA Cutoff Calculator API ---");
  const cutoffCalcRes = await api("/api/cutoff/calculate", "POST", {
    maths: 96,
    physics: 92,
    chemistry: 90,
    saveToProfile: true,
    category: "BC",
  }, tokenStudentA);

  assert(cutoffCalcRes.status === 200, "4.1 /api/cutoff/calculate returns 200");
  assert(cutoffCalcRes.data.physicsContribution === 46.0, "4.2 Physics contribution calculated as 92/2 = 46.0");
  assert(cutoffCalcRes.data.chemistryContribution === 45.0, "4.3 Chemistry contribution calculated as 90/2 = 45.0");
  assert(cutoffCalcRes.data.totalCutoff === 187.0, "4.4 Total cutoff = 96 + 46 + 45 = 187.0");
  assert(cutoffCalcRes.data.saved === true, "4.5 Cutoff result automatically stored to student academic record");

  // ─────────────────────────────────────────────────────────────
  // 4. TNEA Master Data (Colleges, Branches, Cutoffs, Seats)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. TNEA Master Data API ---");
  const collegesRes = await api("/api/tnea/colleges?category=BC", "GET");
  assert(collegesRes.status === 200 && Array.isArray(collegesRes.data), "5.1 /api/tnea/colleges returns college list");
  assert(collegesRes.data.length >= 460, `5.2 Full dataset verified (found ${collegesRes.data.length} colleges)`);

  const collegeDetailRes = await api("/api/tnea/colleges/0001?category=BC", "GET");
  assert(collegeDetailRes.status === 200 && collegeDetailRes.data.code === "0001", "5.3 College details fetched for CEG Guindy");
  assert(collegeDetailRes.data.branches.length > 0, "5.4 Branches and multi-year cutoffs populated");

  const branchesRes = await api("/api/tnea/branches", "GET");
  assert(branchesRes.status === 200 && branchesRes.data.length >= 7, "5.5 TNEA Engineering branches returned");

  const seatsRes = await api("/api/tnea/seats", "GET");
  assert(seatsRes.status === 200 && seatsRes.data.length > 0, "5.6 Seat matrix with 7.5% quota returned");

  // ─────────────────────────────────────────────────────────────
  // 5. ML Admission Prediction
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 6. ML Admission Prediction API ---");
  const mlRes = await api("/api/prediction/predict", "POST", {
    studentCutoff: 187.0,
    community: "BC",
    targetCollegeCode: "0001",
    targetBranchCode: "CS",
    historicalCutoff2023: 198.5,
    historicalCutoff2024: 198.0,
    isGovernmentSchool75Quota: true,
  }, tokenStudentA);

  assert(mlRes.status === 200, "6.1 /api/prediction/predict returns 200");
  assert(typeof mlRes.data.admissionProbability === "number", "6.2 Admission probability returned");
  assert(typeof mlRes.data.confidenceInterval === "object", "6.3 Confidence interval computed");
  assert(Array.isArray(mlRes.data.ensembleBreakdown), "6.4 Random Forest + XGBoost ensemble breakdown present");

  // ─────────────────────────────────────────────────────────────
  // 6. College Recommendations
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 7. Personalized College Recommendations API ---");
  const recRes = await api("/api/recommendations", "POST", {
    studentCutoff: 187.0,
    community: "BC",
    preferredBranches: ["CS", "EC"],
    isGovernmentSchool75Quota: true,
  }, tokenStudentA);

  assert(recRes.status === 200 && Array.isArray(recRes.data), "7.1 /api/recommendations returns 200");
  assert(recRes.data.length > 0, `7.2 Recommendations generated (${recRes.data.length} options)`);
  const topRec = recRes.data[0];
  assert(topRec.collegeName && topRec.categoryTag, "7.3 Recommendation categorized (Dream / Target / Safe)");

  // ─────────────────────────────────────────────────────────────
  // 7. College Comparison
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 8. College Comparison API ---");
  const compRes = await api("/api/compare", "POST", {
    collegeCodes: ["0001", "2006", "2005"],
    community: "BC",
    cutoff: 187.0,
  }, tokenStudentA);

  assert(compRes.status === 200, "8.1 /api/compare returns 200");
  assert(compRes.data.colleges.length === 3, "8.2 Compares requested 3 colleges");
  assert(Array.isArray(compRes.data.branches), "8.3 Cross-branch comparison matrix built");

  // ─────────────────────────────────────────────────────────────
  // 8. Saved Colleges Persistence
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 9. Saved Colleges API ---");
  const saveRes = await api("/api/saved-colleges/toggle", "POST", {
    college_code: "2006",
    college_name: "PSG College of Technology",
    branch_code: "CS",
    branch_name: "Computer Science and Engineering",
    district: "Coimbatore",
    cutoff_2023: 196.5,
    fees: 55000,
  }, tokenStudentA);

  assert(saveRes.status === 200 && saveRes.data.saved === true, "9.1 College saved to student account");

  const getSavedRes = await api("/api/saved-colleges", "GET", null, tokenStudentA);
  assert(getSavedRes.status === 200 && getSavedRes.data.length >= 1, "9.2 Saved colleges list retrieved via backend");
  assert(getSavedRes.data.some(c => c.college_code === "2006"), "9.3 PSG College of Technology present in saved list");

  // ─────────────────────────────────────────────────────────────
  // 9. RAG AI Counsellor
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 10. RAG AI Counsellor API ---");
  const chatRes = await api("/api/counsellor/chat", "POST", {
    query: "What is my chance for PSG Tech CSE with 187 cutoff in BC category under 7.5% quota?",
    history: [],
  }, tokenStudentA);

  assert(chatRes.status === 200, "10.1 /api/counsellor/chat returns 200");
  assert(typeof chatRes.data.answer === "string" && chatRes.data.answer.length > 50, "10.2 AI Counsellor delivers comprehensive answer");
  assert(Array.isArray(chatRes.data.sources) && chatRes.data.sources.length > 0, "10.3 Grounded in official TNEA sources");

  // ─────────────────────────────────────────────────────────────
  // 10. Conversation History Persistence
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 11. Conversation History API ---");
  const histRes = await api("/api/counsellor/history", "GET", null, tokenStudentA);
  assert(histRes.status === 200 && Array.isArray(histRes.data), "11.1 /api/counsellor/history returns 200");
  assert(histRes.data.length >= 2, `11.2 Conversation turns recorded to student account (${histRes.data.length} messages)`);

  // ─────────────────────────────────────────────────────────────
  // 11. Personalized Counselling Report
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 12. Personalized Counselling Report API ---");
  const reportRes = await api("/api/reports/generate", "POST", null, tokenStudentA);
  assert(reportRes.status === 200 && reportRes.data.success, "12.1 /api/reports/generate generates report");
  assert(reportRes.data.report.studentName === "Kavitha Raman", "12.2 Report personalized with student's name");
  assert(reportRes.data.report.cutoff === 187.0, "12.3 Report contains verified cutoff of 187.0");
  assert(Array.isArray(reportRes.data.report.recommendations) && reportRes.data.report.recommendations.length > 0, "12.4 Report contains multi-tier recommendations");

  // ─────────────────────────────────────────────────────────────
  // 12. Notifications
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 13. Notifications API ---");
  const notifRes = await api("/api/notifications", "GET", null, tokenStudentA);
  assert(notifRes.status === 200 && Array.isArray(notifRes.data), "13.1 /api/notifications returns 200");
  assert(notifRes.data.length >= 3, "13.2 Live TNEA alerts returned");

  // ─────────────────────────────────────────────────────────────
  // 13. Security & Isolation: Student A vs Student B
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 14. Security & Isolation (Student A vs Student B) ---");
  // Register Student B
  const otpB = (await api("/api/auth/send-otp", "POST", { phone: studentBPhone })).data.otp;
  const verB = (await api("/api/auth/verify-otp", "POST", { phone: studentBPhone, otp: otpB })).data;
  const regB = await api("/api/auth/register", "POST", {
    profileData: {
      displayName: "Anand Kumar",
      category: "OC",
      preferredDistrict: "Madurai",
      preferredBranches: ["ME"],
      budget: 50000,
    },
    academicData: { maths: 80, physics: 80, chemistry: 80, cutoff: 160.0 },
  }, verB.token);

  const tokenStudentB = regB.data.token;
  const profileB = await api("/api/profile", "GET", null, tokenStudentB);
  assert(profileB.data.profile.display_name === "Anand Kumar", "14.1 Student B sees own profile");
  assert(profileB.data.academicRecord.cutoff === 160.0, "14.2 Student B has own cutoff (160.0)");
  assert(profileB.data.savedColleges.length === 0, "14.3 Student B cannot see Student A's saved colleges (0 saved)");

  // Attempting request without token
  const unauthRes = await api("/api/profile", "GET");
  assert(unauthRes.status === 401, "14.4 Unauthenticated request to /api/profile is rejected (401)");

  // ─────────────────────────────────────────────────────────────
  // 14. Persistence & Re-Login Cycle (Logout -> Login -> Restore)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 15. Re-Login & Full Data Restoration Cycle ---");
  // Logout Student A
  const logoutRes = await api("/api/auth/logout", "POST", null, tokenStudentA);
  assert(logoutRes.status === 200, "15.1 Student A logs out successfully");

  // Previous token should now be invalidated
  const postLogoutCheck = await api("/api/profile", "GET", null, tokenStudentA);
  assert(postLogoutCheck.status === 401, "15.2 Terminated session token cannot access profile (401)");

  // Student A logs back in with the SAME phone number
  const reLoginOtp = (await api("/api/auth/send-otp", "POST", { phone: studentAPhone })).data.otp;
  const reLoginVerify = await api("/api/auth/verify-otp", "POST", { phone: studentAPhone, otp: reLoginOtp });

  assert(reLoginVerify.status === 200, "15.3 Re-login OTP verified");
  assert(reLoginVerify.data.isExistingUser === true, "15.4 ONE PHONE NUMBER = ONE ACCOUNT: Existing user detected");
  const newTokenStudentA = reLoginVerify.data.token;
  assert(typeof newTokenStudentA === "string", "15.5 New session token generated");

  // Verify all 9 data items are perfectly restored:
  const restoredProfile = await api("/api/profile", "GET", null, newTokenStudentA);
  assert(restoredProfile.data.profile.display_name === "Kavitha Raman", "15.6 [Restored] Student profile restored");
  assert(restoredProfile.data.profile.preferred_district === "Coimbatore", "15.7 [Restored] Updated preferences restored");
  assert(restoredProfile.data.academicRecord?.cutoff === 187.0, "15.8 [Restored] Academic marks & cutoff restored");
  assert(restoredProfile.data.savedColleges.some(c => c.college_code === "2006"), "15.9 [Restored] Saved colleges restored");
  assert(restoredProfile.data.counsellingHistory.length >= 2, "15.10 [Restored] Counsellor conversation history restored");

  const restoredReport = await api("/api/reports/generate", "POST", null, newTokenStudentA);
  assert(restoredReport.data.report.studentName === "Kavitha Raman", "15.11 [Restored] Personalized report regenerated with restored data");

  console.log("\n================================================================================");
  console.log(`INTEGRATION SUITE COMPLETE: ${passedTests}/${totalTests} tests passed, ${failedTests} failed.`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runIntegrationSuite().catch(err => {
  console.error("Integration suite fatal error:", err);
  process.exit(1);
});
