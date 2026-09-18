import "dotenv/config";

// Every test upload lands in its own folder of the shared bucket, never in
// `dev/` (local) or the unprefixed production namespace. Set before any
// import of features/keystone/storage.ts, which reads env at module load.
process.env.S3_PATH_PREFIX = "test/";

/** True when the env has what the integration suites need: a database and
 *  real R2 credentials. Unit tests never look at this. */
export const hasIntegrationEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_ENDPOINT &&
    process.env.IMAGE_PUBLIC_URL
);
