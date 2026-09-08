# Tooling, Sandbox & Developer Scripts

This document details the secondary packages and automation tools included in the repository: the **Mockup Sandbox** (`artifacts/mockup-sandbox/`) and the **Developer Scripts** (`scripts/`).

---

## 1. Mockup Sandbox (`artifacts/mockup-sandbox/`)

The Mockup Sandbox is an isolated Vite + React environment designed for prototyping and experimenting with UI layouts, cards, and data visualization without needing an active database connection or API server.

```
artifacts/mockup-sandbox/
├── src/
│   ├── components/                      # Prototyping components
│   ├── hooks/                           # Prototyping hooks
│   ├── lib/                             # Mock utilities
│   ├── App.tsx                          # Sandbox root component & canvas
│   ├── index.css                        # Styling variables
│   └── main.tsx                         # Sandbox entry point
├── components.json                      # shadcn/ui configuration
├── index.html                           # Sandbox HTML entry
├── mockupPreviewPlugin.ts               # Custom Vite plugin for mockup previews
├── package.json                         # Sandbox dependencies
├── tsconfig.json                        # TypeScript configuration
└── vite.config.ts                       # Vite build configuration
```

### Key Files

| File | Purpose |
|---|---|
| [`vite.config.ts`](file:///workspaces/Rajsthan_M&M/artifacts/mockup-sandbox/vite.config.ts) | Configures the preview server and registers `mockupPreviewPlugin`. |
| [`mockupPreviewPlugin.ts`](file:///workspaces/Rajsthan_M&M/artifacts/mockup-sandbox/mockupPreviewPlugin.ts) | Vite development plugin facilitating rapid hot-reloading and frame switching for previewing design mocks. |
| [`App.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/mockup-sandbox/src/App.tsx) | Canvas where new cards, ledger tables, or vehicle modals can be designed before integrating them into the main app. |

---

## 2. Developer Scripts (`scripts/`)

The [`scripts/`](file:///workspaces/Rajsthan_M&M/scripts/) folder contains automation hooks and maintenance utilities.

```
scripts/
├── src/
│   └── hello.ts                         # Basic TypeScript script template
├── package.json                         # Script package manifest
├── post-merge.sh                        # Automated Git post-merge hook
└── tsconfig.json                        # TypeScript settings for scripts
```

### Key Files

- **[`post-merge.sh`](file:///workspaces/Rajsthan_M&M/scripts/post-merge.sh)**:
  - Automates post-pull synchronization.
  - When you pull or merge new changes from Git, this hook runs `pnpm install` if `pnpm-lock.yaml` was modified, and triggers `pnpm --filter @workspace/api-spec run codegen` if `openapi.yaml` changed.
- **[`src/hello.ts`](file:///workspaces/Rajsthan_M&M/scripts/src/hello.ts)**:
  - Demonstrates executing standalone TypeScript scripts inside the monorepo context using ts-node/tsx.
