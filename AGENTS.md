# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (no service worker)
npm run start        # Build + preview production build (with service worker)
npm run cf-typegen   # Generate Cloudflare Pages Function types into functions/types.d.ts
npm run build        # Generate CF types + type-check + Vite build
npm run preview      # Preview production build (without rebuilding)
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier check
npm run format:write # Prettier auto-format
npm run check        # TypeScript type-check only (no emit)
npm run test         # Runs check + lint + format (no actual test runner)

# i18n workflow
npm run lingui:extract  # Extract translatable strings from source to .po files
npm run translate        # Auto-translate .po files via Bing Translate API
```

### Development Workflow

Both `npm run dev` and `npm run start` serve on `localhost:5173` (same origin), so IndexedDB state
(including ID tokens) persists between them. Use `npm run start` to log in with the full service
worker, then switch to `npm run dev` for hot reload development.

Cloudflare Pages handles `_redirects` rewrites, `404.html`, and Pages Functions in production only —
neither `dev` nor `start` replicate this behavior locally. The CF Pages Function at
`functions/login/callback.ts` (the iOS/iPadOS auth fallback) is not exercised in local dev.

## Architecture

### Application Structure

ArtistAssistApp is a React 19 PWA for artists. The UI is a single `<Tabs>` component in
`ArtistAssistApp.tsx` with one tab per feature (ColorSet, Photo, ColorPicker, Palette, ColorMixing,
Outline, Grid, TonalValues, SimplifiedPhoto, LimitedPalette, StyleTransfer, ColorAdjustment,
PerspectiveCorrection, BackgroundRemove, Compare, Install, CustomColorBrand, Help). Tab visibility
is conditional on auth state and PWA display mode.

### State Management

A single Zustand store (`src/stores/app-store.ts`) composed from many slices — one slice per feature
area. Slices live in `src/stores/*-slice.ts`. The store is initialized at startup via
`initAppStore()` which loads persisted state from IndexedDB.

### Services Layer (`src/services/`)

Pure business logic, no React:

- **`color/`** — color types (watercolor, oil, acrylic, etc.), color mixing via reflectance curves
  (`color-mixer.ts`), color data fetched from `https://data.artistassistapp.com`
- **`canvas/`** — canvas rendering classes (zoomable image canvas, color picker canvas, grid canvas,
  reflectance chart)
- **`image/`** — image processing: outline (Sobel operator), tonal values, perspective correction,
  blur, limited palette (median cut), style transfer, background removal
- **`image/filter/`** — WebGL-based image filters (Gaussian blur, Kuwahara filter, Sobel, threshold,
  perspective correction, color adjustment, interpolation)
- **`ml/`** — ONNX Runtime Web inference for ML models (background removal, style transfer) via
  `onnxruntime-web`; WASM files loaded from jsDelivr CDN
- **`db/`** — IndexedDB access via `idb` library; schema defined in `db.ts` (stores: app-settings,
  color-sets, images, color-mixtures, custom-brands, auth-error, id-token). ID tokens and error data
  are in the same `artistassistapp` database (`auth-db.ts`)
- **`auth/`** — JWT-based auth client using OIDC Form Post Response Mode. The auth server POSTs
  `id_token`, `error`, `error_context` to `/login/callback`. JWKS public key via `VITE_JWKS` env
  var. Two interception paths:
  1. **Service worker (primary)** — SW intercepts the POST, saves `id_token` to IDB, saves
     `error_context` to IDB, passes `error` type as a URL query param, and redirects to `/`.
  2. **CF Pages Function fallback** (`functions/login/callback.ts`) — handles the POST when the SW
     is not active (known to affect some browsers on iOS/iPadOS). Uses `HTMLRewriter` to inject auth
     data as a `data-auth-callback` attribute on `<body>`, then serves `index.html`. The client
     reads from `document.body.dataset.authCallback` first, falling back to URL params. CF Function
     types are generated via `npm run cf-typegen` into `functions/types.d.ts`; `functions/` is
     excluded from the root `tsconfig.json` and has its own `functions/tsconfig.json`.
- **`math/`** — geometry, matrix operations, GCD, clamp utilities
- **`ads/`** — ad integration
- **`event/`** — custom event manager
- **`print/`** — print functionality
- **`rating/`** — app rating prompts
- **`url/`** — URL parsing utilities

### Web Workers

Heavy computation runs off the main thread using Web Workers + Comlink for RPC:

- `color-mixer-worker.ts` — wraps `ColorMixer` class
- `inference-worker.ts` — wraps `InferenceRunner` (ONNX)
- `limited-palette-worker.ts` — limited palette computation
- `rgb-channels-percentile-worker.ts` — image statistics

Worker managers in `src/services/*/worker/*-worker-manager.ts` handle creating/communicating with
workers.

### Internationalization

Lingui is used for i18n. Source locale is English (`src/locales/en.po`). 23 locales supported. After
adding new strings:

1. Run `npm run lingui:extract` to update .po files
2. Run `npm run translate` to auto-translate (uses Bing Translate API)

All user-facing strings must use Lingui macros (`t`, `msg`, `<Trans>`).

### PWA

Service worker at `src/service-worker.ts`, initialized via `src/pwa-init.ts`. Uses `vite-plugin-pwa`
with `injectManifest` strategy. Cross-Origin headers (COEP/COOP) are required for SharedArrayBuffer
support (ONNX WASM threading). The service worker intercepts `POST /login/callback` (auth callback)
and `POST /share-target` (file sharing). When the SW is not active, the CF Pages Function at
`functions/login/callback.ts` handles `POST /login/callback` as a fallback. All persistence uses
IndexedDB — `localStorage` is not used.

### Vite Configuration

- Path alias: `~/src/` → `/src/` (use this prefix for all non-same-folder imports)
- WASM files are excluded from bundles (loaded separately)
- ONNX runtime is chunked separately (`onnx` chunk)
- GLSL shader files are supported via `vite-plugin-glsl` (minified)
- Build targets: Chrome 85+, Edge 85+, Firefox 105+, Safari 16.4+

## Code Conventions

### License Header

Every `.ts`/`.tsx` file (except config files) **must** start with the AGPL-3.0 license header.
ESLint enforces this via `eslint-plugin-license-header`. Copy the header from any existing source
file.

### Imports

- Use the `~/src/` alias for cross-folder imports (enforced by ESLint — no relative `../` paths
  except within the same folder)
- Imports must be sorted (`simple-import-sort`)
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`)

### TypeScript

- Strict mode enabled (`tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`)
- Unused vars are errors (prefix with `_` to suppress)
- Unused imports are errors (`eslint-plugin-unused-imports`)
- Non-null assertions (`!`) are allowed (rule turned off)
