# RK Mines Diesel Ledger

Mobile-first daily diesel issue and purchase register for RK Mines, with vehicle master management and automatic running stock balances.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rk-mines-diesel-ledger/` — Vite web app with dashboard and vehicle master routes
- `artifacts/api-server/src/routes/vehicles.ts` — vehicle master CRUD and archive handlers
- `artifacts/api-server/src/routes/diesel.ts` — diesel issue/purchase records, running balances, and daily summary
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/vehicles.ts` and `lib/db/src/schema/diesel-records.ts` — database schema
- `supabase/schema.sql` — Supabase table and starter-data script
- `artifacts/rk-mines-diesel-ledger/src/index.css` — app theme tokens and responsive styles

## Architecture decisions

- Diesel records keep a running stock balance; each new entry uses the latest closing balance as its opening balance.
- Vehicle archive is a soft delete so old diesel records retain their vehicle reference.
- The web client uses generated OpenAPI hooks; server routes validate request and response payloads with generated Zod schemas.
- Calendar-only dates are normalized at the API boundary to avoid timezone shifts.

## Product

- Control-room dashboard for a selected date with opening, issued, purchased, and closing litres.
- Diesel movement form with vehicle dropdown, vehicle-name lookup, reading, operator, issuer, and edit/delete actions.
- Vehicle master page with search, add, edit, selection details, and archive.
- Responsive layout designed for phone use at the fuel desk and larger screens in the office.

## User preferences

- User plans to use Supabase for persistence and Vercel for deployment.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- API service must be restarted after backend route changes; web service can use Vite HMR for frontend changes.
- The connected Supabase REST API cannot create tables; run `supabase/schema.sql` in the Supabase SQL Editor before switching the API persistence layer.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
