/**
 * EduPath — Frontend Backend API Client
 * 
 * Secure HTTP Client for all EduPath modules:
 * 1. Authentication (sendOtp, verifyOtp, register, getSession, logout)
 * 2. Student Profile (getProfile, updateProfile, saveAcademic)
 * 3. TNEA Cutoff Calculator (calculateCutoff)
 * 4. TNEA Data (getColleges, getCollegeByCode, getBranches, getCutoffs, getSeatMatrix, getSyncStatus)
 * 5. ML Admission Prediction (predict)
 * 6. College Recommendations (getRecommendations)
 * 7. College Comparison (compareColleges)
 * 8. Saved Colleges (getSavedColleges, toggleSavedCollege)
 * 9. RAG AI Counsellor (chatWithCounsellor, getCounsellingHistory)
 * 10. Personalized Report (generateReport)
 * 11. Notifications (getNotifications)
 * 
 * Automatically attaches Authorization: Bearer <token> for all personalized calls.
 * Never allows Student A to access Student B's records.
 */

import { handleApiRequest } from "../server/apiRouter";
import type { CompleteStudentAccount, StudentProfile, StudentAcademicRecord, SavedCollegeItem, CounsellingChatMessage } from "./studentAccountService";
import type { CollegeWithBranches } from "./tneaData";
import type { ModelPredictionInput, ModelPredictionResult } from "./mlPrediction";
import type { RecommendationRequest, RecommendedOption } from "./recommendationEngine";
import type { ComparisonSessionResult } from "./comparisonEngine";
import type { AgentResponse } from "./counsellorAgent";

const SESSION_TOKEN_KEY = "edupath_auth_token_v1";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {}
}

/**
 * Universal Request Dispatcher:
 * Sends HTTP request to /api/* endpoints. If the dev server handles it via HTTP, uses fetch.
 * Also provides in-app fallback to handleApiRequest for guaranteed resilience.
 */
async function apiRequest<T = any>(
  path: string,
  method = "GET",
  body?: any,
  customToken?: string
): Promise<T> {
  const token = customToken || getSessionToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If an external backend API URL is explicitly configured, try remote HTTP fetch
  const externalApiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (externalApiBase) {
    try {
      const fullUrl = `${externalApiBase.replace(/\/$/, "")}${path}`;
      const res = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        return (await res.json()) as T;
      }
      if (res.status < 500 && contentType.includes("application/json")) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
    } catch (netErr: any) {
      console.warn("[EduPath API] Remote API failed, fallback to in-app router:", netErr);
    }
  }

  // In-app direct server router (handles auth, colleges, recommendations, AI counsellor, reports offline & on static hosts)
  const response = await handleApiRequest({
    method,
    url: path,
    headers,
    body,
  });

  if (response.status >= 400) {
    throw new Error(response.data?.error || `Request failed with status ${response.status}`);
  }

  return response.data as T;
}

export const EduPathAPI = {
  // ──────────────────────────────────────────────
  // 1. Authentication
  // ──────────────────────────────────────────────
  auth: {
    async sendOtp(phone: string, countryCode = "+91") {
      return await apiRequest<{ success: boolean; phone: string; otp: string }>(
        "/api/auth/send-otp",
        "POST",
        { phone, countryCode }
      );
    },

    async verifyOtp(phone: string, countryCode = "+91", otp: string) {
      const res = await apiRequest<{
        success: boolean;
        isExistingUser: boolean;
        token?: string;
        account?: CompleteStudentAccount;
        error?: string;
      }>("/api/auth/verify-otp", "POST", { phone, countryCode, otp });

      if (res.token) {
        setSessionToken(res.token);
      }
      return res;
    },

    async register(profileData: any, academicData?: any) {
      const res = await apiRequest<{
        success: boolean;
        token: string;
        account: CompleteStudentAccount;
        error?: string;
      }>("/api/auth/register", "POST", { profileData, academicData });

      if (res.token) {
        setSessionToken(res.token);
      }
      return res;
    },

    async restoreSession() {
      const token = getSessionToken();
      if (!token) return null;
      try {
        const res = await apiRequest<{ success: boolean; account: CompleteStudentAccount }>(
          "/api/auth/session",
          "POST"
        );
        return res.account;
      } catch {
        setSessionToken(null);
        return null;
      }
    },

    async logout() {
      try {
        await apiRequest("/api/auth/logout", "POST");
      } catch {}
      setSessionToken(null);
    },
  },

  // ──────────────────────────────────────────────
  // 2. Student Profile
  // ──────────────────────────────────────────────
  profile: {
    async get(): Promise<CompleteStudentAccount> {
      return await apiRequest<CompleteStudentAccount>("/api/profile", "GET");
    },

    async update(patch: Partial<StudentProfile>): Promise<StudentProfile> {
      const res = await apiRequest<{ success: boolean; profile: StudentProfile }>(
        "/api/profile",
        "PUT",
        patch
      );
      return res.profile;
    },

    async saveAcademic(record: Omit<StudentAcademicRecord, "user_id" | "phone">): Promise<StudentAcademicRecord> {
      const res = await apiRequest<{ success: boolean; record: StudentAcademicRecord }>(
        "/api/profile/academic",
        "POST",
        record
      );
      return res.record;
    },
  },

  // ──────────────────────────────────────────────
  // 3. TNEA Cutoff Calculator
  // ──────────────────────────────────────────────
  cutoff: {
    async calculate(maths: number, physics: number, chemistry: number, saveToProfile = false, category = "OC") {
      return await apiRequest<{
        maths: number;
        physics: number;
        chemistry: number;
        physicsContribution: number;
        chemistryContribution: number;
        totalCutoff: number;
        formula: string;
        maxCutoff: number;
        saved?: boolean;
        academicRecord?: StudentAcademicRecord | null;
        calculatedAt: string;
      }>("/api/cutoff/calculate", "POST", { maths, physics, chemistry, saveToProfile, category });
    },
  },

  // ──────────────────────────────────────────────
  // 4. TNEA Master Data
  // ──────────────────────────────────────────────
  tneaData: {
    async getColleges(category = "OC"): Promise<CollegeWithBranches[]> {
      return await apiRequest<CollegeWithBranches[]>(`/api/tnea/colleges?category=${category}`, "GET");
    },

    async getCollegeByCode(code: string, category = "OC"): Promise<CollegeWithBranches | null> {
      return await apiRequest<CollegeWithBranches>(`/api/tnea/colleges/${code}?category=${category}`, "GET");
    },

    async getBranches() {
      return await apiRequest<Array<{ code: string; name: string; degree: string }>>("/api/tnea/branches", "GET");
    },

    async getCutoffs(category = "OC") {
      return await apiRequest<any[]>(`/api/tnea/cutoffs?category=${category}`, "GET");
    },

    async getSeatMatrix() {
      return await apiRequest<any[]>("/api/tnea/seats", "GET");
    },

    async getSyncStatus() {
      return await apiRequest<any>("/api/tnea/sync-status", "GET");
    },
  },

  // ──────────────────────────────────────────────
  // 5. ML Admission Prediction
  // ──────────────────────────────────────────────
  ml: {
    async predict(input: ModelPredictionInput): Promise<ModelPredictionResult> {
      return await apiRequest<ModelPredictionResult>("/api/prediction/predict", "POST", input);
    },
  },

  // ──────────────────────────────────────────────
  // 6. College Recommendations
  // ──────────────────────────────────────────────
  recommendations: {
    async get(filters: Partial<RecommendationRequest> = {}): Promise<RecommendedOption[]> {
      return await apiRequest<RecommendedOption[]>("/api/recommendations", "POST", filters);
    },
  },

  // ──────────────────────────────────────────────
  // 7. College Comparison
  // ──────────────────────────────────────────────
  comparison: {
    async compare(collegeCodes: string[], community = "OC", cutoff?: number): Promise<ComparisonSessionResult> {
      return await apiRequest<ComparisonSessionResult>("/api/compare", "POST", { collegeCodes, community, cutoff });
    },
  },

  // ──────────────────────────────────────────────
  // 8. Saved Colleges
  // ──────────────────────────────────────────────
  savedColleges: {
    async get(): Promise<SavedCollegeItem[]> {
      return await apiRequest<SavedCollegeItem[]>("/api/saved-colleges", "GET");
    },

    async toggle(item: Omit<SavedCollegeItem, "user_id" | "phone">): Promise<{ saved: boolean; colleges: SavedCollegeItem[] }> {
      return await apiRequest<{ saved: boolean; colleges: SavedCollegeItem[] }>(
        "/api/saved-colleges/toggle",
        "POST",
        item
      );
    },
  },

  // ──────────────────────────────────────────────
  // 9. RAG AI Counsellor
  // ──────────────────────────────────────────────
  counsellor: {
    async chat(query: string, history: Array<{ role: "user" | "assistant"; content: string }> = []): Promise<AgentResponse> {
      return await apiRequest<AgentResponse>("/api/counsellor/chat", "POST", { query, history });
    },

    async getHistory(): Promise<CounsellingChatMessage[]> {
      return await apiRequest<CounsellingChatMessage[]>("/api/counsellor/history", "GET");
    },
  },

  // ──────────────────────────────────────────────
  // 10. Personalized Counselling Report
  // ──────────────────────────────────────────────
  report: {
    async generate(): Promise<{ success: boolean; report: any; generatedAt: string; studentName: string; phone: string }> {
      return await apiRequest("/api/reports/generate", "POST");
    },
  },

  // ──────────────────────────────────────────────
  // 11. Notifications
  // ──────────────────────────────────────────────
  notifications: {
    async get(): Promise<any[]> {
      return await apiRequest<any[]>("/api/notifications", "GET");
    },
  },
};
