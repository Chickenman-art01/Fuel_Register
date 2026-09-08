# API Specification & Automated Code Generation

This project uses a **Contract-Driven Development** architecture. Rather than writing client fetch requests and validation schemas manually, the entire API contract is defined in an **OpenAPI 3.1** specification, and client code is automatically generated.

---

## 1. Architecture Flow

```
                      +-----------------------------+
                      |   lib/api-spec/openapi.yaml |
                      |    (Source of Truth)        |
                      +--------------+--------------+
                                     |
                             [Orval Codegen]
                             pnpm run codegen
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
        +-----------------------+         +-----------------------+
        |     lib/api-zod       |         |  lib/api-client-react |
        |  Generated Zod Types  |         | Generated React Query |
        |   & Runtime Schemas   |         |      Fetch Hooks      |
        +-----------------------+         +-----------------------+
```

---

## 2. Package Breakdown

### 1. [`lib/api-spec/`](file:///workspaces/Rajsthan_M&M/lib/api-spec/)
- **[`openapi.yaml`](file:///workspaces/Rajsthan_M&M/lib/api-spec/openapi.yaml)**:
  - The formal specification of the entire API.
  - Documents operations:
    - `health`: `/healthz` (health check)
    - `vehicles`: `/vehicles`, `/vehicles/{id}` (fleet operations)
    - `diesel`: `/diesel/records`, `/diesel/summary` (ledger queries, issues, purchases)
  - Defines data models: `Vehicle`, `CreateVehicleBody`, `UpdateVehicleBody`, `DieselRecord`, `CreateDieselRecordBody`, `DieselSummary`.
- **[`orval.config.ts`](file:///workspaces/Rajsthan_M&M/lib/api-spec/orval.config.ts)**:
  - Configures **Orval**, the OpenAPI compiler.
  - Specifies two generation targets:
    1. **Zod schemas**: Emits validation models into `lib/api-zod/src/generated/`.
    2. **React Query hooks**: Emits `@tanstack/react-query` hooks into `lib/api-client-react/src/generated/` using a custom fetcher.

### 2. [`lib/api-zod/`](file:///workspaces/Rajsthan_M&M/lib/api-zod/)
- Contains generated TypeScript types and **Zod** validation schemas derived from the OpenAPI spec.
- Exports schemas like `createDieselRecordBodySchema`, `vehicleSchema`, etc.
- Used across the frontend and backend to guarantee runtime type safety when receiving API requests.

### 3. [`lib/api-client-react/`](file:///workspaces/Rajsthan_M&M/lib/api-client-react/)
- Contains generated **React Query** hooks and types (e.g. `useGetVehicles`, `useCreateDieselRecord`, `useGetDieselSummary`).
- **[`src/custom-fetch.ts`](file:///workspaces/Rajsthan_M&M/lib/api-client-react/src/custom-fetch.ts)**:
  - Custom HTTP client wrapping native `fetch`.
  - Automatically injects bearer authorization tokens from Supabase Auth into outgoing request headers.
  - Handles baseURL resolution and standardized error response unwrapping.

---

## 3. How to Update the API

Whenever you need to add a new endpoint, query parameter, or database field:

1. **Edit the Contract**: Modify [`lib/api-spec/openapi.yaml`](file:///workspaces/Rajsthan_M&M/lib/api-spec/openapi.yaml).
2. **Run Codegen**:
   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```
3. **Check Types**:
   ```bash
   pnpm run typecheck
   ```
4. Both your frontend React Query hooks and runtime Zod validators are now immediately synchronized with zero manual boilerplate!
