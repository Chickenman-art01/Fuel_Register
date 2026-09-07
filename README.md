# RK Mines Diesel Ledger

Mobile-first daily diesel issue/purchase register for RK Mines, with vehicle
master management and automatic running stock balances.

This project was built on Replit as a pnpm workspace: an Express API server,
a Vite + React web client, and a shared Postgres/Drizzle data layer. It's
portable — the steps below get it running locally and deployed anywhere that
runs Node.js and Postgres.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, built with esbuild to a single bundle
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (generates React Query hooks + Zod schemas from `lib/api-spec/openapi.yaml`)
- Frontend: Vite + React 19 + Tailwind + Radix UI

## Project layout

```
artifacts/rk-mines-diesel-ledger/   Vite web app (dashboard + vehicle master)
artifacts/api-server/               Express API (routes, build script)
artifacts/mockup-sandbox/           Design sandbox, not required to run the app
lib/db/                             Drizzle schema + DB client
lib/api-spec/                       openapi.yaml — source of truth for the API
lib/api-zod/                        Generated Zod schemas (from codegen)
lib/api-client-react/               Generated React Query hooks (from codegen)
supabase/schema.sql                 Table + starter-data script for Supabase
```

## 1. Prerequisites

- Node.js 24+
- pnpm (`corepack enable` or `npm i -g pnpm`)
- A PostgreSQL database (local Postgres, or a hosted one like Supabase/Neon/RDS)

## 2. Install dependencies

```bash
pnpm install
```

## 3. Configure environment variables

The API server and DB layer read `DATABASE_URL` from the environment:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/dbname"
export PORT=5000
```

The web client (Vite) requires `PORT` and `BASE_PATH` when you run it directly:

```bash
export PORT=5173
export BASE_PATH=/
```

Put these in a `.env` file per package (or export them in your shell) —
none is committed, since the original Replit environment injected them.

## 4. Create the database schema

Two options:

- **Drizzle push** (any Postgres): `pnpm --filter @workspace/db run push`
- **Supabase**: open the Supabase SQL Editor and run `supabase/schema.sql`
  directly — the connected Supabase REST API can't create tables on its own.

## 5. Run it locally

In one terminal, start the API:

```bash
pnpm --filter @workspace/api-server run dev
# listens on PORT (defaults expected: 5000)
```

In another terminal, start the web client:

```bash
pnpm --filter @workspace/rk-mines-diesel-ledger run dev
```

The web client makes relative `/api/...` calls, so in production it expects
to be served from the same origin as the API (or you configure a base URL /
reverse proxy in front of both — see below).

Other useful commands:

```bash
pnpm run typecheck                                       # typecheck everything
pnpm run build                                            # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen              # regenerate API hooks + Zod schemas after editing openapi.yaml
```

## 6. Deploying

The app is two deployable pieces — a Node API and a static frontend build —
plus a Postgres database. Pick a target and wire them up:

### Database: Supabase (or any Postgres)
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor to create tables and starter data.
3. Copy the connection string into `DATABASE_URL` for the API deployment.

### API server
Build it to a single bundle and run it with Node:

```bash
pnpm --filter @workspace/api-server run build   # -> artifacts/api-server/dist/index.mjs
node artifacts/api-server/dist/index.mjs
```
Deploy this anywhere that runs a long-lived Node process (Render, Railway,
Fly.io, a VM, etc.), with `DATABASE_URL` and `PORT` set as environment
variables.

### Web client on Vercel
The web app is a static Vite build, which Vercel serves well:
1. Import the repo into Vercel and keep the **root directory** set to the
  repository root. The included `vercel.json` builds the frontend workspace
  and serves `artifacts/rk-mines-diesel-ledger/dist/public`.
2. Deploy the API separately as a Node service, with `DATABASE_URL` and
  `PORT=5000` configured in that service.
3. Add the Vercel environment variable `VITE_API_URL` with the public API URL,
  for example `https://api.example.com`. The frontend uses this value for all
  generated API requests.
4. Add `DATABASE_URL` only to the API service, never to the Vercel frontend.

### Supabase-only backend
The frontend can use Supabase Auth and the Edge Function in
`supabase/functions/api` instead of the Express service:

```bash
supabase login
supabase functions deploy api --project-ref niusvljqjdypixqftods
```

The function validates Supabase Auth sessions and keeps the existing generated
API paths (`/vehicles`, `/diesel/summary`, and `/diesel/records`). Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. The anon key is
intended for the browser; never put `DATABASE_URL` or a service-role key in a
`VITE_` variable.

After deploying the function, run the RLS statements in `supabase/schema.sql`
so direct anonymous table access is disabled. Create the first user through the
app's sign-up screen or Supabase Authentication.

### Notes / gotchas carried over from the original build
- Diesel records keep a running stock balance; each new entry uses the
  latest closing balance as its opening balance.
- Vehicle archive is a soft delete, so old diesel records keep their vehicle
  reference.
- Calendar-only dates are normalized at the API boundary to avoid timezone
  shifts.
- Re-run API codegen (`pnpm --filter @workspace/api-spec run codegen`) any
  time `lib/api-spec/openapi.yaml` changes.
- `artifacts/*/dist` and `*.tsbuildinfo` are build output — not included in
  this zip, and regenerated by `pnpm run build`.
