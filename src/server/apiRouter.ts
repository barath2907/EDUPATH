/**
 * EduPath — Backend API HTTP Router & Dispatcher
 * 
 * Routes incoming REST API calls (/api/*) to the corresponding BackendService handlers.
 * Extracts Bearer token from the Authorization header and verifies sessions.
 */

import { BackendService } from "./backendService.ts";

export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
}

export interface ApiResponse {
  status: number;
  headers?: Record<string, string>;
  data: any;
}

export async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  const parsedUrl = new URL(req.url, "http://localhost:8443");
  const path = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Extract Bearer token
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  let token = "";
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  try {
    // ──────────────────────────────────────────────
    // 1. Authentication Routes
    // ──────────────────────────────────────────────
    if (path === "/api/auth/send-otp" && method === "POST") {
      const { phone, countryCode } = req.body || {};
      if (!phone) return { status: 400, data: { error: "Phone number is required." } };
      const res = BackendService.auth.sendOtp(phone, countryCode);
      return { status: 200, data: res };
    }

    if (path === "/api/auth/verify-otp" && method === "POST") {
      const { phone, countryCode, otp } = req.body || {};
      if (!phone || !otp) return { status: 400, data: { error: "Phone and OTP are required." } };
      const res = await BackendService.auth.verifyOtp(phone, countryCode, otp);
      return { status: res.success ? 200 : 400, data: res };
    }

    if (path === "/api/auth/register" && method === "POST") {
      const { profileData, academicData } = req.body || {};
      if (!token) return { status: 401, data: { error: "Registration session token required." } };
      const res = await BackendService.auth.register(token, profileData, academicData);
      return { status: res.success ? 200 : 400, data: res };
    }

    if (path === "/api/auth/session" && method === "POST") {
      if (!token) return { status: 401, data: { error: "Session token required." } };
      const account = await BackendService.auth.getSession(token);
      if (!account) return { status: 401, data: { error: "Invalid or expired session." } };
      return { status: 200, data: { success: true, account } };
    }

    if (path === "/api/auth/logout" && method === "POST") {
      if (token) BackendService.auth.logout(token);
      return { status: 200, data: { success: true, message: "Session terminated." } };
    }

    // ──────────────────────────────────────────────
    // 2. Student Profile Routes (Authenticated)
    // ──────────────────────────────────────────────
    if (path === "/api/profile" && method === "GET") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const account = await BackendService.profile.get(token);
      if (!account) return { status: 401, data: { error: "Invalid or expired session token." } };
      return { status: 200, data: account };
    }

    if (path === "/api/profile" && method === "PUT") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const updated = await BackendService.profile.update(token, req.body);
      if (!updated) return { status: 401, data: { error: "Invalid or expired session token." } };
      return { status: 200, data: { success: true, profile: updated } };
    }

    if (path === "/api/profile/academic" && method === "POST") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const record = await BackendService.profile.saveAcademic(token, req.body);
      if (!record) return { status: 401, data: { error: "Invalid or expired session token." } };
      return { status: 200, data: { success: true, record } };
    }

    // ──────────────────────────────────────────────
    // 3. TNEA Cutoff Calculator
    // ──────────────────────────────────────────────
    if (path === "/api/cutoff/calculate" && method === "POST") {
      const { maths, physics, chemistry, saveToProfile, category } = req.body || {};
      const res = await BackendService.cutoff.calculate(token, maths, physics, chemistry, saveToProfile, category);
      return { status: 200, data: res };
    }

    // ──────────────────────────────────────────────
    // 4. TNEA Master Data Routes
    // ──────────────────────────────────────────────
    if (path === "/api/tnea/colleges" && method === "GET") {
      const category = parsedUrl.searchParams.get("category") || "OC";
      const colleges = await BackendService.tneaData.getColleges(category);
      return { status: 200, data: colleges };
    }

    if (path.startsWith("/api/tnea/colleges/") && method === "GET") {
      const code = path.replace("/api/tnea/colleges/", "").trim();
      const category = parsedUrl.searchParams.get("category") || "OC";
      const college = await BackendService.tneaData.getCollegeByCode(code, category);
      if (!college) return { status: 404, data: { error: "College not found" } };
      return { status: 200, data: college };
    }

    if (path === "/api/tnea/branches" && method === "GET") {
      return { status: 200, data: BackendService.tneaData.getBranches() };
    }

    if (path === "/api/tnea/cutoffs" && method === "GET") {
      const category = parsedUrl.searchParams.get("category") || "OC";
      const cutoffs = await BackendService.tneaData.getCutoffs(category);
      return { status: 200, data: cutoffs };
    }

    if (path === "/api/tnea/seats" && method === "GET") {
      return { status: 200, data: BackendService.tneaData.getSeatMatrix() };
    }

    if (path === "/api/tnea/sync-status" && method === "GET") {
      return { status: 200, data: BackendService.tneaData.getSyncStatus() };
    }

    // ──────────────────────────────────────────────
    // 5. ML Admission Prediction
    // ──────────────────────────────────────────────
    if (path === "/api/prediction/predict" && method === "POST") {
      const prediction = await BackendService.ml.predict(token, req.body);
      return { status: 200, data: prediction };
    }

    // ──────────────────────────────────────────────
    // 6. College Recommendations
    // ──────────────────────────────────────────────
    if (path === "/api/recommendations" && method === "POST") {
      const recommendations = await BackendService.recommendations.get(token, req.body);
      return { status: 200, data: recommendations };
    }

    // ──────────────────────────────────────────────
    // 7. College Comparison
    // ──────────────────────────────────────────────
    if (path === "/api/compare" && method === "POST") {
      const { collegeCodes, community, cutoff } = req.body || {};
      const res = await BackendService.comparison.compare(token, collegeCodes || [], community, cutoff);
      return { status: 200, data: res };
    }

    // ──────────────────────────────────────────────
    // 8. Saved Colleges (Authenticated)
    // ──────────────────────────────────────────────
    if (path === "/api/saved-colleges" && method === "GET") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const colleges = await BackendService.savedColleges.get(token);
      return { status: 200, data: colleges };
    }

    if (path === "/api/saved-colleges/toggle" && method === "POST") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const res = await BackendService.savedColleges.toggle(token, req.body);
      return { status: 200, data: res };
    }

    // ──────────────────────────────────────────────
    // 9. RAG AI Counsellor
    // ──────────────────────────────────────────────
    if (path === "/api/counsellor/chat" && method === "POST") {
      const { query, history } = req.body || {};
      if (!query) return { status: 400, data: { error: "Query is required." } };
      const res = await BackendService.counsellor.chat(token, query, history || []);
      return { status: 200, data: res };
    }

    if (path === "/api/counsellor/history" && method === "GET") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const history = await BackendService.counsellor.getHistory(token);
      return { status: 200, data: history };
    }

    // ──────────────────────────────────────────────
    // 10. Personalized Counselling Report
    // ──────────────────────────────────────────────
    if (path === "/api/reports/generate" && method === "POST") {
      if (!token) return { status: 401, data: { error: "Unauthorized." } };
      const res = await BackendService.report.generate(token);
      return { status: 200, data: res };
    }

    // ──────────────────────────────────────────────
    // 11. Notifications
    // ──────────────────────────────────────────────
    if (path === "/api/notifications" && method === "GET") {
      const notifs = BackendService.notifications.get(token);
      return { status: 200, data: notifs };
    }

    return { status: 404, data: { error: `Endpoint not found: ${method} ${path}` } };
  } catch (err: any) {
    console.error(`[ApiRouter Error] ${method} ${path}:`, err);
    return { status: 500, data: { error: err?.message || "Internal server error" } };
  }
}
