import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasIntegrationEnv } from "../setup";
import { makePng } from "../helpers/png";
import { MAX_IMAGE_BYTES } from "@/features/keystone/lib/upload-limits";
import { contentManagerRole, listTestObjects, objectExists, pathPrefix, publicBase } from "../helpers/keystone";

// Drives the real /api/graphql handler over HTTP: multipart parsing, the
// graphql-upload size gate, and cookie-based auth — none of which the
// context-level suite touches.
describe.skipIf(!hasIntegrationEnv)("POST /api/graphql multipart uploads", () => {
  let server: http.Server;
  let endpoint: string;
  let context: (typeof import("@/features/keystone/context"))["keystoneContext"];
  let sudo: typeof context;
  let cookie: string;
  const fixture = { roleId: "", userId: "", email: `__test-${Date.now()}@example.com`, password: "test-password-123" };
  const createdIds: string[] = [];

  beforeAll(async () => {
    ({ keystoneContext: context } = await import("@/features/keystone/context"));
    sudo = context.sudo();

    const { default: handler } = await import("@/pages/api/graphql");
    server = http.createServer((req, res) => void handler(req as any, res as any));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/graphql`;

    const role = await sudo.db.Role.createOne({ data: contentManagerRole });
    fixture.roleId = role.id;
    const user = await sudo.db.User.createOne({
      data: { name: "Test Manager", email: fixture.email, password: fixture.password, role: { connect: { id: role.id } } },
    });
    fixture.userId = user.id;

    // Sign in the way the dashboard does and keep the session cookie.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `mutation($email: String!, $password: String!) {
          authenticateUserWithPassword(email: $email, password: $password) {
            ... on UserAuthenticationWithPasswordSuccess { sessionToken }
            ... on UserAuthenticationWithPasswordFailure { message }
          }
        }`,
        variables: { email: fixture.email, password: fixture.password },
      }),
    });
    const body = await res.json();
    expect(body.data.authenticateUserWithPassword.sessionToken).toBeTruthy();
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toMatch(/^keystonejs-session=/);
    cookie = setCookie!.split(";")[0];
  });

  afterAll(async () => {
    for (const id of createdIds) await sudo.db.GalleryItem.deleteOne({ where: { id } }).catch(() => {});
    if (fixture.userId) await sudo.db.User.deleteOne({ where: { id: fixture.userId } }).catch(() => {});
    if (fixture.roleId) await sudo.db.Role.deleteOne({ where: { id: fixture.roleId } }).catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
    await context.prisma.$disconnect();
  });

  const CREATE = `mutation($file: Upload!, $label: String!) {
    createGalleryItem(data: { labelEs: $label, image: { upload: $file } }) {
      id image { id url extension filesize width height }
    }
  }`;

  /** GraphQL multipart request spec, as features/dashboard/lib/keystoneClient.ts sends it. */
  async function uploadViaHttp(file: Buffer, label: string, opts: { cookie?: string } = {}) {
    const form = new FormData();
    form.append("operations", JSON.stringify({ query: CREATE, variables: { file: null, label } }));
    form.append("map", JSON.stringify({ "0": ["variables.file"] }));
    form.append("0", new Blob([new Uint8Array(file)], { type: "image/png" }), "photo.png");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: opts.cookie ? { cookie: opts.cookie } : {},
      body: form,
    });
    const body = await res.json();
    if (body.data?.createGalleryItem?.id) createdIds.push(body.data.createGalleryItem.id);
    return { status: res.status, ...body };
  }

  it("accepts an image under the limit and stores it in the test folder", async () => {
    const png = makePng(3, 2);
    const { status, data, errors } = await uploadViaHttp(png, "http upload", { cookie });

    expect(errors).toBeUndefined();
    expect(status).toBe(200);
    const image = data.createGalleryItem.image;
    expect(image).toMatchObject({ extension: "png", width: 3, height: 2, filesize: png.length });
    expect(image.url).toBe(`${publicBase}/${pathPrefix}${image.id}.png`);
    expect(await objectExists(`${pathPrefix}${image.id}.png`)).toBe(true);
  });

  it("rejects a file over 5 MB before anything reaches R2", async () => {
    // ~6 MB of incompressible pixels: comfortably past the cap.
    const big = makePng(1024, 2048, { noise: true });
    expect(big.length).toBeGreaterThan(MAX_IMAGE_BYTES);

    const before = await listTestObjects();
    const { data, errors } = await uploadViaHttp(big, "too big", { cookie });

    expect(data?.createGalleryItem ?? null).toBeNull();
    expect(errors?.[0]?.message).toMatch(new RegExp(`exceeds the ${MAX_IMAGE_BYTES} byte size limit`));
    expect(await listTestObjects()).toEqual(before);
    // …and nothing half-written in the database either.
    expect(await sudo.db.GalleryItem.count({ where: { labelEs: { equals: "too big" } } })).toBe(0);
  });

  it("accepts a file right at the limit", async () => {
    // Build just under the cap with noise, then confirm we're within a few
    // KB of it so the boundary is actually being exercised.
    const png = makePng(1024, 1700, { noise: true });
    expect(png.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    expect(png.length).toBeGreaterThan(MAX_IMAGE_BYTES * 0.95);

    const { errors, data } = await uploadViaHttp(png, "at limit", { cookie });
    expect(errors).toBeUndefined();
    expect(data.createGalleryItem.image.filesize).toBe(png.length);
  });

  it("refuses an anonymous upload and stores nothing", async () => {
    const before = await listTestObjects();
    const { data, errors } = await uploadViaHttp(makePng(1, 1), "anon");

    expect(data?.createGalleryItem ?? null).toBeNull();
    expect(errors?.[0]?.message).toMatch(/Access denied/);
    expect(await listTestObjects()).toEqual(before);
  });

  it("rejects a non-image payload without storing it", async () => {
    const before = await listTestObjects();
    const { data, errors } = await uploadViaHttp(Buffer.from("%PDF-1.4 not an image"), "pdf", { cookie });

    expect(data?.createGalleryItem ?? null).toBeNull();
    expect(errors?.[0]?.message).toMatch(/not a supported image type|File type not found/);
    expect(await listTestObjects()).toEqual(before);
  });
});
