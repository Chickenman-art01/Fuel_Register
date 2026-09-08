# Frontend Web Application (PWA)

Located in [`artifacts/Rajsthan_MM/`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/), this is the core client application: a mobile-first Progressive Web App built with **Vite**, **React 19**, **Tailwind CSS v4**, **Radix UI**, and **Supabase**.

---

## 1. Directory Structure

```
artifacts/Rajsthan_MM/
├── public/                              # Static & PWA Assets
│   ├── favicon.svg                      # Browser tab icon
│   ├── logo.png                         # Rajsthan M&M company badge
│   ├── manifest.webmanifest             # PWA installation manifest
│   ├── pwa-192.png / pwa-512.png        # Mobile home screen icons
│   ├── robots.txt                       # Search engine crawler instructions
│   └── sw.js                            # Service Worker for offline asset caching
├── src/                                 # Application Source Code
│   ├── components/                      # UI & Feature Components
│   │   ├── ui/                          # Design system primitives (buttons, dialogs, etc.)
│   │   ├── app-shell.tsx                # Master responsive layout, sidebar, sync bar
│   │   ├── auth-gate.tsx                # Biometric passkey & password authentication
│   │   ├── error-boundary.tsx           # React runtime error boundary
│   │   └── user-management.tsx          # User access management (Commander only)
│   ├── hooks/                           # Custom React hooks
│   │   ├── use-mobile.tsx               # Media query hook for mobile screen detection
│   │   └── use-toast.ts                 # Imperative toast notification state hook
│   ├── lib/                             # Core utilities and data adapters
│   │   ├── commander-users.ts           # Edge Function API client for commander user control
│   │   ├── offline-api.ts               # Offline-first data caching and mutation queue
│   │   ├── offline-store.ts             # IndexedDB wrapper for local persistence
│   │   ├── supabase.ts                  # Browser Supabase client instance
│   │   └── utils.ts                     # Tailwind class merge helper (`cn`)
│   ├── pages/                           # Application Views
│   │   ├── dashboard.tsx                # Main diesel entry and ledger view
│   │   ├── vehicles.tsx                 # Vehicle fleet master view
│   │   └── not-found.tsx                # 404 page
│   ├── App.tsx                          # Router and global providers
│   ├── index.css                        # Tailwind v4 theme variables and global styles
│   └── main.tsx                         # React 19 entry point and SW registration
├── components.json                      # shadcn/ui configuration
├── index.html                           # HTML entry document
├── package.json                         # Package dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
└── vite.config.ts                       # Vite build configuration
```

---

## 2. Configuration & Entry Files

| File | Purpose & Details |
|---|---|
| [`index.html`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/index.html) | Root HTML document. Contains meta viewport tags, fonts (Inter), and PWA manifest links. |
| [`vite.config.ts`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/vite.config.ts) | Vite configuration using `@vitejs/plugin-react` and `@tailwindcss/vite`. Sets build output to `dist/public`. |
| [`components.json`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/components.json) | shadcn/ui registry settings directing component generators to `src/components/ui`. |
| [`package.json`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/package.json) | Package manifest declaring dependencies: React 19, Lucide icons, TanStack Query, Radix UI, date-fns, wouter. |
| [`tsconfig.json`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/tsconfig.json) | Package TS settings with path alias `@/` mapping to `src/`. |

---

## 3. PWA & Static Assets (`public/`)

| File | Purpose & Details |
|---|---|
| [`manifest.webmanifest`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/public/manifest.webmanifest) | Web App Manifest defining standalone display mode, theme colors (`#263238`), and home screen icons. Enables "Add to Home Screen" installation on Android/iOS. |
| [`sw.js`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/public/sw.js) | Service Worker caching application shell assets (`CACHE_NAME = 'rajsthan-mm-ledger-v1'`). Intercepts network requests to serve assets when offline. |
| [`logo.png`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/public/logo.png) | Branding logo displayed in the top bar, sidebar, and favicon. |
| [`robots.txt`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/public/robots.txt) | Controls crawler indexing rules. |

---

## 4. Application Source Code (`src/`)

### Core Entry & Routing
- **[`main.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/main.tsx)**: Mounts React 19 root into `#root`, registers the Service Worker `/sw.js`, and wraps the tree with `QueryClientProvider`.
- **[`App.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/App.tsx)**: Configures lightweight client routing via `wouter`. Defines routes:
  - `/` & `/Fuelentry`: Navigates to `Dashboard` (main ledger).
  - `/vehicles`: Navigates to `Vehicles` (fleet management).
  - Wildcard: `NotFound` component.
  - Wraps routes inside `<AuthGate>` and `<AppShell>`.
- **[`index.css`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/index.css)**: Implements custom color tokens for CSS variables (sidebar, background, primary amber/gold tone, muted accents) and subtle textured background noise.

### Views / Pages (`src/pages/`)
- **[`dashboard.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/pages/dashboard.tsx)**:
  - The central operating screen for daily diesel management.
  - Displays summary statistics: **Opening Balance**, **Diesel Purchased**, **Diesel Issued**, and **Closing Balance**.
  - Date picker and quick day-switcher navigation.
  - Quick-action dialogs to record new diesel issues (selecting vehicle, meter reading, quantity, operator, issuer) or purchases.
  - Real-time stock alerts (warns if running tank balance drops critically low).
- **[`vehicles.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/pages/vehicles.tsx)**:
  - Fleet master directory for registering and tracking equipment/vehicles.
  - Shows vehicle number, friendly name, and active status.
  - Allows adding new vehicles, editing details, or soft-archiving decommissioned units.
- **[`not-found.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/pages/not-found.tsx)**:
  - Fallback screen for unknown URLs.

### Feature Components (`src/components/`)
- **[`app-shell.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/components/app-shell.tsx)**:
  - Master responsive layout with collapsible desktop sidebar and mobile header.
  - Live network connectivity monitor (`navigator.onLine`).
  - Offline sync status indicator displaying the count of pending transactions and a manual **"Sync now"** button.
- **[`auth-gate.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/components/auth-gate.tsx)**:
  - Complete authentication gate protecting the ledger.
  - Supports **WebAuthn Biometric Passkeys** (fingerprint / Face Unlock / Windows Hello).
  - Fallback email/password login and password reset requests via Supabase Auth.
  - Provides `useAppRole()` context ('commander' vs 'operator') to child components.
- **[`user-management.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/components/user-management.tsx)**:
  - Control panel visible to commanders to create, modify roles for, and delete desk operator accounts.
- **[`error-boundary.tsx`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/components/error-boundary.tsx)**:
  - React error boundary providing recovery options if an unexpected render exception occurs.

---

## 5. Offline Engine & State Management (`src/lib/`)

```
   User Submits Record
            |
    [Is Device Online?]
      /            \
    YES             NO
    /                \
POST to Supabase   1. Append to IndexedDB `queue`
or Edge Function   2. Optimistically update local cache
                   3. Emit 'offline-queue-changed' event
```

- **[`offline-store.ts`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/lib/offline-store.ts)**:
  - Implements an IndexedDB database named `rajsthan-mm-ledger`.
  - Object store `cache`: stores JSON representations of vehicle lists, daily records, and summaries keyed by path.
  - Object store `queue`: stores ordered, pending mutation requests (create, update, delete) created while offline.
- **[`offline-api.ts`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/lib/offline-api.ts)**:
  - Higher-level facade over network requests.
  - When online, fetches from Supabase / Edge Function and caches results into IndexedDB.
  - When offline, serves cached entries and queues mutations.
  - Listens for `online` events to automatically replay queued transactions in chronological order.
- **[`supabase.ts`](file:///workspaces/Rajsthan_M&M/artifacts/Rajsthan_MM/src/lib/supabase.ts)**:
  - Exports the client-side Supabase instance configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
