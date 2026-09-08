# Root Directory & Workspace Configuration

This document explains every file located in the root directory of the project, covering its purpose, configuration details, and role in monorepo management, build pipelines, and deployment.

---

## File Summary Table

| File | Purpose | Key Details |
|---|---|---|
| [`package.json`](file:///workspaces/Rajsthan_M&M/package.json) | Monorepo root manifest | Defines root scripts (`build`, `typecheck`), shared devDependencies (Prettier, TS 5.9). |
| [`pnpm-workspace.yaml`](file:///workspaces/Rajsthan_M&M/pnpm-workspace.yaml) | pnpm workspaces configuration | Defines workspace packages in `artifacts/*`, `lib/*`, and `scripts`. Catalogs shared dependency versions. |
| [`pnpm-lock.yaml`](file:///workspaces/Rajsthan_M&M/pnpm-lock.yaml) | Dependency lockfile | Locks exact versions and transitive dependency trees across all monorepo packages. |
| [`tsconfig.base.json`](file:///workspaces/Rajsthan_M&M/tsconfig.base.json) | Base TypeScript configuration | Shared compiler flags: `ES2022` target, strict type checking, composite projects, module resolution. |
| [`tsconfig.json`](file:///workspaces/Rajsthan_M&M/tsconfig.json) | Root TypeScript project reference | Coordinates project references for `tsc --build` across all packages. |
| [`vercel.json`](file:///workspaces/Rajsthan_M&M/vercel.json) | Vercel deployment configuration | Specifies the build command, output directory (`dist/public`), and SPA rewrite rules. |
| [`.env`](file:///workspaces/Rajsthan_M&M/.env) | Local environment variables | Secrets and configuration (Postgres URL, Supabase URL & keys, server ports). |
| [`.env.example`](file:///workspaces/Rajsthan_M&M/.env.example) | Template for environment variables | Sanitized reference showing necessary keys for new developers or deployments. |
| [`.gitignore`](file:///workspaces/Rajsthan_M&M/.gitignore) | Git ignore specification | Prevents build artifacts (`dist/`, `*.tsbuildinfo`), dependencies (`node_modules`), and secrets (`.env*`) from being committed. |
| [`README.md`](file:///workspaces/Rajsthan_M&M/README.md) | Project introduction & local setup guide | Explains stack, prerequisites, database configuration, and running the app. |
| [`replit.md`](file:///workspaces/Rajsthan_M&M/replit.md) | Platform & operations manual | Commands for running dev servers, typechecks, builds, and codegen. |

---

## In-Depth File Details

### 1. `package.json`
- **Role**: Root orchestration manifest.
- **Private**: Set to `true` to avoid accidental publishing of the root monorepo container.
- **Key Scripts**:
  - `preinstall`: Guards against accidental usage of npm or yarn, enforcing `pnpm`.
  - `typecheck:libs`: Runs `tsc --build` to compile shared libraries in `lib/`.
  - `typecheck`: Runs `typecheck:libs` followed by recursive type checks across `artifacts/**` and `scripts`.
  - `build`: Runs type check and then builds all packages in topological order.

### 2. `pnpm-workspace.yaml`
- **Role**: Declares the workspace packages that make up the repository:
  - `artifacts/*`: Deployable applications (`Rajsthan_MM`, `api-server`, `mockup-sandbox`).
  - `lib/*`: Shared libraries (`db`, `api-spec`, `api-zod`, `api-client-react`).
  - `scripts`: Automation tools.
- **Catalog Feature**: Uses pnpm catalogs to centrally manage version numbers for React, Tailwind, TanStack Query, Radix UI, Vite, etc., guaranteeing consistent versions across all packages.

### 3. `tsconfig.base.json` & `tsconfig.json`
- **`tsconfig.base.json`**:
  - Sets strict compiler settings: `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`.
  - Uses `"composite": true` and `"declaration": true` to support TypeScript project references and incremental builds (`.tsbuildinfo`).
  - Emits modern JavaScript (`"target": "ES2022"`, `"module": "ESNext"`).
- **`tsconfig.json`**:
  - Points to `references` for each workspace package (`lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`).

### 4. `vercel.json`
- **Role**: Specifies how Vercel builds and hosts the project.
  ```json
  {
    "installCommand": "pnpm install --frozen-lockfile",
    "buildCommand": "pnpm --filter @workspace/rajsthan-mm build",
    "outputDirectory": "artifacts/Rajsthan_MM/dist/public",
    "rewrites": [
      { "source": "/((?!api/).*)", "destination": "/index.html" }
    ]
  }
  ```
- **SPA Rewrites**: Ensures all non-API paths are routed to `/index.html`, allowing client-side routing (`wouter`) to handle deep links.

### 5. `.env` & `.env.example`
- **`DATABASE_URL`**: Postgres connection string used by Drizzle ORM and migrations.
- **`VITE_SUPABASE_URL`**: Supabase project endpoint used by the browser client.
- **`VITE_SUPABASE_ANON_KEY`**: Public Supabase anonymous API key for client-side queries.
- **`SUPABASE_SERVICE_ROLE_KEY`**: Privileged key used by Edge Functions for user administration.
