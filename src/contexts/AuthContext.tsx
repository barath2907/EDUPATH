import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { EduPathAPI } from "../lib/apiClient";
import {
  normalizePhone,
  setActiveStudentPhone,
  type StudentProfile,
  type StudentAcademicRecord,
  type SavedCollegeItem,
  type CounsellingChatMessage,
  type CompleteStudentAccount,
} from "../lib/studentAccountService";

export type Profile = StudentProfile;

interface VerifyOtpResult {
  error: string | null;
  isExistingUser?: boolean;
  phone?: string;
  profile?: StudentProfile | null;
}

interface AuthContextValue {
  session: Session | null;
  user: { id: string; phone?: string | null; email?: string | null } | null;
  profile: StudentProfile | null;
  academicRecord: StudentAcademicRecord | null;
  savedColleges: SavedCollegeItem[];
  comparisonCodes: string[];
  counsellingHistory: CounsellingChatMessage[];
  loading: boolean;
  isLocalMode: boolean;
  pendingOtp: { phone: string; otp: string } | null;
  sendOtp: (rawPhone: string, countryCode: string) => { otp: string };
  verifyOtp: (rawPhone: string, countryCode: string, token: string) => Promise<VerifyOtpResult>;
  registerNewStudent: (
    phone: string,
    profileData: {
      displayName: string;
      dob?: string;
      category: string;
      school?: string;
      passingYear?: string;
      preferredDistrict: string;
      preferredBranches: string[];
      budget: number;
      language?: string;
      isGovernmentSchoolQuota?: boolean;
      isFirstGraduate?: boolean;
      specialReservation?: string;
    },
    academicData?: {
      maths: number;
      physics: number;
      chemistry: number;
      cutoff: number;
      academicYear?: string;
    }
  ) => Promise<CompleteStudentAccount>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (patch: Partial<Profile>) => Promise<void>;
  saveAcademic: (record: Omit<StudentAcademicRecord, "user_id" | "phone">) => Promise<StudentAcademicRecord | null>;
  toggleSavedCollege: (college: Omit<SavedCollegeItem, "user_id" | "phone">) => Promise<boolean>;
  setComparisonCodes: (codes: string[]) => void;
  addCounsellingMessage: (msg: { role: "user" | "assistant"; content: string; sources?: any }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<{ id: string; phone?: string | null; email?: string | null } | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord | null>(null);
  const [savedColleges, setSavedColleges] = useState<SavedCollegeItem[]>([]);
  const [comparisonCodes, setComparisonCodesState] = useState<string[]>(["0001", "2006", "2005"]);
  const [counsellingHistory, setCounsellingHistory] = useState<CounsellingChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setLocalMode] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<{ phone: string; otp: string } | null>(null);
  const activePhoneRef = useRef<string | null>(null);

  const applyStudentAccount = useCallback((account: CompleteStudentAccount) => {
    console.log("[AUTH] applyStudentAccount called for:", account.profile.user_id, "|", account.profile.phone);
    setProfile(account.profile);
    setUser({
      id: account.profile.user_id,
      phone: account.profile.phone,
      email: account.profile.email,
    });
    setAcademicRecord(account.academicRecord);
    setSavedColleges(account.savedColleges || []);
    setComparisonCodesState(account.comparisonCodes || ["0001", "2006", "2005"]);
    setCounsellingHistory(account.counsellingHistory || []);
    activePhoneRef.current = account.profile.phone;
    setActiveStudentPhone(account.profile.phone);
    console.log("[AUTH] Auth state updated — profile:", account.profile.display_name);
  }, []);

  // Restore persistent student session on mount via Backend API
  useEffect(() => {
    const initAuth = async () => {
      console.log("[AUTH] Initializing — restoring session from token storage");
      try {
        const restoredAccount = await EduPathAPI.auth.restoreSession();
        if (restoredAccount) {
          console.log("[AUTH] Session restored for:", restoredAccount.profile.phone);
          applyStudentAccount(restoredAccount);
        } else {
          console.log("[AUTH] No valid session found — user needs to login");
        }
      } catch (e) {
        console.warn("[AUTH] Session restore error:", e);
      } finally {
        setLoading(false);
        console.log("[AUTH] Auth init complete");
      }
    };

    initAuth();
  }, [applyStudentAccount]);

  const sendOtp = useCallback((rawPhone: string, countryCode: string): { otp: string } => {
    const phone = normalizePhone(rawPhone, countryCode);
    const digits = phone.replace(/\D/g, "");
    const last4 = digits.slice(-4);
    const otp = last4.length === 4 ? `${last4[0]}${last4[1]}${last4[2]}${last4[3]}99`.slice(0, 6) : "123456";

    // Asynchronously dispatch through backend API
    EduPathAPI.auth.sendOtp(rawPhone, countryCode).catch(err => {
      console.warn("Backend sendOtp note:", err);
    });

    const pending = { phone, otp };
    setPendingOtp(pending);
    return { otp };
  }, []);

  /**
   * Verify OTP via Backend API:
   * IF phone exists in PostgreSQL / persistent storage:
   *   Automatically logs student into permanent account and restores all past data!
   * IF phone does not exist:
   *   Returns isExistingUser: false so UI shows "Create Your New Account"
   */
  const verifyOtp = useCallback(async (
    rawPhone: string,
    countryCode: string,
    token: string
  ): Promise<VerifyOtpResult> => {
    try {
      const res = await EduPathAPI.auth.verifyOtp(rawPhone, countryCode, token);

      if (!res.success && res.error) {
        return { error: res.error };
      }

      if (res.isExistingUser && res.account) {
        applyStudentAccount(res.account);
        return {
          error: null,
          isExistingUser: true,
          phone: res.account.profile.phone,
          profile: res.account.profile,
        };
      }

      return {
        error: null,
        isExistingUser: false,
        phone: normalizePhone(rawPhone, countryCode),
        profile: null,
      };
    } catch (err: any) {
      return { error: err?.message || "Verification failed. Please try again." };
    }
  }, [applyStudentAccount]);

  /**
   * Completes registration for a new student, creating permanent account in PostgreSQL via Backend API.
   */
  const registerNewStudent = useCallback(async (
    phone: string,
    profileData: {
      displayName: string;
      dob?: string;
      category: string;
      school?: string;
      passingYear?: string;
      preferredDistrict: string;
      preferredBranches: string[];
      budget: number;
      language?: string;
      isGovernmentSchoolQuota?: boolean;
      isFirstGraduate?: boolean;
      specialReservation?: string;
    },
    academicData?: {
      maths: number;
      physics: number;
      chemistry: number;
      cutoff: number;
      academicYear?: string;
    }
  ): Promise<CompleteStudentAccount> => {
    console.log("[AUTH] registerNewStudent called for phone:", phone);
    const res = await EduPathAPI.auth.register(profileData, academicData);
    if (!res.success || !res.account) {
      throw new Error(res.error || "Registration failed on backend.");
    }
    console.log("[AUTH] Registration success — calling applyStudentAccount");
    applyStudentAccount(res.account);
    console.log("[AUTH] Session token stored:", !!res.token);
    return res.account;
  }, [applyStudentAccount]);

  const refreshProfile = useCallback(async () => {
    try {
      const account = await EduPathAPI.profile.get();
      if (account) {
        applyStudentAccount(account);
      }
    } catch (err) {
      console.warn("Could not refresh profile via backend:", err);
    }
  }, [applyStudentAccount]);

  const updateLocalProfile = useCallback(async (patch: Partial<Profile>) => {
    try {
      const updated = await EduPathAPI.profile.update(patch);
      if (updated) {
        setProfile(updated);
      }
    } catch (err) {
      console.warn("Profile update via backend error:", err);
    }
  }, []);

  const saveAcademic = useCallback(async (record: Omit<StudentAcademicRecord, "user_id" | "phone">) => {
    try {
      const saved = await EduPathAPI.profile.saveAcademic(record);
      if (saved) {
        setAcademicRecord(saved);
      }
      return saved;
    } catch (err) {
      console.warn("Academic record save via backend error:", err);
      return null;
    }
  }, []);

  const toggleSavedCollege = useCallback(async (college: Omit<SavedCollegeItem, "user_id" | "phone">) => {
    try {
      const res = await EduPathAPI.savedColleges.toggle(college);
      setSavedColleges(res.colleges);
      return res.saved;
    } catch (err) {
      console.warn("Saved college toggle via backend error:", err);
      return false;
    }
  }, []);

  const setComparisonCodes = useCallback((codes: string[]) => {
    setComparisonCodesState(codes);
    EduPathAPI.comparison.compare(codes).catch(err => {
      console.warn("Comparison codes sync note:", err);
    });
  }, []);

  const addCounsellingMessage = useCallback(async (msg: { role: "user" | "assistant"; content: string; sources?: any }) => {
    const newMsg: CounsellingChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: user?.id || "guest",
      phone: activePhoneRef.current || "",
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      created_at: new Date().toISOString(),
    };
    setCounsellingHistory(prev => [...prev, newMsg]);
  }, [user?.id]);

  const signOut = useCallback(async () => {
    console.log("[AUTH] Signing out — clearing session only (data preserved)");
    try {
      await EduPathAPI.auth.logout();
    } catch {}
    setProfile(null);
    setUser(null);
    setAcademicRecord(null);
    setSavedColleges([]);
    setCounsellingHistory([]);
    setPendingOtp(null);
    setLocalMode(false);
    activePhoneRef.current = null;
    setActiveStudentPhone(null);
    console.log("[AUTH] Signed out — session cleared, database data preserved");
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      academicRecord,
      savedColleges,
      comparisonCodes,
      counsellingHistory,
      loading,
      isLocalMode,
      pendingOtp,
      sendOtp,
      verifyOtp,
      registerNewStudent,
      signOut,
      refreshProfile,
      updateLocalProfile,
      saveAcademic,
      toggleSavedCollege,
      setComparisonCodes,
      addCounsellingMessage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
