# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build (`vite build`)
- `npm run lint` — run ESLint over the whole repo (`eslint .`)
- `npx eslint <file>` — lint a single file (there is no per-test-file workflow; this is the standard verification step after any edit)
- `npm run preview` — preview the production build locally
- `npm run homag:import` — run `scripts/homag-import/run.js` (data import script, outside the Vite app)
- `npm run pecas:build-catalog` — run `scripts/parts-catalog/build-catalog.js`, which regenerates the static parts catalog JSON under `public/pecas-data/` consumed by `useCatalogParts`

There is no test suite in this repo (no test runner configured).

Path alias: `@/` maps to `./src` (configured in both `vite.config.js` and `jsconfig.json`).

The app is also packaged as an Android app via Capacitor (`android/`, `capacitor.config.json`) — most work happens purely in `src/` and only needs the web build.

## Architecture

React 19 + Vite + Tailwind + shadcn/ui, Firebase v11 (Firestore + Auth + Storage). Dark zinc/green themed UI. Portuguese-language codebase: UI strings, many identifiers, and code comments are in Portuguese (mixed with English).

### Feature-folder structure

`src/features/<domain>/` holds one folder per business domain (e.g. `clients`, `equipments`, `orders`, `budgets`, `partsBudgets`, `warehouseEquipment`, `publicShop`, `finances`, `inspections`, `protocols`, `workdays`, etc.). Each typically follows a `Manage<Domain>.jsx` (list/table view) + `components/Add<Domain>.jsx` + `components/Edit<Domain>.jsx` + `components/<Domain>Detail.jsx` convention. `src/pages/` holds top-level route pages (auth, dashboard, initial landing) that aren't tied to one feature domain.

### Global Context pattern (important — read before touching data fetching)

Several domains that are read from many places share a single **lazy, real-time Context** instead of each component doing its own Firestore read: `src/context/ClientsContext.jsx`, `EquipmentsContext.jsx`, `UsersContext.jsx`, `CategoriesContext.jsx`, `OrcamentosContext.jsx`.

Each exposes an `ensureX()` async function and a `useX()` hook. The pattern:
- The `onSnapshot` listener on the whole collection only starts on the **first** call to `ensureX()` (lazy — avoids paying for a listener in sessions that never touch that domain).
- `ensureX()` returns already-loaded data instantly on subsequent calls; the first call returns a promise that resolves once a **server-confirmed** snapshot arrives (`!snapshot.metadata.fromCache`), with a 4-second `setTimeout` fallback for offline safety. This guard exists because resolving on a `fromCache` snapshot can hand back a stale/partial list (e.g. if some earlier code did a `getDoc` on a single document from the same collection, priming Firestore's local cache with just that one doc).
- `refreshX()` is kept only as a no-op-ish compat alias (`() => ensureX()`) for older call sites — real-time data doesn't need manual refresh.
- `getXById(id)` reads from an in-memory `Map` kept alongside the array state.
- Optimistic cache-mutation helpers (`addXToCache`, `updateXInCache`, `removeXInCache`) exist for instant UI feedback but aren't strictly required since `onSnapshot` will reconcile automatically.

When a component needs the full list of clients/equipment/users/categories/orçamentos, prefer `ensureX()`/`useX()` over a fresh `getDocs`/`onSnapshot` call — this is the established way to avoid redundant full-collection reads. `ClientsContext` and `OrcamentosContext` also filter out soft-deleted docs (see below); `EquipmentsContext` and `UsersContext` do not (those collections don't use soft-delete).

For **large** collections that are deliberately NOT fully cached client-side (paginated instead), `src/utils/firestorePage.js` provides shared cursor-based (`limit` + `startAfter`) pagination — used by pages like `ManageInspection`, `ManageOnlineQuotes`, `ManageBudgets`, `ManageRecycleBin`, `ManageWarehouse`, `ManagePartsBudgets`, `ManageProtocols`, `ManageOrders`, `ManageFormulariosTecnicos`, `ManageDisassembledParts`. Don't replace these with a plain `onSnapshot(collection(...))` — that would defeat the point of the pagination.

`src/utils/sessionCache.js` is a stopgap TTL cache used by a couple of files reading large collections that don't have a dedicated Context yet (e.g. `ManageReportsLibrary.jsx`, `ManageAlerts.jsx` for "relatorios"/"ordens").

### Soft delete

Some collections use a soft-delete convention: setting an `eliminadoEm` timestamp field instead of `deleteDoc`. `clientes`, `ordens`, `inspections`, and `relatorios` follow this pattern; `equipamentos`, `orcamentos`, and most other collections use hard deletes. `src/features/recycle/ManageRecycleBin.jsx` is the shared recycle-bin UI across the soft-deletable collections. Check the relevant Context/Manage file before assuming a collection is soft- vs. hard-delete.

### Auth & roles

`src/hooks/useAuth.js` gates access two ways: (1) an email allowlist stored in the `config/authorizedEmails` Firestore doc — unauthorized emails are force-signed-out; (2) a `users/{uid}` doc with a `role` field. `src/config/roles.js` defines the role set (`admin`, `gestor`, `tecnico_interno`, `tecnico_externo`, `client`). In practice only two routes are role-gated to `admin` today (`manage-users`, `parts-export`, see `RoleRoute` usage in `src/App.jsx`) — everything else just requires being authenticated and on the allowlist.

`firestore.rules` (drafted, not yet deployed/verified against what's actually live — Firestore rules were previously unversioned in this repo) documents collection-by-collection access decisions and known edge cases (self role-escalation risk on `users/{uid}` writes, the public-shop-token verification flow, etc.) in its comments.

### Public shop

`src/features/publicShop/` and `src/features/shopAccess/` implement a public, unauthenticated storefront — separate from the internal admin app. It does not use Firebase Auth (no anonymous sign-in); access is controlled by a token stored in `localStorage` and looked up in the `shop_access_tokens` collection. Parts data comes from a **static JSON catalog** under `public/pecas-data/` (built by `npm run pecas:build-catalog`) via `src/hooks/useCatalogParts.js`, not from a live Firestore read of the `pecas` collection — `pecas` is legacy/internal only.

### Button color convention (recurring bug class — check when adding shadcn outline buttons)

The app never applies a global `.dark` class to `<html>`, so shadcn's `bg-background` CSS variable (used internally by `Button variant="outline"`) resolves to **white** per `src/styles/index.css`'s `:root` block. Any `variant="outline"` button needs an explicit **base** (non-`hover:`-prefixed) `bg-*` Tailwind class in its `className` — e.g. `bg-zinc-800 hover:bg-zinc-700` — or it renders as a white button with unreadable text until hovered. A className with only `hover:bg-*` and no base `bg-*` is broken. When adding a new outline button, check sibling buttons in the same file for the locally-established base color first.

### PDF generation

Each domain that produces a PDF (orders, budgets, parts budgets, inspections, warehouse reports, machine-hours reports) has its own `generate<X>PDF.jsx` under that feature's `components/pdf/` folder, built on `pdf-lib`. There's no shared PDF template component — each generator builds its document from scratch, so check an existing generator in the same feature area for the established layout conventions before adding a new one.

### Shared utils worth knowing about

- `src/utils/formatDate.js`, `src/utils/financialUtils.js` (price formatting) — canonical formatters; prefer these over local reimplementations.
- `src/utils/getInitials.js` — shared avatar-initials helper.
- `src/utils/sortHelpers.js` — `comparePtPt`/`sortByPtPt`, the shared `"pt-PT"` locale string comparator.
- `src/utils/normalizeSearch.js` — accent-insensitive search matching used across list/filter UIs.
- `src/utils/imageCompression.js` — client-side image compression before upload (Firebase Storage, not base64-in-Firestore — base64 image storage in Firestore docs was migrated away from earlier in this project's history; don't reintroduce it).
