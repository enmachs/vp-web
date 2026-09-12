/**
 * Apply Prisma migrations over Neon's HTTPS query API.
 *
 * `prisma migrate deploy` uses Prisma's Rust engine over TCP :5432, which
 * some networks (and this laptop) cannot complete a handshake on. The Neon
 * SQL Editor works because it talks HTTPS :443; this script does the same
 * via `@neondatabase/serverless`, then records rows in `_prisma_migrations`
 * so a later `prisma migrate deploy` will not replay them.
 *
 * This does not change how the running app connects. Keystone/Prisma Client
 * still use TCP against the pooled `DATABASE_URL` on Vercel.
 *
 *   npm run migrate:http -- --status
 *   npm run migrate:http -- --env-file .env.vercel
 *
 * Prefers `DATABASE_URL_UNPOOLED`. Falls back to `DATABASE_URL`. Loads
 * `.env.vercel` automatically if present so a `vercel env pull` file works
 * without extra flags.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");
const PRISMA_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
`;

type Sql = ReturnType<typeof neon<false, false>>;

type MigrationFile = {
  name: string;
  sql: string;
  checksum: string;
};

type AppliedRow = {
  migration_name: string;
  finished_at: Date | string | null;
  rolled_back_at: Date | string | null;
  checksum: string;
};

function parseArgs(argv: string[]) {
  let status = false;
  let envFile: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--status") status = true;
    else if (arg === "--env-file") {
      envFile = argv[++i];
      if (!envFile) throw new Error("--env-file needs a path");
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { status, envFile };
}

function printHelp() {
  console.log(`Apply Prisma migrations to Neon over HTTPS (port 443).

Usage:
  npm run migrate:http -- [--status] [--env-file <path>]

  --status      List pending/applied migrations, do not write
  --env-file    Load env from this file (default: .env.vercel if it exists)

Connection string (first match wins):
  DATABASE_URL_UNPOOLED
  DATABASE_URL
Must be a Neon URL (*.neon.tech). Local Postgres will not work.`);
}

function stripQuotes(value: string) {
  return value.trim().replace(/^['"]/, "").replace(/['"]$/, "");
}

function loadConnectionString(envFile: string | undefined) {
  const defaultVercelEnv = ".env.vercel";
  const path = envFile ?? (existsSync(defaultVercelEnv) ? defaultVercelEnv : undefined);
  if (path) {
    if (!existsSync(path)) throw new Error(`Env file not found: ${path}`);
    loadEnv({ path, override: true });
    console.log(`[migrate:http] loaded ${path}`);
  }

  const raw =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL, or pass --env-file .env.vercel"
    );
  }

  const url = stripQuotes(raw);
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    throw new Error(
      "Connection string is not a postgres URL. If this came from `vercel env pull`, use DATABASE_URL_UNPOOLED — DATABASE_URL is sometimes a placeholder."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Connection string is not a valid URL");
  }
  if (!parsed.hostname.endsWith(".neon.tech")) {
    throw new Error(
      `This script talks to Neon's HTTPS API; host is ${parsed.hostname}, expected *.neon.tech. Local Prisma still uses npm run migrate.`
    );
  }

  return { url, host: parsed.hostname, database: parsed.pathname.replace(/^\//, "") || "postgres" };
}

function listMigrationFiles(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => existsSync(join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort()
    .map((name) => {
      const file = join(MIGRATIONS_DIR, name, "migration.sql");
      const buf = readFileSync(file);
      return {
        name,
        sql: buf.toString("utf8"),
        checksum: createHash("sha256").update(buf).digest("hex"),
      };
    });
}

/**
 * Split a Prisma-generated SQL file into statements. Handles `--` comments,
 * single-quoted strings (including ''), and dollar-quoting. These files are
 * simple; this exists so a JSON default like `'[{"text":""}]'` is not split
 * on a semicolon that is not there, and so `'[]'` stays one statement.
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  let inSingle = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const c = sql[i];

    if (!inSingle && dollarTag === null && c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") {
        current += sql[i];
        i++;
      }
      continue;
    }

    if (!inSingle && c === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (match) {
        const tag = match[0];
        if (dollarTag === tag) dollarTag = null;
        else if (dollarTag === null) dollarTag = tag;
        current += tag;
        i += tag.length;
        continue;
      }
    }

    if (dollarTag === null && c === "'") {
      if (inSingle && sql[i + 1] === "'") {
        current += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      current += c;
      i++;
      continue;
    }

    if (!inSingle && dollarTag === null && c === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0 && !isCommentOnly(trimmed)) statements.push(trimmed);
      current = "";
      i++;
      continue;
    }

    current += c;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0 && !isCommentOnly(trimmed)) statements.push(trimmed);
  return statements;
}

function isCommentOnly(sql: string) {
  return sql.split("\n").every((line) => {
    const t = line.trim();
    return t.length === 0 || t.startsWith("--");
  });
}

async function readApplied(sql: Sql): Promise<AppliedRow[] | null> {
  try {
    const rows = (await sql.query(
      `SELECT "migration_name", "finished_at", "rolled_back_at", "checksum"
       FROM "_prisma_migrations"
       ORDER BY "started_at"`
    )) as AppliedRow[];
    return rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|_prisma_migrations/i.test(message)) return null;
    throw error;
  }
}

async function main() {
  const { status, envFile } = parseArgs(process.argv.slice(2));
  const { url, host, database } = loadConnectionString(envFile);
  const files = listMigrationFiles();
  if (files.length === 0) {
    throw new Error(`No migration.sql files under ${MIGRATIONS_DIR}`);
  }

  const sql = neon(url);
  console.log(`[migrate:http] ${host} / ${database} via HTTPS`);

  await sql.query("SELECT 1");
  console.log("[migrate:http] reachable");

  const applied = await readApplied(sql);
  const byName = new Map((applied ?? []).map((row) => [row.migration_name, row]));

  for (const row of applied ?? []) {
    if (row.finished_at == null && row.rolled_back_at == null) {
      throw new Error(
        `Migration ${row.migration_name} is recorded as started but not finished. Resolve that in Neon (or delete the row) before continuing.`
      );
    }
  }

  const pending: MigrationFile[] = [];
  for (const file of files) {
    const row = byName.get(file.name);
    if (!row || row.rolled_back_at) {
      pending.push(file);
      continue;
    }
    if (row.checksum !== file.checksum) {
      throw new Error(
        `Checksum mismatch for ${file.name}. The SQL on disk does not match what was applied. Do not rewrite an already-applied migration.`
      );
    }
  }

  console.log(
    `[migrate:http] ${files.length - pending.length} applied, ${pending.length} pending`
  );
  for (const file of pending) {
    console.log(`  pending  ${file.name}`);
  }
  for (const file of files) {
    if (!pending.includes(file)) console.log(`  applied  ${file.name}`);
  }

  if (status || pending.length === 0) {
    if (pending.length === 0) console.log("[migrate:http] already in sync");
    return;
  }

  if (applied === null) {
    await sql.query(PRISMA_MIGRATIONS_TABLE);
    console.log("[migrate:http] created _prisma_migrations");
  }

  for (const file of pending) {
    const statements = splitSqlStatements(file.sql);
    if (statements.length === 0) {
      throw new Error(`${file.name} produced no SQL statements`);
    }

    const id = randomUUID();
    await sql.transaction((txn) => [
      ...statements.map((statement) => txn.query(statement)),
      txn.query(
        `INSERT INTO "_prisma_migrations" (
           "id", "checksum", "finished_at", "migration_name", "logs",
           "rolled_back_at", "started_at", "applied_steps_count"
         ) VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [id, file.checksum, file.name]
      ),
    ]);
    console.log(`[migrate:http] applied ${file.name} (${statements.length} statements)`);
  }

  console.log("[migrate:http] done");
}

main().catch((error) => {
  console.error("[migrate:http] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
