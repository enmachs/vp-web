# Vercel Deployment Notes

Assessment of `keystone-starter` for deployment to Vercel.
Written 2026-09-09. The project is currently configured for **Railway**
(see [`railway.toml`](railway.toml)); Vercel ignores that file entirely.

**Verdict: deployable, but not a drop-in.** Three things needed to change;
issues 1 and 2 are now fixed in code (see below) — issue 3 and the one
remaining manual Vercel setting are still open.

---

## Verified facts

Each of these was tested locally, not inferred.

| Check | Result |
| --- | --- |
| `keystone build --no-ui` against an unreachable DB | ✅ exit 0 — needs no database |
| `next build` against an unreachable DB | ✅ succeeds |
| `prisma migrate deploy` | ❌ requires a live, reachable database |
| File storage kind | ✅ `kind: "s3"` — no local filesystem writes |
| Middleware database access | ✅ HTTP to its own `/api/graphql`, not Prisma directly |
| `/` (landing page) | ✅ prerenders at build (ISR, `revalidate = 60`). It reads `ContactInfo` from the DB during prerender; if the DB is unreachable the read logs and falls back to `null` (`features/landing/lib/getContactInfo.ts`), so the build still succeeds. |

The practical consequence: **only the migrate step needs a database at build time.**

---

## Issue 1 — the build script ran migrations — ✅ fixed

`package.json`'s `build` script was:

```json
"build": "keystone build --no-ui && npm run migrate && next build",
```

Vercel is serverless and has **no start command**, so `railway.toml`'s trick of
moving `npm run migrate` into `startCommand` had nowhere to go — Vercel would
have run `npm run build` as-is, meaning **every deployment, previews
included, ran `prisma migrate deploy` against whatever `DATABASE_URL` it was
given.** If previews ever share the production database, a preview branch
would migrate production.

**Fixed** — `build` is now `keystone build --no-ui && next build`. Migrations
are a deliberate, separate step (`npm run migrate`, still `prisma migrate
deploy`). `railway.toml` is untouched — it already overrides both `buildCommand`
and `startCommand` explicitly, so Railway never read `package.json`'s script
and is unaffected. `dev` still runs migrations automatically; that's a local
convenience against a local database, not the same risk.

---

## Issue 2 — the proxy self-fetches over HTTP on every request — ✅ code fixed, one manual step left

[`proxy.ts`](proxy.ts) matches every non-API route and calls
`getAuthenticatedUser`, which in
[`features/dashboard/middleware.ts`](features/dashboard/middleware.ts) issues a
GraphQL request to the app's **own** `/api/graphql` endpoint. That's still an
extra function invocation plus a network round trip per navigation — accepted
as-is; rewriting it to call the Keystone context in-process would mean
reimplementing Keystone's `@hapi/iron` session decoding by hand outside
`withRequest()`, which is more risk than the cost it saves.

The sharper problem was: **with Deployment Protection enabled (the default for
previews), that self-fetch returns 401.** The `catch` block swallows the error
and returns `user: null`, which redirects to signin — and signin fails the
same way, producing a redirect loop whose only symptom is `Auth check failed`
in the logs.

**Fixed in code** — `createMiddlewareGraphQLClient` now forwards
`x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET` when that env
var is present. This is Vercel's documented mechanism for exactly this case
(a deployment calling itself).

**Still needed, manually, in the Vercel dashboard:** Project Settings →
Deployment Protection → **Protection Bypass for Automation** → enable it.
Vercel then injects `VERCEL_AUTOMATION_BYPASS_SECRET` into the deployment
automatically — nothing to generate or paste by hand. Until that's on, the
self-fetch still 401s under Deployment Protection exactly as before.

**Checked and ruled out:** `getGraphQLEndpoint` relies on
[`features/dashboard/lib/getBaseUrl.ts`](features/dashboard/lib/getBaseUrl.ts),
which calls `headers()` from `next/headers` inside a `try`/`catch` that used to
swallow the error silently. Added logging and confirmed locally that `headers()`
does **not** throw inside Next 16's Proxy middleware — this was a
theoretical risk, not an active bug. The `catch` now logs instead of
swallowing, so a future regression here won't be invisible again.

---

## Issue 3 — Prisma connection pooling

[`features/keystone/context.ts`](features/keystone/context.ts) creates the
Keystone context at **module scope**, and the `globalThis` reuse guard is
`NODE_ENV !== 'production'` only:

```ts
export const keystoneContext: Context =
  (globalThis as any).keystoneContext ?? getContext(config, PrismaModule)

if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).keystoneContext = keystoneContext
}
```

Fluid Compute reuses function instances, so this is better than classic
serverless — but use a **pooled** connection string (Neon pooler, PgBouncer)
rather than a direct one, or you risk exhausting connections.

---

## Smaller items

- **`next.config.ts` image patterns** — ✅ fixed. `remotePatterns` is now
  derived from `IMAGE_PUBLIC_URL` (falling back to `S3_ENDPOINT`) and is an
  empty list rather than an invalid hostname when neither is set.
- **Node version** — `engines: node >=20`; Vercel defaults to Node 24. Fine.
- **Keystone's `next` override** — the `@keystone-6/core` → `next: 14.2.35`
  override only affects the Keystone Admin UI, which is disabled via `--no-ui`.
  Harmless.
- **`graphql-upload`** — `pages/api/graphql.ts` sets `bodyParser: false` for
  multipart uploads. Vercel now accepts request bodies up to 100 MB, so this
  should be fine.

---

## Environment variables to set in Vercel

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (use the **pooled** URL) |
| `SHADOW_DATABASE_URL` | Prisma migrations |
| `SESSION_SECRET` | Keystone stateless sessions |
| `S3_BUCKET_NAME` | Image storage — Cloudflare R2 bucket name |
| `S3_REGION` | Image storage — `auto` for R2 |
| `S3_ACCESS_KEY_ID` | Image storage — R2 API token (Object Read & Write, bucket-scoped) |
| `S3_SECRET_ACCESS_KEY` | Image storage — R2 API token secret |
| `S3_ENDPOINT` | Image storage — `https://<account-id>.r2.cloudflarestorage.com` (upload host, not public) |
| `IMAGE_PUBLIC_URL` | Public image host (`pub-….r2.dev` or custom domain) — also drives `next.config.ts` remote patterns |
| `S3_PATH_PREFIX` | Optional — `preview/` in the Preview environment, unset in Production, so both share one bucket |
| `RESEND_API_KEY` | Landing page quote form (`app/api/quote/route.ts`) |
| `BUSINESS_EMAIL` | Optional — quote form recipient |
| `FROM_EMAIL` | Optional — quote form sender |

---

## Shortest path to a working deploy

1. ~~Set Build Command to `keystone build --no-ui && next build`.~~ Done —
   that's now `package.json`'s default `build` script; no Vercel Build
   Command override needed.
2. Provision Postgres and use the pooled connection string.
3. Run `prisma migrate deploy` outside the build.
4. Enable Protection Bypass for Automation on the Vercel project (the one
   manual step issue 2 still needs).
