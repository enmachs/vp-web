import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { hasIntegrationEnv } from "../setup";
import { makePng } from "../helpers/png";
import {
  contentManagerRole,
  makeUpload,
  objectExists,
  objectSize,
  pathPrefix,
  publicBase,
  sessionFor,
  viewerRole,
} from "../helpers/keystone";

// Real local database + real R2 bucket, scoped to the `test/` folder.
describe.skipIf(!hasIntegrationEnv)("GalleryItem.image through the Keystone context", () => {
  let context: (typeof import("@/features/keystone/context"))["keystoneContext"];
  let sudo: typeof context;
  const createdIds: string[] = [];

  const IMAGE_QUERY = "id image { id url extension filesize width height }";

  beforeAll(async () => {
    ({ keystoneContext: context } = await import("@/features/keystone/context"));
    sudo = context.sudo();
    expect(pathPrefix).toBe("test/");
  });

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await sudo.db.GalleryItem.deleteOne({ where: { id } }).catch(() => {});
    }
  });

  afterAll(async () => {
    await context.prisma.$disconnect();
  });

  async function createWithImage(png: Buffer, labelEs = "test upload") {
    const item = await sudo.query.GalleryItem.createOne({
      data: { labelEs, image: { upload: makeUpload(png, "photo.png") } },
      query: IMAGE_QUERY,
    });
    createdIds.push(item.id);
    return item;
  }

  it("stores the object under the configured folder and serves it from the public host", async () => {
    const png = makePng(4, 3);
    const item = await createWithImage(png);

    expect(item.image).toMatchObject({ extension: "png", width: 4, height: 3, filesize: png.length });

    const key = `${pathPrefix}${item.image.id}.png`;
    expect(item.image.url).toBe(`${publicBase}/${key}`);
    expect(await objectSize(key)).toBe(png.length);

    // The URL the landing page will render must be a plain, cacheable 200 —
    // no signature, and served with the right type.
    const res = await fetch(item.image.url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await res.arrayBuffer()).equals(png)).toBe(true);
    expect(new URL(item.image.url).search).toBe("");
  });

  it("removes the object from R2 when the item is deleted", async () => {
    const item = await createWithImage(makePng(2, 2));
    const key = `${pathPrefix}${item.image.id}.png`;
    expect(await objectExists(key)).toBe(true);

    await sudo.db.GalleryItem.deleteOne({ where: { id: item.id } });
    createdIds.splice(createdIds.indexOf(item.id), 1);

    expect(await objectExists(key)).toBe(false);
  });

  it("replacing the image deletes the previous object and keeps the new one", async () => {
    const item = await createWithImage(makePng(2, 2));
    const oldKey = `${pathPrefix}${item.image.id}.png`;

    const updated = await sudo.query.GalleryItem.updateOne({
      where: { id: item.id },
      data: { image: { upload: makeUpload(makePng(5, 5), "replacement.png") } },
      query: IMAGE_QUERY,
    });
    const newKey = `${pathPrefix}${updated.image.id}.png`;

    expect(newKey).not.toBe(oldKey);
    expect(updated.image).toMatchObject({ width: 5, height: 5 });
    expect(await objectExists(newKey)).toBe(true);
    expect(await objectExists(oldKey)).toBe(false);
  });

  it("clearing the image deletes the object", async () => {
    const item = await createWithImage(makePng(2, 2));
    const key = `${pathPrefix}${item.image.id}.png`;

    const cleared = await sudo.query.GalleryItem.updateOne({
      where: { id: item.id },
      data: { image: null },
      query: IMAGE_QUERY,
    });

    expect(cleared.image).toBeNull();
    expect(await objectExists(key)).toBe(false);
  });

  describe("access scoping", () => {
    // Mutations are the one place Keystone *does* throw for access control.
    // Reads never do — they filter to empty (see AGENTS.md) — which is why the
    // read assertions below are on the returned rows, not on an error.
    const denied = /Access denied/;
    const user = { id: "00000000-0000-0000-0000-000000000000", name: "test" };
    const role = (r: typeof viewerRole) => ({
      id: "role",
      canSeeOtherPeople: false,
      canEditOtherPeople: false,
      canManagePeople: false,
      canManageRoles: false,
      ...r,
    });

    it("anonymous visitors can read published gallery items but not write", async () => {
      const item = await createWithImage(makePng(1, 1), "public read");

      const rows = await context.query.GalleryItem.findMany({
        where: { id: { equals: item.id } },
        query: "id image { url }",
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].image.url).toBe(item.image.url);

      await expect(
        context.query.GalleryItem.createOne({
          data: { labelEs: "anon", image: { upload: makeUpload(makePng(1, 1), "anon.png") } },
          query: "id",
        })
      ).rejects.toThrow(denied);
      await expect(
        context.query.GalleryItem.updateOne({ where: { id: item.id }, data: { labelEs: "x" }, query: "id" })
      ).rejects.toThrow(denied);
      await expect(
        context.query.GalleryItem.deleteOne({ where: { id: item.id }, query: "id" })
      ).rejects.toThrow(denied);
    });

    it("a signed-in user whose role lacks canManageContent cannot upload", async () => {
      const viewer = context.withSession(sessionFor(user, role(viewerRole)));
      await expect(
        viewer.query.GalleryItem.createOne({
          data: { labelEs: "viewer", image: { upload: makeUpload(makePng(1, 1), "viewer.png") } },
          query: "id",
        })
      ).rejects.toThrow(denied);
    });

    it("a content manager can upload", async () => {
      const manager = context.withSession(sessionFor(user, role(contentManagerRole)));
      const item = await manager.query.GalleryItem.createOne({
        data: { labelEs: "manager", image: { upload: makeUpload(makePng(1, 1), "manager.png") } },
        query: IMAGE_QUERY,
      });
      createdIds.push(item.id);
      expect(item.image.url).toBe(`${publicBase}/${pathPrefix}${item.image.id}.png`);
      expect(await objectExists(`${pathPrefix}${item.image.id}.png`)).toBe(true);
    });
  });
});
