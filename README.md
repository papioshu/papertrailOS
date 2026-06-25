# Papertrail OS

```txt
   ____                        __             _ __   ____  _____
  / __ \____ _____  ___  _____/ /__________ _(_) /  / __ \/ ___/
 / /_/ / __ `/ __ \/ _ \/ ___/ __/ ___/ __ `/ / /  / / / /\__ \ 
/ ____/ /_/ / /_/ /  __/ /  / /_/ /  / /_/ / / /  / /_/ /___/ / 
/_/    \__,_/ .___/\___/_/   \__/_/   \__,_/_/_/   \____//____/  
           /_/                                                    

        Lead Signal Command
        Track. Connect. Remember.

        built under Paper / Papers
```

**Papertrail OS** is a profile-based lead research, grading, website audit, controlled outreach, and CRM follow-up operating system.

It is designed for creative operators managing multiple business lanes from one controlled dashboard:

* **Zathena Ventures** — websites, booking systems, CRM, SEO, automation, and digital presence.
* **Papershoots** — artist content, event recaps, social clips, music videos, and creative media.
* **Caedis Aerials** — drone footage, aerial coverage, venue flyovers, and visual intelligence.
* **BombSquad / BMBSQD** — events, media, entertainment, art, streetwear, music, and creative campaigns.

Papertrail OS is not a spam tool. It is built around controlled outreach, profile-level permissions, suppression lists, safety limits, approval workflows, audit logging, and clear lead progression.

---

## Overview

Papertrail OS helps each profile move leads through one clean workflow:

```txt
Collect → Enrich → Audit → Grade → Draft → Approve → Send → Follow Up → Archive
```

Each profile has its own:

* leads
* prospects
* customers
* campaigns
* website audits
* outreach drafts
* replies
* follow-ups
* suppression list
* archive
* business identity
* safety settings

A super admin account can access all profiles for troubleshooting, QA, workflow support, and system maintenance.

---

## Core Features

### Multi-Profile Workspace

Papertrail OS supports separate operating profiles for each business lane.

Each profile has isolated data, profile-specific campaigns, and role-based access.

Supported roles:

* `super_admin`
* `profile_admin`
* `profile_member`
* `viewer`

### Lead Collection

Lead collection supports:

* manual lead entry
* CSV import
* local business search providers
* Google Places integration when configured
* event/content lead tracking provider interface
* deduplication by website, email, phone, and name/address

Captured lead fields include:

* business name
* category
* address
* phone
* website
* public email
* Google rating
* review count
* social links
* source
* source URL
* profile
* campaign
* status

### Website Audit

The website audit engine checks:

* mobile friendliness
* page speed impression
* broken links
* missing contact form
* missing booking button
* SSL/security issues
* SEO title quality
* meta description
* CTA clarity
* social links
* old copyright year
* branding quality
* video/photo presence

Audit output includes findings, evidence, score impact, and recommended offer angle.

### Lead Grading

Papertrail OS scores leads from `0–100` using configurable scoring logic.

Scoring categories include:

* lead score
* fit score
* urgency score
* budget likelihood score
* contactability score
* website score
* content need score
* event fit score

Score ranges:

```txt
0–39    Not Fit
40–59   Needs Review
60–74   Qualified
75–89   High Fit
90–100  Hot Lead
```

Each score includes an explanation.

### Offer Matching

The offer matching engine maps a lead to the most appropriate profile-specific offer.

Examples:

**Zathena Ventures**

* website refresh
* booking system
* CRM setup
* SEO cleanup
* automation workflow

**Papershoots**

* artist content package
* event recap
* short-form clips
* promo shoot
* raw footage package

**Caedis Aerials**

* drone event footage
* venue aerial package
* real estate aerials
* construction/site flyover

**BombSquad / BMBSQD**

* event media partnership
* creative campaign
* streetwear drop content
* artist showcase media
* cross-profile package

### Outreach Drafting

Papertrail OS creates soft, controlled outreach drafts.

Supported draft types:

* short email
* short DM
* call script
* follow-up 1
* follow-up 2

Drafts are built from actual lead context and profile-specific offer logic.

The tone should remain:

* natural
* direct
* not pushy
* not fake familiar
* not overpromising
* not deceptive

### Compliance Check

Before outreach can be queued or sent, Papertrail OS checks:

* no deceptive subject lines
* no fake prior contact
* business identity is configured
* opt-out line exists where required
* suppression list is checked
* daily caps are enforced
* campaign is active
* lead is not marked do-not-contact
* profile safety settings allow action

### Controlled Sending

Papertrail OS supports safe send modes:

```txt
draft_only
manual_approval
controlled_send
```

Default mode should be `draft_only` or `manual_approval`.

Sending must enforce:

* profile daily cap
* campaign daily cap
* send window
* business-days-only option
* stop on reply
* stop on opt-out
* stop on bounce
* suppression list
* max touches
* no duplicate sends

### CRM Follow-Up

Papertrail OS tracks the full relationship trail:

* contacted
* follow-up 1
* follow-up 2
* replied
* interested
* not interested
* customer
* archived
* closed
* opted out
* do not contact

Follow-ups are scheduled only when allowed by safety rules and campaign settings.

---

## Tech Stack

Papertrail OS is a web-first application.

Current stack:

* **Next.js**
* **TypeScript**
* **Tailwind CSS**
* **Supabase Postgres**
* **Prisma ORM**
* **NextAuth**
* **Role-based access control**
* **Background job runner**
* **Server-side provider abstractions**
* **Google integrations**
* **CSV import/export**

Supabase is used as the hosted Postgres provider.

Prisma is used for schema management, migrations, and type-safe database access.

NextAuth is used for authentication, sessions, and profile-based access control.

---

## Project Structure

Recommended structure:

```txt
src/
  app/
    login/
    select-profile/
    profiles/
      [profileId]/
        page.tsx
        archive/
        settings/
    admin/
    api/
      leads/
      outreach/
      jobs/
      replies/
      followups/

  components/
    layout/
    profile/
    workflow/
    leads/
    campaigns/
    outreach/
    archive/
    ui/

  lib/
    auth/
    db/
    permissions/
    jobs/
    providers/
    lead/
    audit/
    outreach/
    compliance/
    crm/
    utils/

  server/
    services/
      leadCollector/
      enrichment/
      websiteAudit/
      scoring/
      offerMatcher/
      outreachComposer/
      compliance/
      crmUpdater/
      replyClassifier/
      jobRunner/

  assets/
  styles/

prisma/
  schema.prisma
  migrations/
  seed.ts
```

---

## Environment Variables

Create a `.env.local` file.

Required variables:

```env
DATABASE_URL=
DIRECT_URL=

NEXTAUTH_URL=
NEXTAUTH_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_PLACES_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

ANTHROPIC_API_KEY=
OPENAI_API_KEY=

APP_URL=
ENCRYPTION_KEY=
DEFAULT_SEND_CAP=25
NODE_ENV=development
```

Provider keys should only be used server-side unless explicitly marked public.

Never expose service role keys in client code.

---

## Installation

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Seed initial profile data:

```bash
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Database

Papertrail OS uses Supabase Postgres through Prisma.

Important Prisma models include:

* `User`
* `Account`
* `Session`
* `Profile`
* `ProfileMembership`
* `BusinessIdentity`
* `ProfileSettings`
* `Campaign`
* `Lead`
* `LeadSource`
* `LeadEnrichment`
* `WebsiteAudit`
* `EventLead`
* `OutreachDraft`
* `SendQueueItem`
* `SentMessage`
* `Reply`
* `FollowUp`
* `SuppressionEntry`
* `Customer`
* `Prospect`
* `ActivityLog`
* `JobRun`
* `ApiIntegration`
* `AuditLog`

Profile-owned records must include `profileId`.

Server routes must verify profile access before reading or writing data.

---

## Authentication

Papertrail OS uses NextAuth.

Authentication flow:

1. Unauthenticated users go to login.
2. Users with one profile go directly to that profile workflow page.
3. Users with multiple profiles go to profile selection.
4. Super admins can switch between all profiles.
5. Profile members can only access assigned profile data.

Permission helpers should include:

```ts
requireAuth()
requireProfileAccess(profileId)
requireRole(profileId, allowedRoles)
isSuperAdmin(userId)
```

Client-side hiding is not enough. Every server route must enforce permissions.

---

## Profile Workflow

Each profile operates from a single primary workflow page.

Workflow steps:

```txt
Collect
Enrich
Audit
Grade
Draft
Approve
Send
Follow Up
Archive
```

Each step should show:

* status
* record count
* running state
* completion state
* error state
* retry option
* next recommended action

---

## Design System

Papertrail OS uses a **Gen X Soft Club** design direction.

Visual traits:

* dark purple atmosphere
* soft glow
* posterized brand assets
* wrinkled paper textures
* barcode/ticket details
* airport/transit signage language
* frosted modal cards
* profile color cards
* silhouette backgrounds
* clean CRM readability

Motion should be subtle and purposeful:

* scanning lines during enrichment
* radar pulse during lead discovery
* score reveal after grading
* paper/ticket slide-in for drafts
* queue movement after approval
* safety lock before sending

Recommended utility:

```bash
npm install @formkit/auto-animate
```

Use AutoAnimate for:

* workflow step changes
* lead list updates
* outreach queue changes
* expandable lead panels
* profile card transitions

Do not overuse animation. Function and clarity come first.

---

## Safety Rules

Papertrail OS must not operate as an uncontrolled spam system.

Hard rules:

* no fake subject lines
* no deceptive outreach
* no fake prior contact
* no sending without business identity
* no sending to suppressed leads
* no sending to do-not-contact leads
* no duplicate sends
* no follow-up after reply
* no follow-up after opt-out
* no follow-up after bounce
* no follow-up after close
* max touches enforced
* daily caps enforced
* campaign caps enforced
* activity logs required

Default mode should favor manual approval.

---

## Product Language

Papertrail OS should not look or read like a prompt-generated project.

Use product-native language:

* Research Engine
* Grading Engine
* Draft Engine
* Lead Signal
* Offer Match
* Compliance Check
* Job Runner
* Campaign Pulse
* Reply Radar
* Outreach Queue

Avoid user-facing language such as:

* AI-powered
* ChatGPT
* Claude
* prompt
* magic writer
* bot
* autonomous spam

Provider-specific terms may exist only in server configuration where technically required.

---

## Development Commands

Recommended scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run scan:slop
```

Optional `scan:slop` should check for unwanted product language in docs, UI, and comments.

---

## Deployment

Papertrail OS can be deployed to:

* VPS
* Vercel
* Docker-based hosting
* private internal server

Database:

* Supabase Postgres

Before deploying:

1. Set all environment variables.
2. Run Prisma migrations.
3. Confirm NextAuth URL and secret.
4. Confirm profile memberships.
5. Confirm business identities.
6. Confirm send caps.
7. Confirm suppression behavior.
8. Confirm service keys are server-only.

---

## Roadmap

### Phase 1 — Foundation

* Auth
* Profiles
* Profile memberships
* RBAC
* Profile selector
* Business identity settings
* Workflow shell
* Design asset integration

### Phase 2 — Leads

* Manual lead entry
* CSV import/export
* Lead table
* Deduplication
* Campaign creation
* Status pipeline

### Phase 3 — Research / Audit / Grade

* Website enrichment
* Website audit
* Lead scoring
* Offer matching
* Job status UI

### Phase 4 — Drafting

* Outreach drafts
* Email/DM/call scripts
* Follow-ups
* Compliance checker
* Editable draft panel

### Phase 5 — Gmail / Queue

* Gmail OAuth
* Gmail draft creation
* Send queue
* Manual contacted status
* Controlled send mode

### Phase 6 — Replies / CRM

* Reply sync
* Reply classification
* Follow-up scheduler
* Customer/prospect archive

### Phase 7 — Event Tracker

* Event search workflow
* Event lead extraction
* Papershoots/Caedis/BMBSQD offer matching

---

## License

Private project unless otherwise specified.

---

```txt
        _______________________________
       /                              /|
      /   PAPERTRAIL OS              / |
     /   Lead Signal Command        /  |
    /______________________________/   |
    |                              |   |
    |   track   connect   remember |   |
    |                              |  /
    |   CREATE OR DIE              | /
    |______________________________|/

        signed,
        paper
```
