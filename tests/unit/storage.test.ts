import { afterEach, describe, expect, it, vi } from "vitest";

// storage.ts reads process.env at module load, so each case stubs the env
// and re-imports a fresh copy.
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import("@/features/keystone/storage");
  return mod.imageStorage as Extract<typeof mod.imageStorage, { kind: "s3" }>;
}

const r2 = {
  S3_BUCKET_NAME: "photos",
  S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
  S3_REGION: undefined,
  S3_PATH_PREFIX: undefined,
  IMAGE_PUBLIC_URL: undefined,
};

// What @keystone-6/core's getS3AssetsEndpoint produces for a path-style
// bucket, followed by the object key the image field generates.
const apiUrl = (key: string) => `https://acct.r2.cloudflarestorage.com/photos/${key}`;

describe("imageStorage (Cloudflare R2 over S3)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rewrites the API host to IMAGE_PUBLIC_URL and keeps the object key", async () => {
    const s = await load({ ...r2, IMAGE_PUBLIC_URL: "https://pub-abc.r2.dev" });
    expect(s.generateUrl!(apiUrl("k1.webp"))).toBe("https://pub-abc.r2.dev/k1.webp");
  });

  it("keeps the folder prefix in the public URL", async () => {
    const s = await load({ ...r2, S3_PATH_PREFIX: "dev/", IMAGE_PUBLIC_URL: "https://img.example.com" });
    expect(s.pathPrefix).toBe("dev/");
    expect(s.generateUrl!(apiUrl("dev/k1.png"))).toBe("https://img.example.com/dev/k1.png");
  });

  it("tolerates a trailing slash on IMAGE_PUBLIC_URL", async () => {
    const s = await load({ ...r2, IMAGE_PUBLIC_URL: "https://img.example.com///" });
    expect(s.generateUrl!(apiUrl("k1.jpg"))).toBe("https://img.example.com/k1.jpg");
  });

  it("returns the API URL unchanged when IMAGE_PUBLIC_URL is unset (AWS / DO style)", async () => {
    const s = await load({ ...r2, S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com" });
    const url = "https://s3.us-east-1.amazonaws.com/photos/k1.jpg";
    expect(s.generateUrl!(url)).toBe(url);
  });

  it("leaves URLs that are not under the bucket's API base alone", async () => {
    const s = await load({ ...r2, IMAGE_PUBLIC_URL: "https://img.example.com" });
    const foreign = "https://acct.r2.cloudflarestorage.com/other-bucket/k1.jpg";
    expect(s.generateUrl!(foreign)).toBe(foreign);
  });

  it("is public, unsigned, path-style, and region-agnostic by default", async () => {
    const s = await load(r2);
    expect(s.kind).toBe("s3");
    expect(s.type).toBe("image");
    expect(s.forcePathStyle).toBe(true);
    expect(s.region).toBe("auto");
    // Presigned URLs would churn per ISR render; R2 rejects canned ACLs.
    expect(s.signed).toBeUndefined();
    expect(s.acl).toBeUndefined();
  });

  it("falls back to placeholders so `keystone build` works without env", async () => {
    const s = await load({ ...r2, S3_BUCKET_NAME: undefined, S3_ENDPOINT: undefined });
    expect(s.bucketName).toBeTruthy();
    expect(() => new URL(s.endpoint!)).not.toThrow();
  });
});
