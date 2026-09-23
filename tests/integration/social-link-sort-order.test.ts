import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { UNIQUE_SORT_ORDER_ERROR } from "@/features/keystone/models/SocialLink";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("SocialLink.sortOrder uniqueness", () => {
  let context: (typeof import("@/features/keystone/context"))["keystoneContext"];
  let sudo: typeof context;
  const createdIds: string[] = [];

  const FIELDS = "id sortOrder";

  beforeAll(async () => {
    ({ keystoneContext: context } = await import("@/features/keystone/context"));
    sudo = context.sudo();
  });

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await sudo.db.SocialLink.deleteOne({ where: { id } }).catch(() => {});
    }
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  function link(label: string, sortOrder?: number) {
    return {
      platform: "instagram" as const,
      label,
      url: "https://instagram.com/viajerosparaguana",
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    };
  }

  async function create(label: string, sortOrder?: number) {
    const item = await sudo.query.SocialLink.createOne({
      data: link(label, sortOrder),
      query: FIELDS,
    });
    createdIds.push(item.id);
    return item;
  }

  async function currentMaxSortOrder() {
    const [last] = await sudo.query.SocialLink.findMany({
      orderBy: [{ sortOrder: "desc" }],
      take: 1,
      query: "sortOrder",
    });
    return typeof last?.sortOrder === "number" ? last.sortOrder : 0;
  }

  const invalid = new RegExp(
    `You provided invalid data for this operation[\\s\\S]*SocialLink\\.sortOrder: ${UNIQUE_SORT_ORDER_ERROR}`
  );

  it("defaults omitted sortOrder to one past the current highest", async () => {
    const expected = (await currentMaxSortOrder()) + 1;
    const item = await create("__test-sort-next");
    expect(item.sortOrder).toBe(expected);
  });

  it("assigns consecutive sortOrders when several creates omit it", async () => {
    const firstExpected = (await currentMaxSortOrder()) + 1;
    const first = await create("__test-sort-seq-a");
    const second = await create("__test-sort-seq-b");

    expect(first.sortOrder).toBe(firstExpected);
    expect(second.sortOrder).toBe(firstExpected + 1);
  });

  it("keeps an explicit sortOrder on create", async () => {
    const item = await create("__test-sort-explicit", 810_000);
    expect(item.sortOrder).toBe(810_000);
  });

  it("rejects creating a social link whose sortOrder is already taken", async () => {
    const first = await create("__test-sort-a", 810_001);
    expect(first.sortOrder).toBe(810_001);

    await expect(create("__test-sort-b", 810_001)).rejects.toThrow(invalid);
  });

  it("allows updating a social link without changing its sortOrder", async () => {
    const item = await create("__test-sort-keep", 810_002);

    const updated = await sudo.query.SocialLink.updateOne({
      where: { id: item.id },
      data: { label: "__test-sort-keep-renamed" },
      query: FIELDS,
    });

    expect(updated.sortOrder).toBe(810_002);
  });

  it("rejects updating a social link onto another link's sortOrder", async () => {
    await create("__test-sort-existing", 810_003);
    const other = await create("__test-sort-mover", 810_004);

    await expect(
      sudo.query.SocialLink.updateOne({
        where: { id: other.id },
        data: { sortOrder: 810_003 },
        query: FIELDS,
      })
    ).rejects.toThrow(invalid);
  });
});
