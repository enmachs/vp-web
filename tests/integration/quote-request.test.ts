import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The route emails through Resend. Mocked so the suite never sends mail, and so
// individual tests can make the send fail on demand.
const sendMock = vi.fn(async () => ({ data: { id: "mock" }, error: null }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("QuoteRequest capture", () => {
  let context: (typeof import("@/features/keystone/context"))["keystoneContext"];
  let sudo: typeof context;
  let saveQuoteRequest: (typeof import("@/features/landing/lib/saveQuoteRequest"))["saveQuoteRequest"];
  let POST: (typeof import("@/app/api/quote/route"))["POST"];

  let serviceTypeId: string;
  const createdQuoteIds: string[] = [];
  let ipCounter = 0;

  beforeAll(async () => {
    ({ keystoneContext: context } = await import("@/features/keystone/context"));
    ({ saveQuoteRequest } = await import("@/features/landing/lib/saveQuoteRequest"));
    ({ POST } = await import("@/app/api/quote/route"));
    sudo = context.sudo();

    const st = await sudo.query.ServiceType.createOne({
      data: {
        key: "__test-quote-type",
        kind: "service",
        nameEs: "__test-Viajes",
        nameEn: "__test-Trips",
        isPublished: true,
      },
      query: "id",
    });
    serviceTypeId = st.id;
  });

  afterEach(async () => {
    sendMock.mockClear();
    sendMock.mockImplementation(async () => ({ data: { id: "mock" }, error: null }));
    // delete is denyAll, so teardown has to go through sudo.
    for (const id of createdQuoteIds.splice(0)) {
      await sudo.db.QuoteRequest.deleteOne({ where: { id } }).catch(() => {});
    }
  });

  afterAll(async () => {
    await sudo.db.ServiceType.deleteOne({ where: { id: serviceTypeId } }).catch(() => {});
    await context.prisma.$disconnect();
  });

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      fullName: "__test-Ana",
      fromLocation: "Punto Fijo",
      toLocation: "Caracas",
      serviceTypeId,
      serviceTypeLabel: "__test-Viajes",
      phone: "+58 414 1234567",
      howHeardFromUs: "referral",
      details: "dos pasajeros",
      language: "es",
      ...overrides,
    };
  }

  /** Each request gets its own IP so the 5/min limiter never bleeds between tests. */
  function post(body: unknown) {
    return POST(
      new NextRequest("http://localhost/api/quote", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `203.0.113.${++ipCounter}`,
        },
        body: JSON.stringify(body),
      })
    );
  }

  async function track<T extends { id: string }>(row: T) {
    createdQuoteIds.push(row.id);
    return row;
  }

  describe("saveQuoteRequest", () => {
    it("stores the submission and connects the service type", async () => {
      const saved = await saveQuoteRequest({
        fullName: "__test-Ana",
        fromLocation: "Punto Fijo",
        toLocation: "Caracas",
        serviceTypeId,
        serviceTypeLabel: "whatever the client claimed",
        phone: "+58 414 1234567",
        howHeardFromUs: "referral",
        details: "dos pasajeros",
        language: "es",
      });
      await track(saved);

      const row = await sudo.query.QuoteRequest.findOne({
        where: { id: saved.id },
        query: "fullName phone howHeardFromUs language serviceTypeLabel serviceType { id nameEs } createdAt",
      });

      expect(row.fullName).toBe("__test-Ana");
      expect(row.howHeardFromUs).toBe("referral");
      expect(row.language).toBe("es");
      expect(row.serviceType.id).toBe(serviceTypeId);
      expect(row.createdAt).toBeTruthy();
      // The taxonomy's own name wins over whatever the payload claimed.
      expect(row.serviceTypeLabel).toBe("__test-Viajes");
    });

    it("still stores the lead when the service type no longer exists", async () => {
      const saved = await saveQuoteRequest({
        fullName: "__test-Beto",
        fromLocation: "Punto Fijo",
        toLocation: "Valencia",
        serviceTypeId: "clnonexistent0000000000000",
        serviceTypeLabel: "Encomiendas",
        phone: "+58 414 7654321",
        howHeardFromUs: null,
        details: "",
        language: "en",
      });
      await track(saved);

      const row = await sudo.query.QuoteRequest.findOne({
        where: { id: saved.id },
        query: "serviceTypeLabel howHeardFromUs serviceType { id }",
      });
      expect(row.serviceType).toBeNull();
      // Falls back to the label the visitor saw, so the record stays readable.
      expect(row.serviceTypeLabel).toBe("Encomiendas");
      expect(row.howHeardFromUs).toBeNull();
    });
  });

  describe("POST /api/quote", () => {
    it("persists the submission and emails it", async () => {
      const res = await post(payload());
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ success: true });
      expect(sendMock).toHaveBeenCalledOnce();

      const rows = await sudo.query.QuoteRequest.findMany({
        where: { fullName: { equals: "__test-Ana" } },
        query: "id serviceType { id }",
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].serviceType.id).toBe(serviceTypeId);
      createdQuoteIds.push(rows[0].id);
    });

    it("still succeeds, and still stores the lead, when Resend fails", async () => {
      sendMock.mockImplementation(async () => {
        throw new Error("Resend is down");
      });

      const res = await post(payload({ fullName: "__test-Carla" }));
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ success: true });

      const rows = await sudo.query.QuoteRequest.findMany({
        where: { fullName: { equals: "__test-Carla" } },
        query: "id",
      });
      expect(rows).toHaveLength(1);
      createdQuoteIds.push(rows[0].id);
    });

    it("rejects an invalid payload without storing anything", async () => {
      const res = await post(payload({ fullName: "", phone: "12" }));
      expect(res.status).toBe(400);

      const rows = await sudo.query.QuoteRequest.findMany({
        where: { phone: { equals: "12" } },
        query: "id",
      });
      expect(rows).toHaveLength(0);
      expect(sendMock).not.toHaveBeenCalled();
    });

    it("accepts a submission with no service type at all", async () => {
      const res = await post(payload({ fullName: "__test-Dani", serviceTypeId: "", serviceTypeLabel: "" }));
      expect(res.status).toBe(200);

      const rows = await sudo.query.QuoteRequest.findMany({
        where: { fullName: { equals: "__test-Dani" } },
        query: "id serviceType { id }",
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].serviceType).toBeNull();
      createdQuoteIds.push(rows[0].id);
    });
  });

  describe("access control", () => {
    it("hides every row from an anonymous reader", async () => {
      const saved = await track(await saveQuoteRequest({
        fullName: "__test-Elena",
        fromLocation: "Punto Fijo",
        toLocation: "Maracaibo",
        serviceTypeId,
        serviceTypeLabel: "__test-Viajes",
        phone: "+58 414 1112222",
        howHeardFromUs: "google",
        details: "",
        language: "es",
      }));

      // Reads filter to empty rather than throwing — see AGENTS.md.
      const anonymous = await context.query.QuoteRequest.findMany({ query: "id fullName phone" });
      expect(anonymous).toEqual([]);

      // ...while a sudo read still sees it, so the empty result is access
      // control and not an empty table.
      const asAdmin = await sudo.query.QuoteRequest.findOne({
        where: { id: saved.id },
        query: "id",
      });
      expect(asAdmin.id).toBe(saved.id);
    });

    it("refuses an anonymous create", async () => {
      await expect(
        context.query.QuoteRequest.createOne({
          data: { fullName: "__test-intruder", fromLocation: "a", toLocation: "b", phone: "1234567" },
          query: "id",
        })
      ).rejects.toThrow(/Access denied/);
    });

    it("refuses an anonymous delete", async () => {
      const saved = await track(await saveQuoteRequest({
        fullName: "__test-Fabio",
        fromLocation: "Punto Fijo",
        toLocation: "Barquisimeto",
        serviceTypeId: null,
        serviceTypeLabel: "",
        phone: "+58 414 3334444",
        howHeardFromUs: "other",
        details: "",
        language: "es",
      }));

      await expect(
        context.query.QuoteRequest.deleteOne({ where: { id: saved.id }, query: "id" })
      ).rejects.toThrow(/Access denied/);

      const stillThere = await sudo.query.QuoteRequest.findOne({
        where: { id: saved.id },
        query: "id",
      });
      expect(stillThere.id).toBe(saved.id);
    });
  });
});
