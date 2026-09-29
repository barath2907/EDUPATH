/**
 * Mock OTP Authentication — Demo / Development mode only.
 *
 * Real phone SMS requires an SMS provider (Twilio etc.) configured in
 * Supabase → Authentication → Providers → Phone. Until that is set up,
 * this module provides a fully functional mock that:
 *   1. Generates a random 6-digit OTP per request.
 *   2. Displays it in the UI (demo mode banner).
 *   3. Verifies it with expiry and single-use enforcement.
 *   4. Authenticates via Supabase email+password using deterministic
 *      credentials derived from the normalized phone number, so each
 *      phone maps to exactly one Supabase user across sessions.
 *
 * To switch to production SMS OTP, replace `sendOtp` / `verifyOtp` in
 * AuthContext with Supabase's `signInWithOtp({ phone })` /
 * `verifyOtp({ phone, token, type: 'sms' })` and delete this file.
 *
 * ⚠️  Never use derived passwords in a real production system.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

export function normalizePhone(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${countryCode}${digits}`;
}

/** Derive a stable email address from the normalized phone number. */
export function deriveEmail(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/\D/g, "");
  // Prefix with "p" so the local part isn't all-numeric (rejected by some validators)
  // example.com is IANA-reserved for testing — safe, always valid, never blocked
  return `p${digits}@example.com`;
}

/**
 * Derive a stable password from the normalized phone number.
 * This is intentionally deterministic for demo purposes only.
 */
export function derivePassword(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/\D/g, "");
  return `EduPath_${digits}_Demo2024!`;
}

export interface PendingOtp {
  otp: string;
  phone: string;
  expiresAt: number;
  used: boolean;
}

/** Validate a submitted OTP against the pending OTP record. */
export function validateOtp(
  pending: PendingOtp | null,
  phone: string,
  submitted: string
): { valid: boolean; reason?: string } {
  if (!pending) return { valid: false, reason: "No OTP was requested. Please send OTP first." };
  if (pending.phone !== phone) return { valid: false, reason: "Phone number mismatch." };
  if (pending.used) return { valid: false, reason: "This OTP has already been used." };
  if (Date.now() > pending.expiresAt) return { valid: false, reason: "OTP has expired. Please request a new one." };
  if (submitted !== pending.otp) return { valid: false, reason: "Incorrect OTP. Please try again." };
  return { valid: true };
}

export function createPendingOtp(phone: string): PendingOtp {
  return {
    otp: generateOtp(),
    phone,
    expiresAt: Date.now() + OTP_TTL_MS,
    used: false,
  };
}
