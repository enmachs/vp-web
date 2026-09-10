# Plan: replace vp-web's repo/deployment with keystone-starter

Goal: `keystone-starter` (now containing the landing page + CMS lists merged
from `vp-web`) becomes the live content of the `vp-web` GitHub repo and its
linked Vercel project.

## Facts on the ground (verified, not assumed)

| Fact | Detail |
| --- | --- |
| `vp-web` GitHub repo | `enmachs/vp-web`, branch `main`, 4 commits, working tree clean |
| `keystone-starter` GitHub repo | `junaid33/next-keystone-starter` (**upstream template, not the user's repo**) |
| `vp-web` Vercel project | `vp-web` (`prj_VOXwKzKQ92eVAGNWrcV8YgPHLUm0`), org `enmachs-projects` |
| Vercel domains | **None configured** — only `*.vercel.app` URLs. No live custom domain at risk. |
| Last production deploy | 2 hours ago, succeeded |
| Neon Postgres | **Provisioned ~2 hours ago** in the `vp-web` Vercel project (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, etc. all present) |
| Vercel Blob | **Not provisioned** — no `BLOB_READ_WRITE_TOKEN` in the project |
| `RESEND_API_KEY`, `BUSINESS_EMAIL`, `FROM_EMAIL` | Already set in Vercel production |
| `SESSION_SECRET` | **Not set** in Vercel — needed once the dashboard goes live there |

## ⚠️ Open risk: unknown state of the provisioned Neon database

`vp-web`'s own `build` script (`prisma generate && next build`) never runs
`prisma migrate deploy`, so provisioning the database two hours ago does not
by itself mean any schema was applied to it. But I have not confirmed this —
it needs a direct check before anything is pushed.

This matters because **`keystone-starter`'s migration history and `vp-web`'s
are incompatible.** `vp-web`'s own `20260909030623_init_content_lists`
migration creates its own `User` table with `uuid` ids and no `Role`/`Todo`
tables; `keystone-starter`'s 8 migrations use `cuid` ids and a different
`User`/`Role` shape. If that Neon database already has `vp-web`'s schema
applied, pointing `keystone-starter` at it and running its migrations will
fail outright (conflicting `_prisma_migrations` history) or, worse, `migrate
reset` would be needed and would destroy whatever is there.

**I have not connected to this database or run anything against it.** See the
question below — I want to check `prisma migrate status` against it before
either of us decides how to proceed, rather than guess.

## Steps

1. **Pre-flight check** — pull the real `DATABASE_URL` from the `vp-web`
   Vercel project (`vercel env pull`, read-only) and run `prisma migrate
   status` from `keystone-starter` against it. Tells us definitively whether
   it's untouched, has `vp-web`'s old schema, or something else. No writes.

2. **Backup the current `vp-web` repo state** — push a `pre-keystone-starter-migration`
   tag (or branch) to `origin` on the *current* `vp-web` history before
   touching anything, so today's 4 commits stay recoverable regardless of
   which history strategy is chosen next.

3. **Bring `keystone-starter`'s content into the `vp-web` repo** — mechanics
   depend on the history strategy (see question below). Either way this
   becomes a new commit (or branch) with today's `git status --short` output:
   `AGENTS.md`, `CLAUDE.md`, `.env.example`, `VERCEL-DEPLOYMENT-NOTES.md`, the
   6 new Keystone models + migration, and `features/landing/`.

4. **Reconcile Vercel project settings for the new app:**
   - Build Command → `keystone build --no-ui && next build` (see
     `VERCEL-DEPLOYMENT-NOTES.md#issue-1` — do **not** keep migrations in the
     build command pointed at a shared database).
   - Add `SESSION_SECRET`, the five `S3_*` vars (this project uses S3, not the
     Vercel Blob vp-web was heading toward — nothing to migrate since Blob was
     never provisioned).
   - Existing `DATABASE_URL`, `RESEND_API_KEY`, `BUSINESS_EMAIL`, `FROM_EMAIL`
     carry over as-is; `RESEND_API_KEY`'s recipient logic in
     `app/api/quote/route.ts` is unchanged from `vp-web`'s.
   - Decide whether Deployment Protection stays on for previews — it will
     break `/dashboard` auth via the proxy's self-fetch (see
     `VERCEL-DEPLOYMENT-NOTES.md#issue-2`) unless addressed first.

5. **Run migrations deliberately, once**, against the (by then confirmed)
   correct database — not as a side effect of a Vercel build.

6. **Push and verify** — deploy, confirm `/` renders the landing page,
   `/dashboard` reaches signin without a redirect loop, `/api/quote` responds.

## What I'm not deciding for you

- Whether the repo's git history should be `vp-web`'s, `keystone-starter`'s,
  or a merge of both.
- Whether to fix the two known Vercel deploy issues (build-time migration,
  proxy self-fetch under Deployment Protection) before this push or after.
- What to do if the pre-flight check finds `vp-web`'s schema already applied
  to the Neon database.
