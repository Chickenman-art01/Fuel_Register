# Backend Architecture & Database

This document covers the backend architecture of the project: the **Express 5 API Server** (`artifacts/api-server/`), the shared **Drizzle ORM Database Layer** (`lib/db/`), and the **Supabase Database & Edge Functions** (`supabase/`).

---

## 1. Express API Server (`artifacts/api-server/`)

The API server provides a standalone Node.js REST API that can be deployed on any virtual machine, Docker container, or cloud host.

```
artifacts/api-server/
├── src/
│   ├── lib/
│   │   └── logger.ts                    # Structured logging via Pino
│   ├── routes/
│   │   ├── diesel.ts                    # Diesel issue, purchase & running balance routes
│   │   ├── health.ts                    # Server health check endpoint (/healthz)
│   │   ├── index.ts                     # Express router aggregator
│   │   └── vehicles.ts                  # Vehicle fleet CRUD routes
│   ├── app.ts                           # Express app initialization & middleware configuration
│   └── index.ts                         # HTTP server listen entry point
├── build.mjs                            # esbuild bundle script
├── package.json                         # Server dependencies & scripts
└── tsconfig.json                        # TypeScript build settings
```

### Key Components

| File | Role & Details |
|---|---|
| [`index.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/index.ts) | Reads `PORT` (defaults to 5000) from environment and binds the HTTP server. |
| [`app.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/app.ts) | Instantiates Express 5, configures `pino-http` request logging, enables CORS, parses incoming JSON payloads, and mounts `/api` routes. |
| [`build.mjs`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/build.mjs) | Uses `esbuild` to compile and bundle the TypeScript server into a high-performance single-file artifact (`dist/index.mjs`). |
| [`logger.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/lib/logger.ts) | Sets up Pino structured JSON logging with custom serializers to prevent logging sensitive payload data. |

### Routes (`src/routes/`)

- **[`health.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/routes/health.ts)**:
  - `GET /healthz`: Returns `{ status: "ok" }` for container probes and uptime monitors.
- **[`vehicles.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/routes/vehicles.ts)**:
  - `GET /vehicles`: Fetches list of active fleet vehicles.
  - `POST /vehicles`: Creates a new vehicle record.
  - `PATCH /vehicles/:id`: Updates an existing vehicle's identifier or name.
  - `DELETE /vehicles/:id`: Soft-archives a vehicle (`active = false`).
- **[`diesel.ts`](file:///workspaces/Rajsthan_M&M/artifacts/api-server/src/routes/diesel.ts)**:
  - `GET /diesel/records?date=YYYY-MM-DD`: Fetches all entries logged for a specific calendar date.
  - `GET /diesel/summary?date=YYYY-MM-DD`: Calculates daily opening balance, total diesel issued, total diesel purchased, and closing tank stock.
  - `POST /diesel/records`: Inserts an issue or purchase record and recalculates subsequent balances.
  - `PATCH /diesel/records/:id`: Modifies a record and re-runs balance progression.
  - `DELETE /diesel/records/:id`: Deletes a record and adjusts running stock levels.

---

## 2. Shared Database Layer (`lib/db/`)

The [`lib/db/`](file:///workspaces/Rajsthan_M&M/lib/db/) workspace package defines the Postgres database schema, migrations, and Drizzle ORM client shared across workspace packages.

### Database Connection (`src/index.ts`)
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### Schema Definitions (`src/schema/`)

- **[`vehicles.ts`](file:///workspaces/Rajsthan_M&M/lib/db/src/schema/vehicles.ts)**:
  - Table: `vehicles`
  - Columns: `id` (serial primary key), `vehicle_no` (text, unique), `vehicle_name` (text), `active` (boolean, default true), `created_at` (timestamp).
  - Uses `drizzle-zod` to export `insertVehicleSchema` and `selectVehicleSchema`.
- **[`diesel-records.ts`](file:///workspaces/Rajsthan_M&M/lib/db/src/schema/diesel-records.ts)**:
  - Table: `diesel_records`
  - Columns: `id` (serial primary key), `date` (date), `vehicle_id` (foreign key to `vehicles.id`), `reading` (numeric, vehicle odometer/meter reading), `diesel_issued` (numeric liters), `diesel_purchased` (numeric liters), `opening_balance` (numeric liters), `closing_balance` (numeric liters), `operator` (text), `issuer` (text), `created_at` (timestamp).
- **[`drizzle.config.ts`](file:///workspaces/Rajsthan_M&M/lib/db/drizzle.config.ts)**:
  - Configures Drizzle Kit for database migrations, pointing to `./src/schema` and using the Postgres dialect.

---

## 3. Supabase Integration (`supabase/`)

The repository supports direct deployment to Supabase for managed PostgreSQL, Auth, and Serverless Edge Functions.

### Database Definition: [`supabase/schema.sql`](file:///workspaces/Rajsthan_M&M/supabase/schema.sql)
- Creates the production tables:
  1. `vehicles`: Fleet vehicles master table.
  2. `staff_members`: Authorized diesel operators and issuers.
  3. `diesel_records`: Transaction ledger tracking running balances and vehicle issues.
- Includes sample seed data for vehicles and staff members.

### Edge Function API: [`supabase/functions/api/index.ts`](file:///workspaces/Rajsthan_M&M/supabase/functions/api/index.ts)
- A complete, self-contained Deno edge function that replaces or complements the Express API server in serverless environments.
- **Features**:
  - Validates Supabase JWT authorization tokens via `authClient.auth.getUser(token)`.
  - Enforces Role-Based Access Control (RBAC): `commander` accounts can manage vehicles and users; `operator` accounts have entry access.
  - Implements running stock balance calculations (`recalculateBalances()`).
  - Provides commander user endpoints (`listUsers`, `createUser`, `updateUser`, `deleteUser`) via the Supabase Service Role client.
