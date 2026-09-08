# Rajsthan M&M — Codebase Study Guide & Architecture

Welcome to the comprehensive architecture and codebase documentation for **Rajsthan M&M (Fuel & Diesel Ledger)**. This guide provides an in-depth, file-by-file and folder-by-folder explanation of the entire repository.

---

## 1. System Architecture Overview

The repository is organized as a modern TypeScript **monorepo** powered by **pnpm workspaces**. It delivers a high-reliability, mobile-first daily fuel/diesel register system featuring offline capabilities, biometric authentication, and dual-backend compatibility (Express API server or Supabase Edge Functions).

```
                      +------------------------------------------+
                      |         Web Client (PWA)                 |
                      |   (Vite + React 19 + Tailwind v4)        |
                      |   artifacts/Rajsthan_MM                  |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
            [Local Storage / IDB]   [React Query Hooks]   [Supabase Auth / DB]
             Offline Queue & Cache    (Generated SDK)       Passkey & Admin API
                    |                      |                      |
                    +----------------------+----------------------+
                                           |
                                  +--------v--------+
                                  |   HTTP API /    |
                                  |  Edge Function  |
                                  +--------+--------+
                                           |
                                  +--------v--------+
                                  |   PostgreSQL    |
                                  | (Drizzle / SQL) |
                                  +-----------------+
```

---

## 2. Directory Structure Map

```
/workspaces/Rajsthan_M&M/
├── artifacts/                           # Deployable applications & sandboxes
│   ├── api-server/                      # Express 5 REST API server (Node.js)
│   ├── mockup-sandbox/                  # Component prototyping sandbox
│   └── Rajsthan_MM/                     # Main production web application (PWA)
├── docs/                                # Study guides and codebase documentation
│   ├── README.md                        # Master index and architecture map (this file)
│   ├── root-and-config.md               # Root workspace files & configuration
│   ├── frontend-app.md                  # Web client (PWA, components, offline sync)
│   ├── backend-and-database.md          # Express API server, Drizzle ORM & Supabase
│   ├── api-spec-and-codegen.md          # OpenAPI spec, Zod validation & React Query SDK
│   └── tooling-and-sandbox.md           # Developer scripts and mockup sandbox
├── lib/                                 # Shared workspace libraries
│   ├── api-client-react/                # Generated TanStack React Query API client
│   ├── api-spec/                        # OpenAPI 3.1 contract and Orval codegen config
│   ├── api-zod/                         # Generated Zod runtime validation schemas
│   └── db/                              # Drizzle ORM schemas and database client
├── scripts/                             # Workspace automation scripts
├── supabase/                            # Supabase schema definitions & edge functions
│   ├── functions/api/                   # Deno-based Supabase Edge Function API
│   └── schema.sql                       # PostgreSQL DDL table setup & triggers
├── package.json                         # Root monorepo configuration
├── pnpm-workspace.yaml                  # pnpm monorepo package definitions
├── tsconfig.base.json                   # Shared TypeScript compiler options
└── vercel.json                          # Production deployment routing & build rules
```

---

## 3. Documentation Modules

Each section below links to a dedicated, detailed study guide:

1. **[Root & Workspace Configuration](file:///workspaces/Rajsthan_M&M/docs/root-and-config.md)**
   - Explains monorepo orchestration, package dependencies, compiler configurations, Vercel build pipelines, and environment variables.

2. **[Frontend Application Guide](file:///workspaces/Rajsthan_M&M/docs/frontend-app.md)**
   - Explains the PWA architecture, Service Worker caching, IndexedDB offline transaction queue, biometric WebAuthn passkey login, UI design system, dashboard metrics, and vehicle fleet management.

3. **[Backend & Database Architecture](file:///workspaces/Rajsthan_M&M/docs/backend-and-database.md)**
   - Explains the Express 5 API server, route controllers, Pino logging, Drizzle ORM relational models, running stock balance calculation, and Supabase Edge Functions.

4. **[API Specification & Code Generation](file:///workspaces/Rajsthan_M&M/docs/api-spec-and-codegen.md)**
   - Explains Contract-Driven Development via OpenAPI 3.1 (`openapi.yaml`), Orval automated code generation, Zod schemas, and custom fetch clients.

5. **[Tooling, Sandbox & Scripts](file:///workspaces/Rajsthan_M&M/docs/tooling-and-sandbox.md)**
   - Explains the isolated mockup preview environment, post-merge Git automation hooks, and workspace development workflows.

---

## 4. Key Workflows & Execution Commands

| Task | Command | Purpose |
|---|---|---|
| **Typecheck Everything** | `pnpm run typecheck` | Validates TypeScript across all libraries and applications |
| **Build Everything** | `pnpm run build` | Compiles API bundles, shared libraries, and client assets |
| **Run Frontend Dev** | `pnpm --filter @workspace/rajsthan-mm run dev` | Runs Vite dev server on port 5173 |
| **Run API Server Dev** | `pnpm --filter @workspace/api-server run dev` | Runs Express dev server on port 5000 |
| **Regenerate API SDK** | `pnpm --filter @workspace/api-spec run codegen` | Generates React Query hooks and Zod schemas from OpenAPI |
| **Deploy to Vercel** | `vercel --prod` | Deploys static build to production hosting |
