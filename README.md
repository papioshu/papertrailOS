# Papertrail OS

A profile-based lead research, grading, and controlled-outreach operating
system. **Track. Connect. Remember.**

Four operating profiles — **Zathena Ventures**, **Papershoots**, **Caedis
Aerials**, **BMBSQD** — each with isolated leads, campaigns, drafts, and
archives, run from a single one-page workflow:

> Collect → Research → Audit → Grade → Draft → Approve → Send → Follow Up → Archive

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase Postgres (database) via Prisma ORM
- NextAuth (Credentials, JWT sessions)
- Profile isolation enforced by server-side guards + Prisma query scoping

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET
npm install
npm run db:migrate          # create tables (uses DIRECT_URL)
npm run db:seed             # 4 profiles + Paper super-admin
npm run dev                 # http://localhost:3000
```

Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

### Database (Supabase Postgres)

Create a Supabase project, then from **Project Settings → Database**:

- `DATABASE_URL` — pooled connection (port 6543, `?pgbouncer=true`), used at runtime.
- `DIRECT_URL` — direct connection (port 5432), used by Prisma migrations.

### Default login

After seeding: `paper@papertrail.os` / `papertrail-dev` (super admin, all
profiles). Override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before
seeding.

## Environment variables

See [`.env.example`](.env.example). Integration keys (Google Places, model
provider, Gmail) are optional — routes that need a missing key fail gracefully
and name the variable required.

## Roles

`super_admin` (Paper account, all profiles) · `profile_admin` · `profile_member`
· `viewer`. See `src/lib/rbac.ts`; run the check with
`npx tsx src/lib/rbac.check.ts`.

## Status

**Phase 1 (foundation) complete:** auth, profiles, memberships, RBAC, profile
selector, one-page workflow shell, schema + seed, design system. Lead
generation, audit, drafting, sending, and replies land in Phases 2–7 (see
`TERMINOLOGY.md` and the project brief).

## Branding

This codebase follows the no-AI-slop rule: product-native language only. Model
providers are hidden behind a neutral provider abstraction — see
[`TERMINOLOGY.md`](TERMINOLOGY.md).
