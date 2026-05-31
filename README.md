# ResiPark System

Comprehensive documentation for ResiPark System — a parking management application for residential complexes. This README covers architecture, setup, environment variables, database and Prisma usage, API endpoints, UI flows, operational scripts, troubleshooting, and recent fixes.

---

## Table of Contents
- Project overview
- Architecture & tech stack
- Quick start (install & run)
- Environment variables
- Database & Prisma
- API reference (important endpoints)
- UI pages & user flows
- Scripts & operational procedures
- Troubleshooting & common errors
- Testing & QA checklist
- Deployment notes
- Changelog (recent important fixes)
- Next steps / maintenance

---

## Project overview

- Name: ResiPark System
- Purpose: Manage vehicle entry/exit, guest registration, parking slots and areas, violations (overtime fines), and role-based dashboards for admin, pengelola, satpam, and warga.
- Repo root: contains Next.js app (App Router) using TypeScript, Prisma for DB access, and helper scripts under `scripts/`.

## Architecture & tech stack

- Framework: Next.js (App Router) with React + TypeScript
- ORM: Prisma (PostgreSQL)
- Database hosting: Supabase (DATABASE_URL pooler and DIRECT_URL direct connection)
- UI: Tailwind CSS + shadcn/ui components
- Linting/Formatting: ESLint (config at `eslint.config.mjs`), project scripts in `package.json`

## Quick start (install & run)

1. Clone repository and install dependencies:

```bash
git clone <repo-url>
cd resipark-system
npm install
```

2. Setup environment variables (see next section).

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run development server:

```bash
npm run dev
```

Notes: If your environment uses `pnpm` or `yarn`, adapt commands accordingly.

## Environment variables

Required environment variables (minimum):

- `DATABASE_URL`: Postgres connection string (pooler/pgbouncer). Used by runtime.
- `DIRECT_URL`: Direct Postgres connection string (no pooler). Use for one-off/maintenance scripts.
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: If NextAuth is used.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: For any Supabase client usage.

Check `src/lib/env.ts` for additional variables parsed by the app.

Operational notes:
- Use `DATABASE_URL` for the running app (supports pooling).
- Use `DIRECT_URL` when running admin scripts (e.g., reconciliation) that require a direct connection or when pooler rejects the connection.

## Database & Prisma

- Prisma schema: `prisma/schema.prisma` (models include `Vehicle`, `ParkingSlot`, `ParkingArea`, `AccessRecord`, `GuestAccess`, `Violation`, `ViolationType`, `House`, `User`).
- Migrations:

```bash
npx prisma migrate dev --name <migration-name>
# Production:
npx prisma migrate deploy
```

- Generate client:

```bash
npx prisma generate
```

- Seed data:
  - Seeds located in `prisma/seed.ts` and `prisma/seed-production.ts`.
  - Run seed script as documented/with node depending on your environment.

Notes about Supabase & pooler:
- `DATABASE_URL` may point to Supabase pooler (pgbouncer). Some tools (ts-node / scripts) may fail to connect to pooler; use `DIRECT_URL` for those scripts.

## API reference (important endpoints)

Paths are under `src/app/api/` (App Router). Below are the most important endpoints with examples and behavior notes.

### POST /api/guests — Register a guest (satpam)

- Purpose: Create guest access record, assign parking slot, update area counters atomically.
- Required JSON body:

```json
{
  "platNumber": "B1234XYZ",
  "hostHouseNumber": "A-12",
  "purpose": "Tamu Rapat",
  "maxDurationHours": 8
}
```

- Responses:
  - 201: success (returns `accessRecord`, `guestAccess`, assigned `slot`)
  - 400: `INVALID_HOURS` if hours invalid
  - 409: `PARKING_FULL` if no slot available

Behavior notes:
- `maxDurationHours` is required to prevent entries without a set duration.
- The API selects an available slot with `getAvailableSlotByType` or falls back to `getAvailableSlot`. If no slot found, registration fails (prevents parking_area counter drift).
- If a vehicle already has an active guest session, this endpoint updates the existing guest access (no duplicate active sessions).

### PUT /api/guests/:id/extend — Extend / change guest duration

- Body: `{ "maxDurationHours": <integer> }`.
- Accepts negative integers to set `expiredAt` in the past for testing overtime fines (negative interpreted as absolute expired duration to force immediate overtime).
- If a PENDING violation exists, the system synchronizes the PENDING violation's fine to reflect the latest duration.

### POST /api/access/entry — Vehicle entry

- Behavior:
  - For vehicles with `category === 'TAMU'`, this endpoint now rejects entry and returns error `GUEST_DURATION_REQUIRED` with `isGuest: true` — satpam must register guest first (via `POST /api/guests`) to set duration.
  - For other vehicles, entry is processed; slot and counters are updated.

### POST /api/access/exit — Vehicle exit

- Behavior:
  - Calculates overtime fines via `calculateOvertimeFine(entryAt, exitAt, maxDurationHours)`.
  - If PENDING violation present, the API recalculates and updates the PENDING violation to match current duration before returning `PAYMENT_REQUIRED`.
  - Vehicle plate preservation: previously a guest's plate was anonymized at exit; now `platNumber` is kept for reuse.

### Error codes summary

- `GUEST_DURATION_REQUIRED`: TAMU must be registered with max duration before entry.
- `PARKING_FULL`: no available slots.
- `PAYMENT_REQUIRED`: overtime violation; includes `violation` detail.
- `INVALID_VIOLATION_TYPE`: missing violation type seed.
- `VEHICLE_BLACKLISTED`: vehicle blocked.

## UI pages & user flows

- Satpam:
  - Entry page: `src/app/dashboard/satpam/entry/page.tsx` — scan/enter plate, warns if `isGuest` and links to guest registration.
  - Guests page: `src/app/dashboard/satpam/guests/page.tsx` — register guest (requires duration), edit duration (supports negative for test), list active guests.
- Admin / Pengelola / Warga: role-specific pages under `src/app/dashboard/*`.

Flow highlights:
- Guest lifecycle: register (with `maxDurationHours`) → assign slot → entry recorded → extend (optional) → exit → overtime violation handled if expired.

## Scripts & operational procedures

### Reconcile parking counters

- Script: `scripts/reconcile-parking-counters.ts`
- Purpose: compute actual `parking_slots` occupancy and reconcile `parking_areas.counter` to actual values.
- Dry-run (default): prints differences.
- Apply: `--apply` flag writes corrected counters.

Usage example (dry-run):

```bash
npx ts-node --esm scripts/reconcile-parking-counters.ts
```

Apply (use `DIRECT_URL` and backup first):

```bash
# backup first
pg_dump "<DIRECT_URL>" -Fc -f resipark-backup-$(date +%F).dump

# run apply
DIRECT_URL="<direct_connection_string>" npx ts-node --esm scripts/reconcile-parking-counters.ts --apply
```

Operational notes:
- The script prefers `DIRECT_URL` and creates its own `PrismaClient` (avoids importing `src/lib/db` to prevent ESM/CJS cycles).
- If you cannot connect from local machine to pooler host (PrismaClientInitializationError), run SQL in Supabase SQL editor or run script in environment with DB access.

## Troubleshooting & common errors

- `PrismaClientInitializationError: Can't reach database server at ...pooler...`:
  - Use `DIRECT_URL` or run script in environment permitted to access pooler. Backup DB before apply.
- `INVALID_VIOLATION_TYPE`:
  - Ensure `ViolationType` data seeded. Check `prisma/seed.ts` or add via SQL.
- ESM/CJS import cycles running scripts:
  - Run scripts that construct their own `PrismaClient` and avoid importing app modules.

## Testing & QA checklist

1. Register guest with `maxDurationHours` (8) → confirm slot assignment and `parking_areas.counter` increment.
2. Attempt generic entry with same plate (should receive `GUEST_DURATION_REQUIRED`).
3. Extend guest duration to negative value (e.g., -1) → expiredAt in past.
4. Exit vehicle → API returns `PAYMENT_REQUIRED` with recalculated fine.
5. Confirm plate preserved after exit and can be re-used for new registration.

## Deployment notes

- Build & start:

```bash
npm run build
npm run start
```

- Run migrations in CI/CD:

```bash
npx prisma migrate deploy
```

- Use `DATABASE_URL` for runtime (pooler enabled) and `DIRECT_URL` for operations or scripts that require direct DB connections.

## Changelog — Recent Important Fixes

- Enforced slot assignment before incrementing `parking_area` counters (prevents counter drift).
- Guest registration requires `maxDurationHours` and updates existing active guest sessions instead of creating duplicates.
- Extend guest duration supports negative values to simulate/trigger overtime fines; PENDING violations are synchronized when duration edits occur.
- Exit flow no longer anonymizes guest `platNumber`; plate is preserved for reuse.
- Entry API blocks `TAMU` category vehicles until registered via `/api/guests` (error `GUEST_DURATION_REQUIRED`).
- `scripts/reconcile-parking-counters.ts` updated to prefer `DIRECT_URL` and instantiate local PrismaClient to avoid ESM/CJS cycles.

## Next steps & maintenance

- Run end-to-end tests in a staging environment covering guest lifecycle and violation/payment flows.
- Ensure `ViolationType` seeds are included in production seed process.
- Consider adding automated integration tests for DB reconciliation script (dry-run verification).

---

If you want, I can now:

- Add `curl` examples for each endpoint into this README.
- Create a separate `docs/` folder with more detailed API docs and example requests/responses.
- Provide SQL snippet to seed `ViolationType` entries if missing.

Reply with which of the above you'd like next and I'll add it.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# resipark-system