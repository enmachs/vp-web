# keystone-starter

One Next.js app, two things living in it: a public landing page at `/`
([`features/landing/`](features/landing/)) and an admin dashboard at
`/dashboard` ([`features/dashboard/`](features/dashboard/)) backed by
KeystoneJS. Originally forked from
[junaid33/next-keystone-starter](https://github.com/junaid33/next-keystone-starter);
the landing page and its content lists were merged in from a separate `vp-web`
project. See [`VERCEL-DEPLOYMENT-NOTES.md`](VERCEL-DEPLOYMENT-NOTES.md) for the
deploy-specific issues — this file is the general orientation.

## Working on this repo

New work goes on a **branch + pull request**, not straight onto `main`.
Vercel deploys `main` to production; a PR is the review surface and the
preview deploy. Do not implement something by committing to `main`.

1. Branch from up-to-date `main` (`feat/…`, `fix/…`).
2. Keep the PR to one concern (schema, workflow, landing copy, …).
3. Open the PR and wait for review. Implementing a change includes opening
   the PR; it does not include merging it.

Schema changes follow that same path. Production apply is
[`.github/workflows/migrate.yml`](.github/workflows/migrate.yml)
(`npm run migrate:http` over Neon HTTPS), **not** `npm run build` and **not**
`prisma migrate deploy` from a laptop. After the first successful run on
`main` you can comment that workflow step out if later pushes should leave
the schema alone.

**This is Keystone 6** (`@keystone-6/core@^6.5.1`), **not** Keystone 8.
Anything you read about Keystone that mentions Prisma 7 driver adapters,
`config.storage` moving to per-field, or `initFirstItem` being removed is
describing a different major version — this project still uses `db.url`,
top-level `storage`, and `initFirstItem` directly. Verify against
`node_modules/@keystone-6/core/dist/declarations/` if in doubt.

## Architecture

- `keystone.ts` → [`features/keystone/index.ts`](features/keystone/index.ts) —
  the **one** Keystone config. Unlike some Keystone/Next setups, there is no
  split between an auth-free config (for the Next app) and a full config (for
  a separate Admin UI container). This project **never builds Keystone's
  generated Admin UI** — every `build`/`dev` script passes `--no-ui` — so
  there is no second deploy target. The dashboard under `app/dashboard` is a
  hand-built replacement that talks to Keystone over `/api/graphql`.
- [`features/keystone/context.ts`](features/keystone/context.ts) — the
  Keystone context Server Components/Route Handlers can call directly
  (`.query.X`, `.db.X`). Created at module scope with a `globalThis` cache
  guarded by `NODE_ENV !== 'production'` — see
  `VERCEL-DEPLOYMENT-NOTES.md#issue-3` for why that matters on Fluid Compute.
- [`proxy.ts`](proxy.ts) — Next middleware. For any `/dashboard/*` route it
  calls `getAuthenticatedUser`
  ([`features/dashboard/middleware.ts`](features/dashboard/middleware.ts)),
  which issues an HTTP request to the app's **own** `/api/graphql` rather than
  calling the Keystone context directly. This is a real cost (extra function
  invocation + round trip per navigation) and a real failure mode — see
  `VERCEL-DEPLOYMENT-NOTES.md#issue-2` before touching auth on Vercel.
- Image storage is **S3-compatible** (`kind: "s3"`, `features/keystone/index.ts`),
  bucket name `my_images`, currently used only by `GalleryItem.image`. There is
  no Vercel Blob storage in this project — if you see a reference to one, it's
  leftover from `vp-web` and needs to be ported to S3 or removed. See
  `README.md#image-management` for the two field patterns (single image on a
  list vs. a many-images-per-record relationship) with code examples.

## Content model

Two families of lists in [`features/keystone/models/`](features/keystone/models/),
one file per list:

- **App lists** (pre-existing): `User`, `Role`. Access control is
  permission-flag-based — see `permissions` and `rules` in
  [`features/keystone/access.ts`](features/keystone/access.ts). (The starter
  template shipped with `Todo`/`TodoImage` example lists; both were removed as
  irrelevant to this project. If you find a stray reference to either outside
  `NEXT_KEYSTONE_STARTER_GUIDE.md`/`DASHBOARD_DATA_FETCHING_ANALYSIS.md` — the
  upstream template's own generic tutorial docs, left as-is — it's drift.)
- **Landing content lists** (merged from `vp-web`): `ServiceType`, `Service`,
  `GalleryItem`, `ContactInfo` (singleton), `SocialLink`, `Review`. Public
  reads via `query: allowAll`; writes gated on the `canManageContent` role
  flag. Shared field/access factories live in
  [`features/keystone/models/shared.ts`](features/keystone/models/shared.ts) —
  add new content lists through those factories rather than duplicating the
  access shape inline.
- Bilingual content is sibling fields on one row (`titleEs` / `titleEn`), not
  one row per locale — matches the landing page's client-side language toggle
  in `features/landing/components/LandingPage.tsx`.
- **`ContactInfo` (and any future singleton) can be permanently empty.**
  `isSingleton: true` + `create: denyAll` means the one row can never be
  created through the API or dashboard — it must be seeded (see
  `features/keystone/seed.ts`, `npm run db:seed`). A singleton also gets `id
  Int` forced by Keystone regardless of the project's normal id kind; don't
  set a list-level `db.idField` on one.

## Verified gotchas

- **Every dashboard field type needs a view.** The custom dashboard resolves
  field editors through [`features/keystone/view-order/`](features/keystone/view-order/)
  and [`features/dashboard/views/registry.ts`](features/dashboard/views/registry.ts),
  which **throws** for a field type with no registered view — this breaks the
  whole item page, not just one field. Check
  `features/dashboard/views/registry.ts` before using a field type not
  currently used by any list — `bigInt`, `decimal`, `float`, `multiselect`,
  and `document` all have registered views but, after the `Todo` example list
  was removed, nothing in this project currently uses them; re-run
  `npm run migrate:gen`'s view-order step after adding a field type back so
  `VIEW_ORDER` picks it up. `calendarDay` has no view at all; use `timestamp`
  instead (see `GalleryItem.takenOn`).
- **Landing CSS must stay scoped.** `features/landing/landing.css` defines
  `--accent` and `--radius-{sm,md,lg,xl}` — names the dashboard's shadcn theme
  also uses. Everything in that file is scoped under `.vp-landing`
  (`app/page.tsx` applies the class), and the stylesheet is imported from
  `app/page.tsx` only, so it never ships on `/dashboard`. Don't move those
  tokens to `:root`.
- **Access control filters `query` to empty; it does not throw.** An
  anonymous `{ users { id } }` returns `{"users": []}`, not an access-denied
  error, even with rows present. Don't write a check that asserts on a thrown
  error for a read-access boundary — assert on the empty result.
- **`npm run build` does not run migrations.** It is `keystone build --no-ui
  && next build`. Railway still migrates in `startCommand` (`railway.toml`).
  Vercel has no start command, so production schema changes go through
  `.github/workflows/migrate.yml` (`npm run migrate:http`) against the
  `production` environment secret `DATABASE_URL_UNPOOLED` — not a repo-level
  secret, and not the pooled `DATABASE_URL` the app uses at runtime. The
  workflow job must set `environment: production` or GitHub will not inject
  it (the job then fails with “Set DATABASE_URL_UNPOOLED”). Local Postgres
  still uses `npm run migrate` (`prisma migrate deploy` over TCP). Neon from
  a network that cannot complete the
  :5432 handshake (Prisma `P1001`) uses `npm run migrate:http`. See
  `VERCEL-DEPLOYMENT-NOTES.md#issue-1`.
- **`.env` loading is explicit, not automatic.** Next.js loads `.env` on its
  own; the Keystone config additionally does `import "dotenv/config"` at the
  top of [`features/keystone/index.ts`](features/keystone/index.ts), which is
  why bare `keystone`/`prisma` CLI invocations also pick it up. Don't remove
  that import — it's not a leftover, it's what makes `keystone build` work
  outside of Next.

## Testing

No test suite exists yet. If you add access-control or singleton-invariant
tests, assert on empty results, not thrown errors (see above) — that's the
one non-obvious rule that will otherwise make a passing test suite lie to you.
