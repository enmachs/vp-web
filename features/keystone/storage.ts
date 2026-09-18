import type { StorageConfig } from "@keystone-6/core/types";

// Cloudflare R2 over the S3 API. R2's S3 endpoint is not publicly readable,
// so uploads go to S3_ENDPOINT while the URLs Keystone hands out point at
// IMAGE_PUBLIC_URL (the bucket's r2.dev subdomain or a custom domain). The
// same shape works for any provider whose public host differs from its API
// host; for AWS S3 / DO Spaces just leave IMAGE_PUBLIC_URL unset.
const {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "auto",
  S3_ACCESS_KEY_ID: accessKeyId,
  S3_SECRET_ACCESS_KEY: secretAccessKey,
  S3_ENDPOINT: endpoint = "https://example.r2.cloudflarestorage.com",
  // Lets every environment share one bucket: "dev/" locally, "preview/" on
  // Vercel previews, unset in production.
  S3_PATH_PREFIX: pathPrefix,
  IMAGE_PUBLIC_URL: publicUrl,
} = process.env;

if (!process.env.S3_BUCKET_NAME && process.env.NODE_ENV === "production") {
  console.warn(
    "[storage] S3_BUCKET_NAME is not set — image uploads will fail. See README.md#image-management."
  );
}

// Keystone builds path-style URLs as `${endpoint}/${bucket}/${prefix}${id}.${ext}`
// (see getS3AssetsEndpoint in @keystone-6/core). Swap that base for the public
// one and keep the object key intact, prefix included.
const apiBase = new URL(`/${bucketName}/`, endpoint).toString();
const publicBase = publicUrl ? publicUrl.replace(/\/+$/, "") + "/" : undefined;

export const imageStorage: StorageConfig = {
  kind: "s3",
  type: "image",
  bucketName,
  region,
  accessKeyId,
  secretAccessKey,
  endpoint,
  pathPrefix,
  forcePathStyle: true,
  // No `signed`: the gallery is public, and presigned URLs change on every
  // ISR render, which defeats browser/CDN caching. No `acl` either: R2
  // rejects canned ACLs — bucket-level public access does the job.
  generateUrl: (url) =>
    publicBase && url.startsWith(apiBase)
      ? publicBase + url.slice(apiBase.length)
      : url,
};
