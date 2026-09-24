import { describe, expect, it } from "vitest";

import {
  MAX_LENGTHS,
  MIN_PHONE_LENGTH,
  normalizeQuotePayload,
} from "@/app/api/quote/validate";

/** A payload that should always pass, so each test varies exactly one thing. */
function valid(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "María Rodríguez",
    fromLocation: "Punto Fijo",
    toLocation: "Caracas",
    serviceTypeId: "cmudm95s4000013btyfaetubb",
    serviceTypeLabel: "Viajes",
    phone: "+58 414 1234567",
    howHeardFromUs: "referral",
    details: "Dos pasajeros",
    language: "es",
    ...overrides,
  };
}

function errorsFor(payload: unknown): string[] {
  const result = normalizeQuotePayload(payload);
  return result.ok ? [] : result.errors;
}

describe("normalizeQuotePayload", () => {
  it("accepts a complete payload and trims every string", () => {
    const result = normalizeQuotePayload(valid({ fullName: "  Ana  ", details: " hola " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fullName).toBe("Ana");
    expect(result.value.details).toBe("hola");
    expect(result.value.howHeardFromUs).toBe("referral");
    expect(result.value.language).toBe("es");
  });

  it.each(["fullName", "fromLocation", "toLocation", "phone"])(
    "rejects a missing %s",
    (field) => {
      expect(errorsFor(valid({ [field]: "" }))).toContain(`${field} is required`);
    }
  );

  it("treats a whitespace-only required field as missing", () => {
    expect(errorsFor(valid({ fullName: "   " }))).toContain("fullName is required");
  });

  it("rejects a phone number below the minimum length", () => {
    expect(errorsFor(valid({ phone: "1".repeat(MIN_PHONE_LENGTH - 1) }))).toContain(
      "Phone number is too short"
    );
  });

  it("accepts a phone number exactly at the minimum length", () => {
    expect(errorsFor(valid({ phone: "1".repeat(MIN_PHONE_LENGTH) }))).toEqual([]);
  });

  it.each(Object.entries(MAX_LENGTHS))("rejects %s over %i characters", (field, max) => {
    expect(errorsFor(valid({ [field]: "x".repeat(max + 1) }))).toContain(
      `${field} exceeds maximum length`
    );
  });

  it.each(Object.entries(MAX_LENGTHS))("accepts %s at exactly %i characters", (field, max) => {
    // phone has a competing minimum, and the key fields are closed sets.
    if (field === "howHeardFromUs" || field === "serviceTypeId") return;
    expect(errorsFor(valid({ [field]: "x".repeat(max) }))).toEqual([]);
  });

  describe("fields that stay lenient so a stale page cannot cost us a lead", () => {
    it("allows a missing serviceTypeId and normalizes it to null", () => {
      const result = normalizeQuotePayload(valid({ serviceTypeId: "" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.serviceTypeId).toBeNull();
    });

    it("drops an unrecognized howHeardFromUs to null instead of rejecting", () => {
      const result = normalizeQuotePayload(valid({ howHeardFromUs: "carrier-pigeon" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.howHeardFromUs).toBeNull();
    });

    it.each([["fr"], [""], [undefined], [42]])(
      "falls back to Spanish for language %s",
      (language) => {
        const result = normalizeQuotePayload(valid({ language }));
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.language).toBe("es");
      }
    );

    it("keeps English when the visitor used the English toggle", () => {
      const result = normalizeQuotePayload(valid({ language: "en" }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.language).toBe("en");
    });
  });

  it.each([[null], [undefined], ["a string"], [42], [[]]])(
    "rejects %s as a payload",
    (payload) => {
      expect(errorsFor(payload)).toEqual(["Invalid payload"]);
    }
  );

  it("reports every problem at once rather than stopping at the first", () => {
    expect(errorsFor({ phone: "12" }).length).toBeGreaterThan(1);
  });
});
