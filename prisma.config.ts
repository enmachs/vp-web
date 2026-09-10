import { defineConfig } from 'prisma/config';

// Keystone generated this file, but the generated version reads
// process.env.DATABASE_URL without loading anything — and unlike Next.js and the
// Keystone CLI, the Prisma CLI does not read .env implicitly. Without this,
// `prisma migrate` fails with "The datasource.url property is required".
// process.loadEnvFile is built into Node 20.12+/22, so this needs no dependency.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env (e.g. CI or a container where real env vars are already set).
}

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    // Migrations are DDL: always prefer the direct/unpooled connection.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
