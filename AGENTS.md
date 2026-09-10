<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# This is NOT the Keystone you know

This project runs **Keystone 8** (`@keystone-6/core@8.1.0`, `@keystone-6/auth@10.0.5`) on **Prisma 7**. Nearly everything published about KeystoneJS — the official blog, most of keystonejs.com, every tutorial — describes **v6**, and a lot of it is now actively wrong. Verify against the installed package (`node_modules/@keystone-6/core/dist/declarations/`) before trusting any external source.

Things that no longer exist, that you will be tempted to reach for:

| Gone | Use instead |
|---|---|
| `@keystone-6/core/next` and `withKeystone()` | `serverExternalPackages` in `next.config.ts`. "Embedded mode" was removed; the export does not resolve. |
| `db.url` | `db.prismaClientOptions()` returning `{ adapter: new PrismaPg({ connectionString }) }` — Prisma 7 is engine-free and **requires** a driver adapter. `datasourceUrl` throws. |
| Top-level `config.storage` | A per-field `storage: StorageStrategy` object (`put`/`delete`/`url`). See `keystone/storage/vercel-blob.ts`. |
| `initFirstItem` in `createAuth` | Seeding in `db.onConnect` (see `keystone/config.ts`). Without it a fresh database gives you a sign-in page you cannot get past. |
| `keystone prisma` / `keystone migrate` CLI | The Prisma CLI directly (`npm run db:migrate`, `npm run db:deploy`). |
| `graphql` export from `@keystone-6/core` | Renamed to `g` (`gWithContext` for context-bound). Only matters for `virtual()` fields. |

## Architecture — two entrypoints, two deploy targets

The Admin UI is a generated Next.js **pages-router** app that Keystone runs behind Express via a Next *custom server*. **It cannot be deployed to Vercel.** The marketing site deploys to Vercel; the Admin UI deploys as a container (see `Dockerfile`). Both build from this repo against one Neon database.

- `keystone/config.base.ts` — auth-free, Admin UI disabled. **This is what the Next.js app imports.** Keeping `@keystone-6/auth` (and through it Express and the admin stack) out of this module is what stops the serverless bundle from dragging the whole admin into the marketing site. Do not import `keystone/config.ts` from anything under `app/` or `lib/`.
- `keystone/config.ts` — `withAuth` + session + Admin UI + seeding. Used only by the Keystone CLI and the container. `keystone.ts` at the root re-exports it.

## Non-obvious rules

- **`getContext()` is eager.** It constructs a PrismaClient immediately, and Next evaluates module scope while collecting page data during `next build` — so a module-scope `const` makes a missing `DATABASE_URL` a *build* failure. Always go through `getKeystoneContext()` in `lib/keystone.ts`, which constructs lazily and caches on `globalThis` (the cache prevents Fluid Compute instance reuse and dev HMR from exhausting Neon's connection limit).
- **Never call `.sudo()` from the Next.js app.** The site's context has no session and is evaluated as anonymous, so list access control genuinely applies — that is what stops an accidental `User` query from returning user rows. `sudo()` is for seeding only.
- **Denying the `query` operation filters to empty; it does not throw.** An anonymous `{ users { id } }` returns `{"users": []}`, not an access-denied error, even with rows in the table. Verified. Do not write tests or health checks that assert on a thrown error.
- **Typing lists needs explicit generics.** `satisfies Lists` is not enough; each list must be `list<Lists.X.TypeInfo>({ ... })`, and any shared `access` or field helper must be a **generic factory** (`<T extends BaseListTypeInfo>() => ...`) or it pins to `BaseListTypeInfo` and won't be assignable. See `keystone/access.ts` and the field helpers at the top of `keystone/schema.ts`.
- **Nothing except Next.js loads `.env` for you.** Next reads `.env` and `.env.local`. The **Keystone CLI does not**, and neither does the **Prisma CLI**. Both are handled explicitly: `keystone/db.ts` and `prisma.config.ts` each call `process.loadEnvFile('.env')` in a try/catch. ESM hoisting is why this lives in `db.ts` rather than `keystone.ts`. Remove either call and `keystone dev` dies with `DATABASE_URL is not set` and `prisma migrate` with `datasource.url property is required`.
- **`schema.prisma`, `schema.graphql` and `prisma.config.ts` are generated.** Never hand-edit `schema.prisma`/`schema.graphql`; change `keystone/schema.ts` and rebuild. (`prisma.config.ts` is the exception: Keystone only creates it if absent, so the env-loading edit there is safe and intentional.) `schema.prisma` **must be committed** — `postinstall` runs `keystone postinstall` (≡ `keystone build --frozen --no-ui`), which fails the build if the committed schema doesn't match the config. After any schema edit: `npx keystone build --no-ui && git add schema.prisma schema.graphql`.
- **`generated/` and `.keystone/` are gitignored** and excluded from `tsconfig.json` and ESLint. They are rebuilt by `postinstall` + `prisma generate`.
- **Singleton lists** (`ContactInfo`) get `id Int` forced by Keystone, overriding the global `idField: { kind: 'uuid' }`. Do not set a list-level `db.idField` on one — it throws. Reads take no `where`.
- **Content is bilingual via sibling fields** (`titleEs` / `titleEn`) on one row, not one row per locale. The site's language toggle is client-side (`localStorage`, in `components/ClientPage.tsx`), so both locales must be fetched together and passed down.
- **Everything renders inside one `'use client'` boundary.** `ClientPage.tsx` is the boundary and every section is beneath it, so Keystone reads must happen in `app/page.tsx` and be passed down as props.
- **`revalidateTag` takes two arguments** in Next 16 (`revalidateTag('tag', 'max')`); the one-arg form is a TypeScript error. `cacheComponents` is off, so `use cache` / `cacheLife` are unavailable — use `export const revalidate`.
- **Underscore-prefixed folders under `app/` are private** and never become routes. `app/api/_foo/route.ts` silently does not exist.
- Migrations run **only** from the admin container, never from Vercel. After a schema change, deploy the container first (it applies the migration), then Vercel — the reverse order prerenders against columns that don't exist and fails the build.

## Testing standard

Tests run with Node's built-in runner via tsx: `npm test` → `tsx --test test/**/*.test.ts`. Integration tests use a real Postgres (`vp_web_shadow` or a dedicated `vp_web_test`) with Keystone's own helper, `resetDatabase` from `@keystone-6/core/testing/postgresql` — not mocks. Access control and singleton behaviour are emergent properties of the running system; a mocked Keystone would prove nothing about either.

**A change is not done until it has a test, if it touches any of these:**

- **Any access-control rule.** These are the security boundary. A test must assert that an anonymous context cannot read `User` and can read published content.
- **Any singleton invariant.** `ContactInfo` must always be exactly one row, with `create` and `delete` denied through the API.
- **Any derived or formatted value** — `contactHref()`, the bilingual `…En` → `…Es` fallback, `Intl` date formatting, `asStringArray()` guards on `json` fields. These are pure functions; test them directly, no database needed.
- **The Blob storage contract.** `url(key)` must reconstruct exactly the pathname `put(key)` wrote. This is what `addRandomSuffix: false` guarantees, and it silently breaks every existing image if it regresses.

**Assert access control on empty results, never on a thrown error.** Denying the `query` operation filters rows out; it does not raise. `expect(() => ...).toThrow()` will fail even when access control is working perfectly.

Do not write snapshot tests against generated files (`schema.prisma`, `generated/**`) — `keystone postinstall --frozen` already enforces that in CI, and duplicating it produces churn on every schema change.

## Production logging and alerting

Two runtimes log to two different places: the site to Vercel, the Admin UI to its container host. Route both to one destination or incidents will only ever be half-visible.

**Never log:** quote-form submitter names, phone numbers or message bodies (PII); connection strings; `BLOB_READ_WRITE_TOKEN`; `SESSION_SECRET`; password fields. Log identifiers and outcomes, not payloads.

**Page immediately:**
- Any 5xx from `/api/quote`. This is the business's only lead channel — a silent failure is a lost customer, and today a Resend outage surfaces only as a 502 to the visitor.
- Prisma connection failures or pool exhaustion. Usually Neon autosuspend, or the `globalThis` context cache in `lib/keystone.ts` having regressed so every invocation opens a new pool.
- `prisma migrate deploy` failing on container boot — the container will restart-loop and the Admin UI stays down.

**Digest, do not page:** elevated 4xx, rate-limit trips, Blob upload/delete failures (currently silent — a failed `put()` shows only as a failed save in the Admin UI with nothing recorded server-side).

Provision the log drain through the `vercel:marketplace` skill (category `observability`) rather than hardcoding a provider.
