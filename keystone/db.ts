import { PrismaPg } from '@prisma/adapter-pg';

// Keystone 8's CLI does NOT read .env (Next.js does, which is why the site works
// without this). `keystone dev` would otherwise die with "DATABASE_URL is not
// set". This is the one module every entrypoint imports, and ESM hoisting means
// it cannot live in keystone.ts. process.loadEnvFile is built into Node 20.12+.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env — expected in containers and on Vercel, where real env vars are set.
}

/**
 * Prisma 7 is engine-free: `datasourceUrl` no longer works and a driver adapter
 * is required. Whatever this function returns is passed straight to
 * `new PrismaClient(...)`.
 *
 * The direct (unpooled) URL is preferred when present — the admin container is
 * one long-lived process and avoids PgBouncer's prepared-statement limits. It is
 * deliberately never set on Vercel, so serverless falls through to the pooled URL.
 */
function connectionString() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

export const db = {
  provider: 'postgresql' as const,
  prismaClientOptions: () => ({
    adapter: new PrismaPg({ connectionString: connectionString() }),
    log: ['warn', 'error'] as ('warn' | 'error')[],
  }),
  idField: { kind: 'uuid' as const },
};
