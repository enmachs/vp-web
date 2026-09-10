# keystone-starter

One Next.js app, two things living in it: a public landing page at `/`
([`features/landing/`](features/landing/)) and an admin dashboard at
`/dashboard` ([`features/dashboard/`](features/dashboard/)) backed by
KeystoneJS. Originally forked from
[junaid33/next-keystone-starter](https://github.com/junaid33/next-keystone-starter);
the landing page and its content lists were merged in from a separate `vp-web`
project. See [`VERCEL-DEPLOYMENT-NOTES.md`](VERCEL-DEPLOYMENT-NOTES.md) for the
deploy-specific issues — this file is the general orientation.

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
  bucket name `my_images`, used by `Todo.coverImage`, `TodoImage.image`, and
  `GalleryItem.image`. There is no Vercel Blob storage in this project — if you
  see a reference to one, it's leftover from `vp-web` and needs to be ported to
  S3 or removed.

## Content model

Two families of lists in [`features/keystone/models/`](features/keystone/models/),
one file per list:

- **App lists** (pre-existing): `User`, `Role`, `Todo`, `TodoImage`. Access
  control is permission-flag-based — see `permissions` and `rules` in
  [`features/keystone/access.ts`](features/keystone/access.ts).
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
  `features/dashboard/views/registry.ts` before using a field type that isn't
  already in `features/keystone/models/Todo.ts`. `calendarDay` has no view;
  use `timestamp` instead (see `GalleryItem.takenOn`).
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
- **`npm run build` runs migrations** (`keystone build --no-ui && npm run
  migrate && next build`), a holdover from the Railway deploy target in
  `railway.toml`. On Vercel this means every deployment — previews included —
  runs `prisma migrate deploy` against whatever `DATABASE_URL` it's given. See
  `VERCEL-DEPLOYMENT-NOTES.md#issue-1` before changing environments or the
  build command.
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
