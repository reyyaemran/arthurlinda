# Arthur & Linda — Wedding Invitation + Admin Dashboard

A single-tenant wedding web app: a public invitation landing page for guests and a
private admin dashboard for the couple to manage every detail (RSVPs, guests,
budget, vendors, timeline tasks, and the public invitation copy itself).

Built with **Next.js 15 (App Router) + React 19 + Prisma + Tailwind v4 + shadcn/ui**.

## Single‑tenant model

One database = one admin user = one wedding. Enforced via `deploymentId = "default"`
unique constraints on `User` and `Wedding` (see `prisma/schema.prisma`). The admin
account is created from the CLI (there is no public sign‑up):

```bash
pnpm create-admin
```

## Architecture at a glance

```
src/
├── app/                          # Next.js App Router
│   ├── (wedding)/                # Public invitation at "/"
│   │   ├── layout.tsx
│   │   └── page.tsx              # serves Template 1 with live DB data
│   ├── wedding/[slug]/page.tsx   # Same invitation at "/wedding/<slug>"
│   │                             #   supports ?template=2 for a preview
│   ├── admin/                    # Protected admin area
│   │   ├── (dashboard)/          # Layout, overview, guests, rsvp,
│   │   │                         #   budget, timeline, settings
│   │   ├── login/
│   │   └── sign-up/              # Redirects to /admin/login
│   ├── api/                      # Route handlers (see below)
│   ├── layout.tsx                # Root layout + fonts + theme provider
│   └── globals.css
├── landing/                      # Public invitation UI
│   ├── wedding-landing.tsx       # Main template 1 component
│   ├── components/               # countdown, header, rsvp-form, reveal
│   ├── hooks/
│   └── templates/                # registry + template 1 + template 2
├── dashboard/                    # Admin dashboard UI
│   ├── components/               # layout, header, sidebar, auth
│   ├── data/sidebar-menus.tsx
│   └── pages/                    # One folder per dashboard page
│       ├── overview/
│       ├── guests/
│       ├── rsvp/
│       ├── budget-combined/      # Budget + expenses + invoices, tabbed
│       ├── timeline/
│       ├── settings/             # Shared settings form primitives
│       ├── settings-wedding/     # "My Wedding" tab (public invitation editor)
│       └── vendors/              # Reusable vendor-invoices sheet
├── lib/
│   ├── auth/                     # jose-based session + password hashing
│   ├── datetime/                 # Wall-clock ↔ UTC helpers (timezone aware)
│   ├── pdf/                      # Guest/RSVP PDF export
│   ├── wedding/
│   │   ├── bootstrap.ts          # Default wedding for first run
│   │   ├── currency-options.ts
│   │   ├── landing-content.ts    # LandingOverrides + defaults + resolver
│   │   ├── queries.ts            # Prisma → view-model helpers
│   │   └── singleton.ts          # deploymentId constant
│   ├── prisma.ts                 # Lazy Prisma client
│   └── utils.ts
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── shared/date-picker.tsx
│   └── theme-toggle-pill.tsx
├── hooks/                        # use-active-menu, use-header-search,
│                                 #   use-mobile
├── providers/theme-provider.tsx
├── types/wedding.ts              # Shared DTOs for the admin dashboard
└── middleware.ts                 # Protects /admin/*
```

## How dashboard settings flow to the landing

The "My Wedding" tab in `/admin/settings/account?tab=wedding` is the single
source of truth for everything on the invitation:

1. `SettingsWeddingPage` (`src/dashboard/pages/settings-wedding/index.tsx`)
   collects names, event date, venue, quote, gifts/bank, story slides, RSVP
   copy, hotel list, and the "When" schedule.
2. On save it `PATCH`es `/api/wedding` which validates with Zod and updates the
   `Wedding` row (+ replaces the `WeddingEvent` list in a transaction). Landing
   copy is stored as JSON in `Wedding.landingOverrides`.
3. The public pages (`/` and `/wedding/[slug]`) are rendered with
   `dynamic = "force-dynamic"`, so every request calls
   `getSingletonWeddingWithEvents()` and `serializeWeddingForPublic()`. The
   latter merges `landingOverrides` with `DEFAULT_LANDING_CONTENT` via
   `resolveLandingContent()`.
4. The resulting payload is handed to `Template1Landing` (or Template 2 via
   `?template=2`). No caching between admin and guest views.

## API routes

| Route                                | Purpose                                  |
|--------------------------------------|------------------------------------------|
| `POST   /api/auth/login`             | Admin sign-in (session cookie)           |
| `POST   /api/auth/logout`            |                                          |
| `POST   /api/auth/signup`            | First-run admin creation (CLI preferred) |
| `PATCH  /api/profile`                | Update admin profile                     |
| `POST   /api/profile/password`       | Change admin password                    |
| `PATCH  /api/wedding`                | Update wedding + schedule + landing copy |
| `POST   /api/wedding/story-image`    | Upload a story-slide image               |
| `GET/POST/PATCH/DELETE /api/guests`  | Guest CRUD                               |
| `GET/POST/PATCH/DELETE /api/rsvp`    | Public RSVP submissions + admin edit     |
| `GET/POST/PATCH/DELETE /api/timeline-tasks` | Timeline CRUD + reorder           |
| `GET   /api/export/guests/pdf`       | Printable guest list                     |
| `GET   /api/export/rsvp/pdf`         | Printable RSVP list                      |

## Getting started

```bash
pnpm install
pnpm prisma migrate dev --name init   # creates local SQLite dev.db
pnpm create-admin                     # interactive admin account creation
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the public invitation
and [http://localhost:3000/admin](http://localhost:3000/admin) for the
dashboard.

### Environment

See `.env.example`. The essentials:

- `DATABASE_URL` — SQLite by default (`file:./dev.db`), or Postgres/Neon in
  production.
- `AUTH_SECRET` — required; used by `jose` to sign session JWTs.
- `NEXT_PUBLIC_WEDDING_SLUG` — defaults to `arthur-linda`; must match the
  `Wedding.slug` used by `/wedding/<slug>`.

## Scripts

| Command               | What it does                               |
|-----------------------|--------------------------------------------|
| `pnpm dev`            | Next.js dev server                          |
| `pnpm build`          | `prisma generate` + production build       |
| `pnpm start`          | Run the production build                    |
| `pnpm lint`           | ESLint                                      |
| `pnpm create-admin`   | One-off admin bootstrap (see `scripts/`)   |

## License

MIT — see `LICENSE`.
