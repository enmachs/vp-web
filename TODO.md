# vp-web — outstanding work

Each item below is written to be **handed to a fresh chat that has no memory of this session**.

**How to use:** paste the *Shared context* block, then one numbered item. That is enough to complete it without further explanation.

Dependencies are noted per item. **Item 2 gates items 3, 4, and 5** — it needs an interactive login a coding agent cannot perform.

---

## Index

| # | Item | Status |
|---|---|---|
| 1 | Commit the phase-1 Keystone integration | ready |
| 2 | Provision Neon Postgres via the Vercel Marketplace | ready — **needs human login**, blocks 3/4/5 |
| 3 | Provision Vercel Blob and verify the image round-trip | blocked by 2 |
| 4 | Verify `getContext()` in a deployed Vercel function | blocked by 2 — **open architectural risk** |
| 5 | Deploy the Keystone Admin UI container | blocked by 2, 3 |
| 6 | Remove the temporary `ks-health` probe route | blocked by 4 |
| 7 | Finish the test suite | ready — partially done |
| 8 | Add CI | blocked by 7 |
| 9 | Production logging and alerting | blocked by 5 |
| 10 | Phase 2 — complete the field sets | ready — needs client content |
| 11 | Phase 3 — render the site from Keystone | blocked by 4, 10 |
| 12 | Add on-demand revalidation | blocked by 11 |
| 13 | Harden admin access after first sign-in | blocked by 5 |
| 14 | Fix pre-existing frontend defects | ready |
| 15 | Triage npm audit vulnerabilities | ready |

---

## Shared context — paste this with any item

> **Project.** `vp-web`, a bilingual (ES/EN) single-page landing site for Viajeros Paraguaná. Next.js **16.2.4** App Router + React **19.2.4**, TypeScript strict, no Tailwind. Deployed on Vercel (project `vp-web`, `prj_VOXwKzKQ92eVAGNWrcV8YgPHLUm0`, team `team_D5ZLyP3X2kl0uAXyis4CwQuG`). Working dir `/Users/enmachs/Workspace/Clients/vp-web`.
>
> **CMS.** KeystoneJS **8.1.0** (`@keystone-6/core@8.1.0`, `@keystone-6/auth@10.0.5`) on **Prisma 7.10.0** with PostgreSQL.
>
> **⚠️ READ `AGENTS.md` IN THE REPO BEFORE WRITING ANY CODE.** Two things there will otherwise cost you hours:
> 1. This is **Keystone 8**, but essentially all published Keystone material — the official blog, most of keystonejs.com, every tutorial — describes **v6** and is now wrong. `db.url`, `config.storage`, `initFirstItem`, and `@keystone-6/core/next` / `withKeystone()` (the "embedded mode" post) **do not exist**. Verify against `node_modules/@keystone-6/core/dist/declarations/` rather than any external source.
> 2. This is **Next.js 16**, which has breaking changes versus most training data. Bundled docs are in `node_modules/next/dist/docs/`.
>
> **Architecture.** One repo, two deploy targets, two config entrypoints:
> - `keystone/config.base.ts` — auth-free, Admin UI disabled. **This is what the Next.js app imports.** It exists to keep `@keystone-6/auth` (and Express/Apollo behind it) out of the serverless bundle. Never import `keystone/config.ts` from `app/` or `lib/`.
> - `keystone/config.ts` — `withAuth` + session + Admin UI + seeding. Keystone CLI and the admin container only. Root `keystone.ts` re-exports it.
>
> The site reads content **in-process via `getContext()`** (Prisma directly, no GraphQL hop). The Admin UI is a generated Next pages-router app run behind Express via a Next custom server, so it **cannot deploy to Vercel** — it ships as a container (`Dockerfile` at repo root).
>
> **Local dev is already working:** PostgreSQL 16 via Homebrew with databases `vp_web_dev` and `vp_web_shadow`, credentials in `.env` (gitignored). `npm run dev` → site on :3000, `npm run dev:cms` → Admin UI on :3001. Migration `20260909030623_init_content_lists` is applied and the DB is seeded with 3 `ServiceType` rows, one admin user, and the `ContactInfo` singleton.
>
> **Scripts:** `dev`, `dev:cms`, `build`, `build:cms`, `start`, `start:cms`, `test`, `lint`, `db:migrate`, `db:deploy`, `db:seed`, `db:reset`, `db:studio`.
>
> **Content model** (`keystone/schema.ts`), all bilingual via sibling `…Es`/`…En` fields on one row: `ServiceType` (taxonomy: `trips`/`pkg`/`clients`, with `kind` = `service`|`showcase`), `Service`, `GalleryItem`, `ContactInfo` (**singleton**), `SocialLink`, `Review`, `User`.
>
> **Current state:** the lists exist and are queryable, but **nothing renders from them yet** — `lib/dict.ts` and `lib/data.ts` are still the live content source. That is the agreed phase boundary, not an oversight.
>
> **Verified gotchas that will bite you:**
> - `getContext()` constructs a PrismaClient **eagerly**, and Next evaluates module scope during `next build`. Always use `getKeystoneContext()` from `lib/keystone.ts` (lazy + `globalThis`-cached). A module-scope const turns a missing `DATABASE_URL` into a *build* failure.
> - **Only Next.js reads `.env`.** The Keystone CLI and Prisma CLI do not — `keystone/db.ts` and `prisma.config.ts` each call `process.loadEnvFile('.env')`. Remove either and the CLIs break.
> - **Denying the `query` operation filters results to empty; it does not throw.** An anonymous `{ users { id } }` returns `{"users": []}`, not an error, even with rows present. Never assert on a thrown error.
> - Lists need explicit generics: `list<Lists.X.TypeInfo>({...})`. Shared `access`/field helpers must be **generic factories** (`<T extends BaseListTypeInfo>() => ...`) or they pin to `BaseListTypeInfo` and won't compile.
> - Singleton lists get `id Int` forced by Keystone, overriding the global `uuid` idField. Never set a list-level `db.idField` on one.
> - `relationship` with `ui.displayMode: 'count'` **requires** `itemView: { fieldMode: 'read' }`.
> - Underscore-prefixed folders under `app/` are **private** and never become routes.
> - `revalidateTag` takes **two** arguments in Next 16. `cacheComponents` is off, so `use cache`/`cacheLife` are unavailable.
> - Running any `.ts` script needs `tsx` — the generated Prisma client uses extensionless imports that raw Node ESM cannot resolve. Test/script imports must be **extensionless** (a `.ts` suffix breaks `tsc`).
> - `schema.prisma` / `schema.graphql` are **generated** — never hand-edit. `schema.prisma` must be committed; `postinstall` runs `keystone postinstall` (`--frozen`) and fails the build on drift. After any schema edit: `npx keystone build --no-ui && git add schema.prisma schema.graphql`.
>
> **Always finish by running:** `npx tsc --noEmit && npm run lint && npm test && npm run build`.

---
## 1. Commit the phase-1 Keystone integration

**Ready now.** No dependencies.

Nothing from the Keystone integration is committed. The repo is on `main`; create a branch first.

**Include:** `keystone.ts`, `keystone/**`, `lib/keystone.ts`, `schema.prisma`, `schema.graphql`, `prisma.config.ts`, `migrations/**`, `test/**`, `Dockerfile`, `.dockerignore`, `.env.example`, `TODO.md`, `app/api/ks-health/`, and modified `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `AGENTS.md`, `README.md`.

**Do not commit:** `.env` (gitignored — contains a local admin password). Confirm `generated/` and `.keystone/` remain ignored.

**Ask the user first:** `components/{About,Hero,LogoMark,Nav,Tender}.tsx`, `lib/data.ts` and `public/images/` have uncommitted changes that **predate** this work. Confirm whether they belong in this commit or a separate one before including them.

**Done when:** `git status` shows only intentionally-ignored files, and a fresh `git clone` + `npm install` + `npm run build` succeeds.

---

## 2. Provision Neon Postgres via the Vercel Marketplace

**Ready now, but needs a human for the login step. Blocks items 3, 4, 5.**

Production has no database yet; only local Postgres exists.

**Steps:**
1. `npm i -g vercel` if absent, then **`vercel login`** (interactive — ask the user to run it).
2. `vercel link` to project `vp-web`.
3. Load the `vercel:marketplace` skill and follow it — provision through `vercel integration add neon`, not a hand-rolled Neon signup, so env vars land in the project automatically.
4. `vercel env pull`.
5. Apply the schema: `npm run db:deploy`.

**Critical — the two URLs are not interchangeable:**
- `DATABASE_URL` = Neon **pooled** (`-pooler` in the host). This is what the serverless site uses.
- `DIRECT_DATABASE_URL` = **unpooled**. Admin container and every `prisma migrate` command only. DDL over a transaction pooler is unreliable.
- **Do NOT set `DIRECT_DATABASE_URL` on Vercel.** `keystone/db.ts` prefers it when present, so setting it there would push serverless traffic onto the unpooled connection and exhaust it.

**Never run `prisma migrate dev` against Neon** — it needs a shadow database Neon may refuse to create. Author migrations locally against `vp_web_shadow`; production only ever runs `db:deploy`.

**Set on Vercel:** `DATABASE_URL`, `BLOB_BASE_URL`, plus existing `RESEND_API_KEY`/`BUSINESS_EMAIL`/`FROM_EMAIL`. Not `DIRECT_DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, or `SEED_ADMIN_*`.

**Done when:** `npx prisma migrate status` against Neon reports up to date, and the 7 tables exist.

---

## 3. Provision Vercel Blob and verify the image round-trip

**Blocked by item 2.**

Gallery image uploads are the one feature that cannot work locally. The storage strategy is written (`keystone/storage/vercel-blob.ts`) but has never run against a real store.

**Steps:**
1. Create the store: `vercel blob store add`.
2. `BLOB_BASE_URL` = `https://<storeId>.public.blob.vercel-storage.com`. Set it on **both** Vercel and the admin container.
3. `BLOB_READ_WRITE_TOKEN` on the **admin container only** — the site never uploads, it only concatenates URLs via `url()`.

**Verify end to end:**
1. Upload an image to a `GalleryItem` in the Admin UI.
2. Rendered `src` starts with `$BLOB_BASE_URL/gallery/` and returns HTTP 200.
3. Delete the item, re-request the URL, expect **404** — this proves `delete()` works.

**The contract that matters:** Keystone's `url(key)` never sees what `put()` returned, so the pathname must be reconstructible from the key alone. That is why `put()` passes `addRandomSuffix: false`. If that regresses, every existing image 404s at once. `test/vercel-blob.test.ts` guards the pure-function half; this task proves the network half.

**Done when:** upload → 200 → delete → 404, confirmed against the real store.

---

## 4. Verify `getContext()` works in a deployed Vercel function

**Blocked by item 2. This is the one genuinely open architectural risk — do it before building anything on top.**

The entire design assumes the marketing site can read Keystone in-process on Vercel. It works locally, but **local Node passing is not proof**: Prisma 7 is engine-free and its query compiler ships as a **WASM module**, and serverless bundling/tracing of that WASM is only exercised on a real deployed function. Turbopack is the default builder in Next 16.

**Steps:**
1. `vercel deploy` (preview).
2. `curl https://<preview-url>/api/ks-health`.
3. Expect `{"ok":true,...}` with the seeded `ServiceType` rows.

**If it fails:**
- `Cannot find module .../query_compiler_bg.wasm` → the generated client lives at a **local path** (`generated/prisma`), not a package, so `serverExternalPackages` cannot exclude it. Try rewriting the generator block via `db.extendPrismaSchema`, or relocate `prismaClientPath` under `node_modules/`.
- Failure at import time → try `next build --webpack` to isolate whether Turbopack is the cause.
- `next.config.ts` already sets `serverExternalPackages: ['@keystone-6/core','@keystone-6/auth','@prisma/adapter-pg','graphql']`. Note `prisma`, `@prisma/client`, `pg` and `express` are already on Next 16's built-in auto-external list.

**If it cannot be made to work, escalate — do not work around it silently.** The fallback changes the architecture: the site would query the admin container's GraphQL endpoint over HTTP with a read-only key instead of `getContext()`, which reintroduces a network hop and a CORS surface.

**Done when:** the deployed preview returns real rows.

---

## 5. Deploy the Keystone Admin UI container

**Blocked by items 2 and 3.**

The Admin UI runs Express + a Next custom server and cannot go on Vercel. A `Dockerfile` is committed at the repo root and is untested.

**Target:** Railway (most forgiving), Render, or Fly. Node 22.

**Env:** `DATABASE_URL`, `DIRECT_DATABASE_URL` (unpooled), `SESSION_SECRET` (32+ chars — generate with `openssl rand -base64 32`), `BLOB_READ_WRITE_TOKEN`, `BLOB_BASE_URL`, `NODE_ENV=production`, plus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` for **first boot only**.

**Notes:**
- Allow **≥2 GB build memory** — `keystone build` runs a full Next build of the Admin UI (2–4 min). Render's free tier is tight.
- The Dockerfile uses `npm ci --ignore-scripts` deliberately: `postinstall` runs `keystone postinstall`, which needs source files not yet copied at that layer.
- The start command is `prisma migrate deploy && keystone start`. **The container owns migrations; Vercel never runs them.**
- **Deploy order matters forever after:** container first (applies the migration), then Vercel. Reversed, Vercel prerenders against columns that do not exist and the build fails.
- Keep `server.cors` closed. The site reads in-process, so the admin's GraphQL API needs no cross-origin access — that is a security benefit of this design, do not give it away.

**Done when:** signin page loads over HTTPS, you can sign in, edit a `Review`, and see the change from the Vercel preview.

---

## 6. Remove the temporary `ks-health` probe route

**Blocked by item 4.**

Delete `app/api/ks-health/route.ts` once the deployed check has passed. It is a diagnostic, not a product endpoint, and it returns `ServiceType` content **unauthenticated**.

If a permanent health endpoint is wanted, replace it with one returning only a status — no content rows.

**Done when:** the route is gone and `npm run build` still passes.

---
## 7. Finish the test suite

**Ready now.** Partially done.

**Already in place and verified:** the runner (`npm test` → `tsx --test test/**/*.test.ts`, using Node's built-in test runner — no vitest), the "Testing standard" section in `AGENTS.md`, and `test/vercel-blob.test.ts` (4 passing tests guarding the Blob URL contract). That suite was verified non-vacuous by deliberately breaking the contract and confirming failures.

**Still to write, highest value first:**

1. **Access control — security-critical, needs a database.** An anonymous context must not return `User` rows, and must return published content.
   **⚠️ Assert on EMPTY RESULTS, not a thrown error.** Denying the `query` operation filters rows out; it does not raise. `expect(...).toThrow()` fails even when access control works perfectly. Verified empirically: with 1 user in the table, anonymous `{ users { id } }` returns `{"users": []}`.
2. **`ContactInfo` singleton invariants** — exactly one row; `create` and `delete` denied through the API; `findOne` works with no `where` (Keystone defaults it to `{ id: '1' }`).
3. **Bilingual `…En` → `…Es` fallback** and `Intl` date formatting for `takenOn` — once the phase-3 mapping layer exists (item 11).
4. **`asStringArray()` guard** on the `json` tag fields.

**For database-backed tests** use Keystone's own helper — `resetDatabase` from `@keystone-6/core/testing/postgresql` — against `vp_web_shadow` or a dedicated `vp_web_test`. Do not mock Keystone; access control and singleton behaviour are emergent properties of the running system and a mock proves nothing about either.

**Import paths in tests must be extensionless** — tsx resolves them, and a `.ts` suffix fails `tsc` without `allowImportingTsExtensions`.

**Done when:** `npm test` covers items 1 and 2 above and passes.

---

## 8. Add CI

**Blocked by item 7.**

The schema-drift guard currently only fires when someone runs `npm install`. CI should enforce it on every PR.

**GitHub Actions job:** `npm ci` (runs `postinstall`, catching `schema.prisma` drift) → `prisma generate` → `npx tsc --noEmit` → `npm run lint` → `npm test`, with a Postgres service container for the integration tests.

The drift guard is verified to work: perturbing `schema.prisma` makes `keystone postinstall` fail with `Error: Your Prisma schema is not up to date`. This is what stops a change to `keystone/schema.ts` reaching production without its regenerated schema and migration.

**Note:** `npm run lint` currently reports **1 pre-existing error** (`react-hooks/set-state-in-effect` in `components/ClientPage.tsx:29`). Either fix it as part of item 14 first, or CI will fail on day one.

**Done when:** a PR runs all five checks and blocks merge on failure.

---

## 9. Define and wire up production logging and alerting

**Blocked by item 5** (both runtimes must exist first).

Two runtimes log to two different places — the site to Vercel, the Admin UI to its container host — and neither is currently watched.

**Never log:** quote-form submitter names, phone numbers or message bodies (PII); connection strings; `BLOB_READ_WRITE_TOKEN`; `SESSION_SECRET`; password fields. Log identifiers and outcomes, not payloads.

**Log (structured JSON):**
- `/api/quote` — outcome, Resend message id or error code, rate-limit rejections.
- Keystone — DB connection errors, failed auth attempts, migration outcome on boot.
- Blob — upload/delete failures.

**Page immediately:**
- **Any 5xx from `/api/quote`.** This is the business's only lead channel. A Resend outage currently surfaces *only* as a 502 to the visitor — nobody is told, and the lead is lost.
- **Prisma connection failures / pool exhaustion.** Usually Neon autosuspend, or the `globalThis` cache in `lib/keystone.ts` having regressed so every invocation opens a new pool.
- **`prisma migrate deploy` failing on container boot** — the container will restart-loop and the Admin UI stays down.

**Digest, do not page:** elevated 4xx, rate-limit trips, Blob failures (currently *completely* silent — a failed `put()` shows only as a failed save in the Admin UI with nothing recorded server-side).

**Wiring:** Vercel side — Vercel Agent anomaly detection and/or a log drain. Container side — the host's native drain to the same destination, so both runtimes land in one place. Choose the provider via the `vercel:marketplace` skill (category `observability`); do not hardcode one. Agree who receives alerts and on what channel before enabling.

**Also fix while here:** `app/api/quote/route.ts` has an in-memory rate-limit `Map` that is never pruned and is per-instance — it neither bounds memory nor works across Fluid Compute instances.

**Done when:** a deliberately failed quote submission produces an alert.

---

## 10. Phase 2 — complete the field sets

**Ready now** (needs content decisions from the client).

The six lists in `keystone/schema.ts` are deliberate skeletons. Fill them in, and settle these parked questions:

- **`Service.tagsEs`/`tagsEn` are `json({ defaultValue: [] })`.** Keystone has no string-array field (`multiselect` has schema-fixed options). Either keep `json` with an `asStringArray()` guard in the mapping layer, or promote tags to a related `Tag` list. Current call was `json` — 8 tags did not justify a list plus a bilingual pair per tag.
- **Enforce that `Service.serviceType` only points at `ServiceType` rows where `kind === 'service'`** (an `access.read` filter or a hook). Currently unenforced.
- **`GalleryItem.placeholderColor`** may be droppable once real photos exist — it only tints the striped stand-in.
- **`Review.initials`** could become a `virtual` derived from `authorName` instead of a stored field.

**Content to collect from the client — none of this exists in the repo:**
- Real social URLs. All four footer links are `href="#"` and **no URLs appear anywhere in the codebase**.
- Real contact values (`ContactInfo` is seeded empty).
- Gallery photos. `public/images/` contains only 8 brand logo variants — zero content photography.

**Done when:** the lists carry every field the design needs and the client can populate them unaided.

---

## 11. Phase 3 — render the site from Keystone

**Blocked by items 4 and 10.** The largest remaining piece.

The lists exist but nothing renders from them; `lib/dict.ts` (188 lines of `as const` copy) and `lib/data.ts` are still the live source.

**Shape of the work.** `components/ClientPage.tsx` is a `'use client'` boundary and *every* section sits beneath it, so: `app/page.tsx` becomes `async`, reads via `getKeystoneContext()`, and prop-drills a `content` object down. **Both locales are fetched together** because the language toggle is client-side (`localStorage`, key `vp-lang`) — that is exactly why the schema puts `…Es`/`…En` on one row rather than one row per locale.

**Keep a mapping layer** (`lib/content.ts`) between Keystone rows and components. Preserve `GalleryPhoto` and `Review` as hand-written view-model interfaces (move them to `lib/content-types.ts`) so component prop types never change. Map `isFeatured` → `dark`. Format `takenOn` with `Intl.DateTimeFormat(lang === 'es' ? 'es-VE' : 'en-US', { month: 'short', year: 'numeric' })` rather than storing a formatted string. **Do not skip the mapper and pass raw Keystone rows into components.**

**Add `export const revalidate` to `app/page.tsx`** — without it the page prerenders at build time and content freezes until redeploy.

**Serialization across the RSC boundary:** `calendarDay` returns a `'YYYY-MM-DD'` **string**; `timestamp` returns a `Date` (React 19 serializes it fine); `json` comes back `unknown` — validate before use. **Never use `decimal()`** — Prisma `Decimal` is not serializable.

**Migrate list by list**, deleting each static export only once its component reads from Keystone. `Services.tsx` needs restructuring — it hardcodes exactly two service cards in JSX and cannot render a third without a code change.

**Done when:** editing content in the Admin UI changes the site, and `lib/data.ts` is gone.

---

## 12. Add on-demand revalidation

**Blocked by item 11** — nothing to revalidate until the page reads from Keystone.

With time-based revalidation alone, a client's edit takes until the window expires to appear. Either set that expectation with them or build this.

A Keystone `afterOperation` hook POSTs to a Next route handler with a shared secret; the route calls `revalidateTag`.

**⚠️ In Next 16 `revalidateTag` takes TWO arguments** — `revalidateTag('vp-content', 'max')`. The single-argument form is a **TypeScript error**. `cacheComponents` is off in this project, so `use cache`/`cacheLife` are unavailable — wrap reads in `unstable_cache(fn, ['vp-content'], { tags: ['vp-content'] })` instead.

**Done when:** saving in the Admin UI updates the live site within seconds.

---

## 13. Harden admin access after first sign-in

**Blocked by item 5.**

The bootstrap path deliberately trades security for being able to get in at all (Keystone 8 removed `initFirstItem`, so a fresh DB otherwise gives a sign-in page you cannot pass). Close it out:

- **Remove `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`** from the container env once the user exists, and change the seeded password. The `onConnect` guard is idempotent so leaving them is not destructive, but they are live credentials sitting in env.
- **Verify `SESSION_SECRET` is a real 32+ char random value in production.** `keystone/auth.ts` throws if it is missing when `NODE_ENV=production`, but otherwise falls back to a hardcoded dev string — confirm that fallback can never be reached in a deployed environment.
- The local `.env` holds a weak development password. Fine locally; **must never be reused in production**.
- Decide whether the Admin UI should be publicly reachable at all, or sit behind IP allowlisting / the platform's access controls.
- Create **per-person admin accounts** rather than sharing one login.

**Done when:** no seed credentials remain in any deployed environment and each editor has their own account.

---

## 14. Fix pre-existing frontend defects

**Ready now.** Unrelated to the Keystone work — found while mapping the codebase, recorded so they are not lost.

1. **`components/LogoMark.tsx` accepts `size` and `color` props and ignores both.** It always renders a fixed 250px white PNG (`/images/logo-white.png`); the original SVG is commented out below. Callers pass `size` 180 (Hero), 380 (About), 440 (Tender), 44 (Footer) expecting different sizes. On the **light** Hero and About backgrounds a white logo at low opacity is effectively invisible. This is a live visual bug.
2. **`components/ClientPage.tsx:29`** trips the Next 16 rule `react-hooks/set-state-in-effect` (`setLang` inside a mount effect). It is the **only error** in `npm run lint` — fix it before item 8 or CI fails immediately.
3. **`lib/data.ts` exports `COUNTRY_CODES` and `VALID_PHONE_CODES` with zero consumers** anywhere in the repo. The Tender form uses a plain `tel` input and the API route has no `phoneCode` field. Dead code — delete rather than migrate.
4. **`components/Hero.tsx` hardcodes its stats** (`2.400+`, `12`, `98%`) with inline `lang === 'es' ? … : …` ternaries, while the equivalent About KPIs live in `dict`. Inconsistent, and a second place for content to drift.

**Done when:** `npm run lint` is clean and `LogoMark` honours its props.

---

## 15. Triage npm audit vulnerabilities

**Ready now.**

`npm install` reported **18 vulnerabilities (1 low, 3 moderate, 14 high)** after adding the Keystone dependency tree.

Run `npm audit` and triage: how many are reachable in production versus dev-only or transitive through the Admin UI build, and whether fixes exist without breaking pinned versions.

**Do not run `npm audit fix --force`.** `react-aria@3.50.0` and `react-stately@3.48.0` are **exact-version** peers of `@keystone-6/core` (also enforced via `overrides`), `prisma`/`@prisma/client`/`@prisma/adapter-pg` are pinned to `7.10.0`, and `prisma@latest` is currently an **8.0.0 release candidate** that would violate Keystone's `^7.9.0` peer. Fix deliberately.

**Done when:** each remaining advisory is either fixed or documented as accepted with a reason.
