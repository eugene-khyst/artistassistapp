# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev             # Start dev server with hot reload (no service worker)
npm run cf-typegen      # Generate Cloudflare Pages Function types into functions/types.d.ts
npm run build           # cf-typegen + type-check + Vite build (sets BUILD_ID=$(date +%s) so VITE_BUILD_ID is non-empty when CF_PAGES_COMMIT_SHA is unset)
npm run build:local-dev # `build` in `local-dev` Vite mode (loads .env.local-dev — local auth + data servers)
npm run preview         # Preview the already-built production bundle (with service worker)
npm run clean           # Remove node_modules/.vite and dist
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier check
npm run format:write    # Prettier auto-format
npm run check           # TypeScript type-check only (no emit)
npm run test            # Runs check + lint + format (no actual test runner)

# i18n workflow
npm run lingui:extract  # Extract translatable strings from source to .po files
npm run translate       # Auto-translate .po files via Bing Translate API
```

### Development Workflow

Both `dev` and `preview` serve on `localhost:5173` (same origin), so IndexedDB state (including ID
tokens) persists between them. Log in once via `build` + `preview` to get the full service worker,
then switch to `dev` for hot-reload development. Use `build:local-dev` when testing against local
auth + data servers.

Cloudflare Pages handles `_redirects` rewrites, `404.html`, and Pages Functions only in production —
neither `dev` nor `preview` replicates this locally, so the CF Pages Function at
`functions/login/callback.ts` (the iOS/iPadOS auth fallback) is not exercised in local dev.

## Architecture

React 19 PWA. Single `<Tabs>` UI in `ArtistAssistApp.tsx` — tab visibility is conditional on auth
state and PWA display mode. The Outline, StyleTransfer, and BackgroundRemove tabs share an
`OnnxModelSelect`; an `OnnxModel` with empty `url` means "run the local WebGL pipeline instead of
ONNX" (used by the Outline "quick" mode, gated by `freeTier`).

### State Management

Single Zustand store (`src/stores/app-store.ts`) composed from per-feature slices in
`src/stores/*-slice.ts`. `initApp()` loads persisted state from IndexedDB at startup.

Bootstrap is fault-tolerant: side-effecting init steps run through `tryStep` and route failures to
`addInitError(label, error)` instead of aborting; `main.tsx` wraps the pre-render block in a
matching try/catch so render always runs. `addInitError` queues labeled cause-preserving Errors that
`UnhandledRejectionHandler` drains once on mount as `notification.error` toasts — it is effectively
pre-mount-only. `initApp`'s outer try/finally resets `isAppInitializing` even on failure, so the UI
never gets stuck loading.

### Custom Hooks (`src/hooks/`)

- **`useLightbox`** — wraps `requestFullscreen` + `screen.orientation.lock`. Has an in-flight guard
  so double-clicks can't desync the fullscreen-entry flag and leave the app stuck in fullscreen on
  close.
- **`useArMode`** — `getUserMedia` rear camera with front-camera fallback. Has an unmount race guard
  (stops tracks that resolve after unmount) and a concurrent-entry guard.

The Outline tab orchestrates mutual exclusion between the two. The AR overlay itself is pure CSS:
the outline `<canvas>` is rendered above the `<video>` with `filter: invert(1)` and
`mix-blend-mode: difference`, so each stroke paints as the color complement of the live camera pixel
underneath. Distinct from the grid/overlay pre-inversion (`invert-colors-webgl.ts` +
`invert-colors.glsl`).

### Services Layer (`src/services/`)

Pure business logic, no React. Notable non-obvious bits:

- **`color/`** — color mixing via reflectance curves (`color-mixer.ts`); palette building selects a
  minimal paint set (`palette-builder.ts`); color data fetched from
  `https://data.artistassistapp.com`.
- **`canvas/`** — base `Canvas` recovers from browser-discarded bitmaps via
  `visibilitychange`/`pageshow`/`focus` listeners.
- **`image/`** — `outline.ts` dispatches on `OnnxModel.url` (ONNX vs. local Sobel pipeline);
  `perspective-correction.ts` runs an ONNX heatmap-regression model and extracts corners via
  `heatmap-corners.ts` (CPU bilinear upscale + Otsu + Moore-Neighbor 8-conn contour trace +
  Green's-theorem centroid on the largest blob per channel); `sampling-point.ts` picks deepest pixel
  per region via Chamfer 3-4 distance transform; `color-match.ts` reuses the Sobel+Otsu+threshold
  pipeline.
- **`image/filter/`** — WebGL filters return `OffscreenCanvas` so callers chain them without
  round-tripping to `ImageBitmap`, transferring to bitmap only at the boundary. Threshold and Otsu
  both have a grayscale fast path that skips the Oklab L conversion. Color quantization is two-pass
  over-quantize-then-merge-closest in Oklab, `MAX_COLORS=60`. Blue noise dithering consumes a
  precomputed threshold texture generated by `generate-blue-noise.mjs` at the repo root.
- **`ml/`** — ONNX Runtime Web; WASM loaded from jsDelivr CDN. `OnnxModel` metadata in `ml/types.ts`
  drives preprocessing and a `postProcessing` pipeline applied in order in `tensor.ts`.
  `image-transformer.ts` upscales output up to `IMAGE_SIZE['2K']` via Lanczos.
- **`db/`** — IndexedDB via `idb`; schema in `db.ts`. ID tokens and auth-error data live in the same
  `artistassistapp` database (`auth-db.ts`).
- **`auth/`** — JWT auth client using OIDC Form Post Response Mode. Auth server POSTs `id_token`,
  `error`, `error_context` to `/login/callback`. JWK public key via `VITE_PUBLIC_JWK`. Error type
  strings are the `AuthErrorType` enum. The ID token carries a `dek` claim (base64 AES-256-GCM key)
  stored on `Authentication.dataEncryptionKey`; paid-tier server JSON arrives as `EncryptedEnvelope`
  and is unwrapped via `decryptDataIfNeeded(data, auth)` (no-op for plaintext, `undefined` when
  anonymous, throws `ForceLogoutError` on decrypt failure). React Query's `QueryCache.onError`
  catches `ForceLogoutError` and calls `logout(reason)`, which redirects to `/?error=<type>` so
  `AuthFeedbackHandler` shows the matching modal. `loginWithRedirect()` awaits
  `waitForServiceWorkerActivation()` (bounded) before navigating, so a cold first install still
  intercepts the returning POST. Two callback interception paths:
  1. **Service worker (primary)** — SW intercepts the POST, saves `id_token` and `error_context` to
     IDB, passes `error` type as a URL query param, and redirects to `/`.
  2. **CF Pages Function fallback** (`functions/login/callback.ts`) — handles the POST when the SW
     is not active (some iOS/iPadOS browsers). Uses `HTMLRewriter` to inject auth data as a
     `data-auth-callback` attribute on `<body>`, then serves `index.html`. CF Function types live in
     `functions/types.d.ts` (generated by `cf-typegen`); `functions/` has its own `tsconfig.json`
     and is excluded from the root one.

  `normalizeInjectedAuthCallback()` exists so the CF path lands in the _same_ durable IDB shape as
  the SW path before `handleAuthCallback()` — without it the CF token would only live in a DOM
  attribute, invisible to the auth attempt watcher.

  **Auth attempt watcher** (`src/stores/watchers/auth-attempt-watcher.ts`): on Android with the
  Patreon app installed, OS App-Link interception runs the auth flow in a separate browser, so the
  standalone PWA window stays alive (out-of-scope nav opens an in-app browser instead of navigating
  it) and never learns the outcome. The `auth-attempt` IDB store (surfaced as `authAttempt`) is the
  only state — spinner and watcher both derive from it, no separate flag. Its `displayMode`,
  captured at login-initiation, lets `initApp` flag a login that started in the PWA but resolved in
  a browser tab (`AuthNoticeType.LoginCompletedInBrowser`). `initApp` starts the watcher only after
  the same-page callback is normalized + handled, so a timed-out stale attempt can't clobber an
  in-flight result; it then polls once a second, with durable success (auth state or an IDB id
  token) outranking the 10-min timeout so a backgrounded PWA whose timers were suspended past the
  timeout still reloads into the session. Cross-engine (Samsung Internet PWA + Chrome callback)
  degrades to the 10-min timeout — an accepted unsupported case, not a bug.

### React Query data shape

Service-layer fetchers consumed by hooks (`fetchOnnxModels`, `fetchColorBrands`,
`fetchStandardColorSets`, `fetchColors`) return plain arrays — not Maps — so RQ's
`structuralSharing` (which only walks plain objects/arrays) preserves data refs across refetches.
Hooks rebuild Maps via `select` using `indexById` / `indexBy` (`src/utils/map.ts`). `select`
identity must be stable: pass the helper directly under `useQuery`; for `useQueries`, define a
module-scope adapter (e.g. `indexColors` in `useColors.ts`) since TS can't propagate the queryFn
type to the per-query `select` generic. `combine` must be `useCallback`'d.

Callers must pass _stable_ collection props — see `selectedBrands` in `ColorSetChooser.tsx`. Antd's
`Form.useWatch` already returns reference-stable values.

Exception: `fetchColorsBulk` is store-only (no React Query) and keeps its `Map<string, Map<…>>`
shape.

### Image Pipeline Helpers

`src/utils/graphics.ts` is the shared surface: use `DrawImageSource` (=
`ImageBitmap | OffscreenCanvas`) everywhere; chain `DrawImage.*` supplier functions via the
`drawImage` option of `drawImageToOffscreenCanvas` / `imageBitmapToBlob`. `IMAGE_SIZE.SD/HD/2K` are
standard target pixel counts — `original-image-slice` downscales the source to 2K once at load;
downstream slices resize to SD locally before invoking workers.

### Web Workers

Heavy computation runs off the main thread via Web Workers + Comlink. Worker managers in
`src/services/*/worker/*-worker-manager.ts` handle creation/communication. The shared
`WorkerManager` (`src/utils/worker-manager.ts`) lazily instantiates the worker on first use and
exposes `.run(operation, signal?)`: when `signal` aborts, the worker is `terminate()`d so the next
call creates a fresh instance. **State-holding workers must not pass a signal** that could cut them
off mid-session.

`ImageBitmap` into workers: wrap with Comlink's `transfer(image, [image])` so the bitmap moves
instead of being structured-cloned. The main-thread reference is neutered after transfer — do not
call `.close()` on it. The worker takes ownership and is responsible for `image.close()` once it has
drawn the bitmap onto its own canvas.

### Internationalization

Lingui-based. Source locale `src/locales/en.po`. After adding new strings: `npm run lingui:extract`
then `npm run translate`. All user-facing strings must use Lingui macros (`t`, `msg`, `<Trans>`).

### PWA

Service worker at `src/service-worker.ts`, registered from `src/utils/service-worker.ts` (wired in
`main.tsx`). Cross-Origin headers (COEP/COOP) are required for SharedArrayBuffer support (ONNX WASM
threading). The SW intercepts `POST /login/callback` (auth — see `auth/` above) and
`POST /share-target` (file sharing). All persistence uses IndexedDB — `localStorage` is not used.

### Vite Configuration

- Path alias: `~/src/` → `/src/` (use this prefix for all non-same-folder imports).

## Code Conventions

### License Header

Every `.ts`/`.tsx` file (except config files and generated files with `/* eslint-disable */`)
**must** start with the AGPL-3.0 license header. ESLint enforces this via
`eslint-plugin-license-header`. Copy the header from any existing source file.

### Imports

- Use the `~/src/` alias for cross-folder imports (enforced by ESLint — no relative `../` paths
  except within the same folder).
- Imports must be sorted (`simple-import-sort`).
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`).

### TypeScript

- Strict mode enabled (`tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`).
- Unused vars are errors (prefix with `_` to suppress).
- Unused imports are errors (`eslint-plugin-unused-imports`).
- Non-null assertions (`!`) are allowed (rule turned off).
