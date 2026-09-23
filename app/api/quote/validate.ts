import {
  isHeardKey,
  isLanguageKey,
  type HeardKey,
  type LanguageKey,
} from "@/features/keystone/lib/heard-options";

/**
 * Validation and normalisation for the landing quote form's payload, kept
 * separate from route.ts so tests/unit can cover it without Resend or a
 * database.
 *
 * The client validates too, but we never trust it alone.
 */

/** What the browser posts. */
export interface QuotePayload {
  fullName: string;
  fromLocation: string;
  toLocation: string;
  /** Omitted when the ServiceType read failed — see normalizeQuotePayload. */
  serviceTypeId?: string;
  /** The option label the visitor actually saw, in their language. */
  serviceTypeLabel?: string;
  phone: string;
  howHeardFromUs?: string;
  details?: string;
  language?: string;
}

/** What the route handler and saveQuoteRequest work with. */
export interface NormalizedQuote {
  fullName: string;
  fromLocation: string;
  toLocation: string;
  serviceTypeId: string | null;
  serviceTypeLabel: string;
  phone: string;
  howHeardFromUs: HeardKey | null;
  details: string;
  language: LanguageKey;
}

export const MAX_LENGTHS = {
  fullName: 120,
  fromLocation: 100,
  toLocation: 100,
  serviceTypeId: 40,
  serviceTypeLabel: 60,
  phone: 30,
  howHeardFromUs: 40,
  details: 1200,
} as const;

export const MIN_PHONE_LENGTH = 7;

const REQUIRED = [
  "fullName",
  "fromLocation",
  "toLocation",
  "phone",
] as const satisfies readonly (keyof QuotePayload)[];

export type NormalizeResult =
  | { ok: true; value: NormalizedQuote }
  | { ok: false; errors: string[] };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Three fields are deliberately lenient rather than rejected, because every
 * one of them can go stale on a visitor's cached page and none is worth losing
 * a lead over:
 *
 * - `serviceTypeId` is optional. The landing page is ISR with revalidate = 60,
 *   and it degrades to no options at all when the ServiceType read fails (see
 *   features/landing/lib/published.ts), so the form is allowed to submit
 *   without one.
 * - an unrecognised `howHeardFromUs` is dropped to null rather than rejected.
 *   The dropdown is closed, so an unknown key means a stale or tampered
 *   client; storing nothing is better than turning it away.
 * - an unrecognised `language` falls back to Spanish.
 */
export function normalizeQuotePayload(data: unknown): NormalizeResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["Invalid payload"] };
  }

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  for (const field of REQUIRED) {
    if (!str(d[field])) errors.push(`${field} is required`);
  }

  const phone = str(d.phone);
  if (phone && phone.length < MIN_PHONE_LENGTH) {
    errors.push("Phone number is too short");
  }

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    if (str(d[field]).length > max) errors.push(`${field} exceeds maximum length`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName: str(d.fullName),
      fromLocation: str(d.fromLocation),
      toLocation: str(d.toLocation),
      serviceTypeId: str(d.serviceTypeId) || null,
      serviceTypeLabel: str(d.serviceTypeLabel),
      phone,
      howHeardFromUs: isHeardKey(str(d.howHeardFromUs)) ? (str(d.howHeardFromUs) as HeardKey) : null,
      details: str(d.details),
      language: isLanguageKey(str(d.language)) ? (str(d.language) as LanguageKey) : "es",
    },
  };
}
