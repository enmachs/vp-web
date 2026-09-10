# Viajeros Paraguaná — vp-web

Bilingual (ES/EN) landing site for Viajeros Paraguaná, with a KeystoneJS admin for the content the client maintains.

- **Site** — Next.js 16 (App Router) + React 19, deployed on Vercel
- **Admin** — KeystoneJS 8 + Prisma 7, deployed as a container
- **Database** — PostgreSQL (local for development, Neon in production)
- **Media** — Vercel Blob · **Email** — Resend

## How it fits together

```
                    ┌──────────────────────────┐
   Neon Postgres ◄──┤ Next.js site (Vercel)    │  reads in-process via getContext()
        ▲           │ imports config.base.ts   │  no HTTP hop to Keystone
        │           └──────────────────────────┘
        │           ┌──────────────────────────┐
        └───────────┤ Keystone Admin UI        │  keystone start (Express + Next custom server)
                    │ imports config.ts        │  content edits + image uploads
                    └──────────────────────────┘
                                 │
                                 ▼
                          Vercel Blob (images)
```

The site reads content **in-process through Prisma** — there is no GraphQL call between the two. They are separate deploy targets because Keystone's Admin UI runs its own Express + Next custom server, which Vercel cannot host.

## Getting started

**Prerequisites:** Node.js 22+, PostgreSQL 16+, and the Vercel CLI (`npm i -g vercel`) only if you're deploying.

### 1. Local database

The project uses Postgres locally — the same engine as production, so migrations behave identically. On macOS:

```bash
brew install postgresql@16
brew services start postgresql@16
```

Create the application database and a shadow database (Prisma needs the second one to author migrations):

```bash
createdb vp_web_dev
createdb vp_web_shadow
```



### 2. Environment

```bash
cp .env.example .env      # infrastructure — see below
```

Set the database URLs in `.env`. Locally there is no connection pooler, so both point at the same database (replace `youruser` with your system username — a stock Homebrew Postgres uses trust auth, so no password):

```bash
DATABASE_URL=postgresql://youruser@127.0.0.1:5432/vp_web_dev
DIRECT_DATABASE_URL=postgresql://youruser@127.0.0.1:5432/vp_web_dev
SHADOW_DATABASE_URL=postgresql://youruser@127.0.0.1:5432/vp_web_shadow
SESSION_SECRET=$(openssl rand -base64 32)
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=pick-something
```

> **Only Next.js reads** `.env` **automatically.** The Keystone and Prisma CLIs do not, so `keystone/db.ts` and `prisma.config.ts` each load it explicitly via `process.loadEnvFile`. If you move that code, both CLIs break with `DATABASE_URL is not set`.



### 3. Create the schema and sign in

```bash
npm install                # postinstall regenerates schema + Prisma client
npm run db:migrate         # create the tables
npm run db:seed            # seed the ServiceType taxonomy (idempotent)
```

Then run both servers, in separate terminals:

```bash
npm run dev        # site   → http://localhost:3000
npm run dev:cms    # admin  → http://localhost:3001
```

The admin user is created on the Keystone server's **first boot** from `SEED_ADMIN_`* — Keystone 8 has no first-user bootstrap page, so without those variables you get a sign-in screen you cannot get past. Once you can sign in, **remove both variables** and change the password.

To start over: `npm run db:reset` drops, recreates and re-migrates the database.



### What does not work locally ⚠️

Gallery **image uploads** need a Vercel Blob token. Without `BLOB_READ_WRITE_TOKEN` and `BLOB_BASE_URL`, uploads fail; everything else — all lists, relationships, the site's read path — works fully offline.



### Environment variables

`.env.example` documents all of them. The split matters:

- `.env` — infrastructure (database, session secret, Blob). Read by Next.js, and loaded explicitly by the Keystone and Prisma CLIs.
- `.env.local` — Resend keys. Next.js only.

In production the two database URLs diverge and are **not** interchangeable: `DATABASE_URL` is Neon's **pooled** connection for the serverless site, `DIRECT_DATABASE_URL` is the **unpooled** one for the admin container and every `prisma migrate` command (DDL over a transaction pooler is unreliable). `DIRECT_DATABASE_URL` is deliberately never set on Vercel.



## Scripts


| Script                        | What it does                                                         |
| ----------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                 | Site on :3000                                                        |
| `npm run dev:cms`             | Admin UI on :3001 (pushes schema changes straight to the DB)         |
| `npm run build`               | `prisma generate && next build` — what Vercel runs                   |
| `npm run build:cms`           | Full Keystone build including the Admin UI — what the container runs |
| `npm run start` / `start:cms` | Production starts                                                    |
| `npm run db:migrate`          | `prisma migrate dev` — author a migration                            |
| `npm run db:deploy`           | `prisma migrate deploy` — apply migrations                           |
| `npm run db:seed`             | Seed the ServiceType taxonomy (idempotent)                           |
| `npm run db:reset`            | Drop, recreate and re-migrate the database                           |
| `npm run db:studio`           | Prisma Studio                                                        |
| `npm test`                    | Node test runner via tsx                                             |
| `npm run lint`                | ESLint                                                               |




## Content model

Defined in `keystone/schema.ts`. Copy is bilingual via sibling `…Es` / `…En` fields on a single row, because the site's language toggle is client-side.


| List          | Holds                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `ServiceType` | The one taxonomy — `trips` / `pkg` / `clients`. `kind` separates a sellable service from a gallery-only bucket. |
| `Service`     | The service cards, related to a `ServiceType`.                                                                  |
| `GalleryItem` | Gallery photos on Vercel Blob, categorised by `ServiceType`.                                                    |
| `ContactInfo` | **Singleton.** Email, phone, WhatsApp, address, hours — one of each.                                            |
| `SocialLink`  | Social profiles and their URLs.                                                                                 |
| `Review`      | Testimonials.                                                                                                   |
| `User`        | Admin logins. Never publicly queryable.                                                                         |


Contact values are stored raw (`+584140000000`) so `tel:` / `mailto:` / `wa.me` links can be derived in code rather than authored by an editor.

### Changing the schema

`schema.prisma` and `schema.graphql` are **generated** — never edit them by hand.

```bash
# 1. edit keystone/schema.ts
npx keystone build --no-ui                  # regenerate schema + types
npm run db:migrate -- --name describe_it    # author the migration
git add schema.prisma schema.graphql migrations/
```

Committing `schema.prisma` is required: `postinstall` runs `keystone postinstall`, which fails the build if the committed schema has drifted from the config. That guard is deliberate — it stops a schema change from reaching production without its migration.

> **Author migrations locally, never against Neon.** `prisma migrate dev` needs a shadow database it can create and drop, which Neon may refuse — that is what the local `vp_web_shadow` database is for. Author and commit migrations against local Postgres; production only ever runs `db:deploy`.



## Deploying

**Order matters.** Deploy the admin container **first** — it runs the migrations — then Vercel. Reversed, Vercel prerenders against columns that don't exist yet and the build fails.

**Site (Vercel).** Standard `npm run build`. Set `DATABASE_URL` (pooled), `BLOB_BASE_URL`, `SESSION_SECRET`, and the existing Resend vars. Do **not** set `DIRECT_DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, or `SEED_ADMIN_`*.

**Admin (Railway / Render / Fly).** Build from the `Dockerfile`; it applies migrations then starts Keystone. Needs `DATABASE_URL`, `DIRECT_DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `BLOB_BASE_URL`. Allow ≥2 GB build memory — `keystone build` runs a full Next build of the Admin UI.

Content edits are **not** instant: `app/page.tsx` uses time-based revalidation, so changes appear after the revalidation window rather than immediately.



## Project layout

```
app/                    Next.js routes. api/quote → Resend; api/ks-health → temporary probe
components/             UI. ClientPage.tsx is the 'use client' boundary; all sections sit under it
lib/dict.ts             Bilingual site copy (still static — not yet in Keystone)
lib/data.ts             Legacy static content, superseded list by list as components migrate
lib/keystone.ts         getKeystoneContext() — the site's read path
keystone.ts             Keystone CLI entrypoint → keystone/config.ts
keystone/
  config.base.ts        Auth-free config. What the Next.js app imports
  config.ts             withAuth + session + Admin UI + seeding. CLI and container only
  schema.ts             The content model
  access.ts             Access control factories
  db.ts                 Prisma 7 driver-adapter setup
  storage/vercel-blob.ts  Image storage strategy
schema.prisma           GENERATED — do not edit
generated/              GENERATED — gitignored
```



## Outstanding work

`TODO.md` tracks what is left, each item written to be self-contained enough to hand to someone (or something) with no prior context. Start there rather than reverse-engineering intent from the code.

## Notes for contributors

`AGENTS.md` documents the sharp edges — most importantly that this is **Keystone 8**, while essentially all published Keystone documentation describes v6. `db.url`, `config.storage`, `initFirstItem`, and `withKeystone`/embedded mode no longer exist. Read it before touching anything under `keystone/`.