# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev          # Hot reload with .env.development (local services, no service worker)
npm run build        # Type-check + production build; timestamp is VITE_BUILD_ID fallback
npm run build:dev    # Production bundle with .env.development (local auth + data services)
npm run preview      # Preview the already-built production bundle (with service worker)
npm run clean        # Remove node_modules/.vite and dist
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier check
npm run format:write # Prettier auto-format
npm run type-check   # TypeScript type-check only (no emit)
npm run test         # Runs type-check + lint + format (no actual test runner)

# i18n workflow
npm run lingui:extract  # Extract translatable strings from source to .po files
npm run translate       # Auto-translate .po files via Google Translate API
```

### Development Workflow

Both `dev` and `preview` serve on `localhost:5173` (same origin), so IndexedDB state (including auth
state) persists between them. `dev` and `build:dev` load `.env.development`; use `build:dev` +
`preview` to exercise the production bundle and service worker against the same local services, then
return to `dev` without logging in again. Plain `build` + `preview` uses the production settings in
`.env`.

## Architecture

React 19 PWA with a single conditional `<Tabs>` UI in `ArtistAssistApp.tsx`. An `OnnxModel` with an
empty `url` selects a local WebGL pipeline instead of ONNX (the free-tier Outline "quick" mode).

### State Management

Single Zustand store (`src/stores/app-store.ts`) composed from per-feature slices in
`src/stores/*-slice.ts`. `initApp()` loads persisted state from IndexedDB at startup. IDB-backed
cross-tab sync is wake-based: `initAuthAttemptWatcher` and `initPersistedStateWatcher` re-read
durable stores on `visibilitychange`/`pageshow`; add persisted fields there only when another tab
must react. Token-backed reloads are centralized in `STORE_RELOADS`
(`src/stores/sync/store-reloads.ts`) and shared by the watcher, cloud download, and `initApp`.
Registry order encodes the custom-brands → color-sets dependency; tokens advance only after a
successful reload, so failures retry on the next wake. Add new durable stores to that registry.
Mutation sites use `persistChange`: db write → token merge → shared trailing-debounced cloud push
(~5s). Image-derived slices register `{abort, clear}` with `registerProcessedImage`; image selection
iterates those handles instead of enumerating slices.

Form-driven tabs (`ColorSetChooser`, `CustomColorBrandCreator`) re-prefill their AntD form from a
`*ReloadCount` counter bumped only in the slice's IDB reload action — external replacements (cloud
download, cross-tab wake) refresh the form, while in-form saves never clobber edits in progress.

Bootstrap side effects run through `tryStep`; failures are queued with `addInitError` rather than
preventing render. `UnhandledRejectionHandler` drains that queue once on mount, so it is
pre-mount-only. `initApp` must always reset `isAppInitializing`.

### Services Layer (`src/services/`)

Pure business logic, no React. Notable non-obvious bits:

- **`canvas/`** — base `Canvas` recovers from browser-discarded bitmaps via
  `visibilitychange`/`pageshow`/`focus` listeners.
- **`image/filter/`** — WebGL filters return `OffscreenCanvas` so callers chain them without
  round-tripping to `ImageBitmap`; transfer to bitmap only at the boundary. `WebGLRenderer` reserves
  texture unit 0 for the source image, so render-pass textures bind from unit 1.
- **`ml/`** — `OnnxModel` metadata drives preprocessing and the ordered `postProcessing` pipeline.
  ONNX Runtime WASM is bundled locally from `onnxruntime-web`; do not point it at a third-party CDN.
- **`cloud/`** — `cloud-sync-client.ts` owns provider-neutral sync policy over `CloudClient<T>`;
  cached remote IDs are hints and need lookup fallback. Provider revisions churn without content
  changes, so use the canonical state hash to detect edits. State JSON includes custom brands, color
  sets, mixtures, and photo references; photos transfer separately and are digest-checked. Google
  keeps recognizable names with digests in `appProperties`; OneDrive/Dropbox use
  `<digest>.<extension>`. Google read/delete paths never create the root; only upload may do so.
  Blocking conflicts never offer disconnection: their in-memory Postpone suppresses background sync
  for the tab session, while explicit sync clears it; update-notification dismissal is separate.
  Google disconnect trashes the root and account deletion permanently deletes it, OneDrive recycles
  its root, and Dropbox recursively deletes its root's immediate children. Moved-out items survive;
  disconnect must work without cached sync state. ZIP import/export is local-only and must validate
  entries and image digests before replacing local state.
- **`validation.ts`** — keep Valibot confined to external JSON validation. Custom-brand JSON/cloud
  shapes omit `rho`; `fromCustomColorBrandSource` reconstructs it at the persistence boundary.
- **`db/`** — IndexedDB via `idb`; schema in `schema.ts`. Numbered migrations in `migrations.ts` run
  inside `withWebLock` (`src/utils/web-lock.ts`) so concurrent tabs don't race.
- **`auth/`** — the durable `auth-attempt` is the pending redirect state and supports standalone ↔
  browser handoff. Redirect completion exchanges its token using the stored PKCE verifier; email OTP
  and redirect completion persist the same IDB session shape. `resolveAuth()` owns verification and
  refresh, with refreshes serialized by `withAuthLock`. Decryption failures throw `ForceLogoutError`
  and must route through `logout(error.type)`.

### React Query data shape

Service-layer fetchers consumed by hooks (`fetchOnnxModels`, `fetchColorBrands`,
`fetchStandardColorSets`, `fetchColors`) return plain arrays — not Maps — so RQ's
`structuralSharing` (which only walks plain objects/arrays) preserves data refs across refetches.
Hooks rebuild Maps via `select` using `indexById` / `indexBy` (`src/utils/map.ts`). `select`
identity must be stable: pass the helper directly under `useQuery`; for `useQueries`, define a
module-scope adapter (e.g. `indexColors` in `useColors.ts`) since TS can't propagate the queryFn
type to the per-query `select` generic. `combine` must be `useCallback`'d.

Store slices that cache an `OnnxModel` should guard redundant setter calls by object identity, not
by `id`, so React Query refetches can propagate same-id metadata changes (`url`, access tier,
pre/post-processing) into the active pipeline.

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

ONNX-derived image slices use setter-driven invalidation: changing model/style/input aborts and
clears derived output; loaders no-op while already loading, commit results only if their
`AbortController` is still current, and close stale `ImageBitmap`s.

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

Lingui-based. Source locale `src/locales/en.po`. After adding or changing source strings:
`npm run lingui:extract` then `npm run translate`. All user-facing strings must use Lingui macros
(`t`, `msg`, `<Trans>`).

### PWA

Service worker at `src/service-worker.ts`, registered from `src/utils/service-worker.ts` (wired in
`main.tsx`). Cross-Origin headers (COEP/COOP) are required for SharedArrayBuffer support (ONNX WASM
threading). There are no Pages Functions: `public/_redirects` routes `/login/callback` to the SPA,
where application code completes auth. The SW only serves the app shell for that navigation; its
POST handling is limited to share-target imports. Requests with `Authorization`/`cache: no-store`,
plus all requests to the auth origin, must bypass runtime caching. All persistence uses IndexedDB;
`localStorage` is not used.

### Vite Configuration

- Path alias: `@/` → `/src/` (use this prefix for all non-same-folder imports).
- `.env` defines production settings; development mode overlays `.env.development`. Keep app, auth,
  data, and JWK values aligned: `VITE_APP_URL` is also the ID-token audience.
- `src/config.ts` centralizes environment values and shared data-request timeouts; do not duplicate
  them at call sites.

### Styling

Three-layer system loaded from `src/index.css`: `styles/base.css` (resets),
`styles/antd-overrides.css` (`.ant-*` selectors), `styles/utilities.css` (global `u-*` classes —
utilities and shared semantic patterns like `u-tab-content`, `u-popup-panel`). Per-component styles
live in co-located `*.module.css`. AntD 6 has `cssVar: true` by default, so AntD design tokens are
available everywhere as CSS variables (`--ant-padding`, `--ant-color-bg-elevated`, etc.) — prefer
them over hardcoded values or `theme.useToken()`.

**Critical:** AntD 6's CSS-in-JS injects rules into `<head>` at runtime, _after_ bundled CSS. So
overrides on AntD components at equal class specificity lose by source order. Any utility or module
class that overrides a property AntD touches (`width` on Select/Input/Cascader; `margin` on
Form.Item, Divider, Slider; `padding` on Modal/Drawer/Card body slots; `color` on Typography and
`.anticon` icons; `background-color` on Card/Tabs nav) **needs `!important`**. Inline `style` never
hit this because spec 1000 always wins — class-based replacements do.

Dynamic values pass through CSS custom properties on `style`, typed via `CssVariables` in
`src/utils/types.ts` (e.g. LightboxOverlay swipe progress, ColorMixingChart column count). Reach for
this pattern instead of computing pixel values in JS when the CSS can consume a variable.

CSS Modules use bracket access (`styles['fooBar']`) — the generated `.d.ts` exposes an index
signature, so `styles.fooBar` errors with TS4111.

## Code Conventions

### License Header

Every `.ts`/`.tsx` file (except config files and generated files with `/* eslint-disable */`)
**must** start with the AGPL-3.0 license header. ESLint enforces this via
`eslint-plugin-license-header`. Copy the header from any existing source file.

### Imports

- Use the `@/` alias for cross-folder imports (enforced by ESLint — no relative `../` paths except
  within the same folder).
- Imports must be sorted (`simple-import-sort`).
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`).

### TypeScript

- Strict mode enabled (`tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`).
- Unused vars are errors (prefix with `_` to suppress).
- Unused imports are errors (`eslint-plugin-unused-imports`).
- Non-null assertions (`!`) are allowed (rule turned off).
