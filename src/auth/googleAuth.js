import { jwtDecode } from "jwt-decode";

/** Google accounts allowed to access the admin portal (mock / fallback). */
export const ADMIN_GOOGLE_EMAILS = [
  "lyzakythbalili@gmail.com",
  "wateroffice@barangay-kinamlutan.gov.ph",
];

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
}

export function decodeGoogleCredential(credential) {
  if (!credential) return null;
  try {
    const payload = jwtDecode(credential);
    return {
      email: (payload.email || "").toLowerCase(),
      name: payload.name || "",
      picture: payload.picture || "",
    };
  } catch {
    return null;
  }
}

export function isAdminGoogleEmail(email) {
  return ADMIN_GOOGLE_EMAILS.includes((email || "").toLowerCase());
}

export function findHouseholdByEmail(households, email) {
  const normalized = (email || "").toLowerCase();
  return households.find((h) => (h.email || "").toLowerCase() === normalized) || null;
}
