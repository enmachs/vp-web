// The "how did you hear about us?" answers offered by the landing quote form
// (features/landing/components/Tender.tsx) and stored on QuoteRequest.
//
// Kept dependency-free for the same reason as upload-limits.ts: the landing
// form bundles this into the browser.
//
// The form used to submit the visible label, so the same answer arrived as
// "Recomendación" or "Referral" depending on the language toggle. `value` is
// what gets stored; the labels are presentation only.
export const HEARD_OPTIONS = [
  { value: "instagram", labelEs: "Instagram", labelEn: "Instagram" },
  { value: "facebook", labelEs: "Facebook", labelEn: "Facebook" },
  { value: "tiktok", labelEs: "TikTok", labelEn: "TikTok" },
  { value: "whatsapp", labelEs: "WhatsApp", labelEn: "WhatsApp" },
  { value: "referral", labelEs: "Recomendación", labelEn: "Referral" },
  { value: "google", labelEs: "Google", labelEn: "Google" },
  { value: "other", labelEs: "Otro", labelEn: "Other" },
] as const;

export type HeardKey = (typeof HEARD_OPTIONS)[number]["value"];

export function isHeardKey(value: unknown): value is HeardKey {
  return HEARD_OPTIONS.some((o) => o.value === value);
}

/** The languages the landing page toggles between. */
export const LANGUAGE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
] as const;

export type LanguageKey = (typeof LANGUAGE_OPTIONS)[number]["value"];

export function isLanguageKey(value: unknown): value is LanguageKey {
  return LANGUAGE_OPTIONS.some((o) => o.value === value);
}
