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
npm run type-check      # TypeScript type-check only (no emit)
npm run test            # Runs type-check + lint + format (no actual test runner)

# i18n workflow
npm run lingui:extract  # Extract translatable strings from source to .po files
npm run translate       # Auto-translate .po files via Bing Translate API
```

### Development Workflow

Both `dev` and `preview` serve on `localhost:5173` (same origin), so IndexedDB state (including auth
state) persists between them. Log in once via `build` + `preview` to get the full service worker,
then switch to `dev` for hot-reload development. Use `build:local-dev` when testing against local
auth + data servers.

Cloudflare Pages handles `_redirects` rewrites, `404.html`, and Pages Functions only in production;
verify Pages Function behavior in the Cloudflare Pages environment.

## Architecture

React 19 PWA. Single `<Tabs>` UI in `ArtistAssistApp.tsx` — tab visibility is conditional on auth
state and PWA display mode. Outline and BackgroundRemove use `OnnxModelSelect`; StyleTransfer
renders model radio cards because some models require a separate style image. An `OnnxModel` with
empty `url` means "run the local WebGL pipeline instead of ONNX" (used by the Outline "quick" mode,
gated by `freeTier`).

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
- **`useArMode`** — `getUserMedia` rear camera request (`facingMode: {ideal: 'environment'}`). Has
  an unmount race guard (stops tracks that resolve after unmount), a tab-deactivation guard for
  pending camera requests, and a concurrent-entry guard.

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
  `heatmap-corner-detection.ts` (CPU bilinear upscale + Otsu + Moore-Neighbor 8-conn contour trace +
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
- **`db/`** — IndexedDB via `idb`; schema in `db.ts`. Auth session, attempt, and error data share
  the `artistassistapp` database (`auth-db.ts`). Numbered migrations in `migrations.ts` run inside
  `withWebLock` (`src/utils/web-lock.ts`) so concurrent tabs don't race.
- **`auth/`** — Auth callback paths must normalize into the same durable IndexedDB session/error
  shape before the store resolves auth. Paid-tier server JSON is decrypted through
  `decryptDataIfNeeded(data, auth)`; decrypt failures throw `ForceLogoutError`, and React Query, app
  init, and the global unhandled-rejection handler all route it through `logout(error.type)`.
  `resolveAuth()` is the store entry point for auth verification/refresh, with refreshes serialized
  cross-tab via `withWebLock(AUTH_REFRESH_LOCK_NAME, …)`. The `auth-attempt` IDB store is the only
  pending-login state; spinner and watcher both derive from it. QR login links use the auth origin,
  so keep `QRScannerModal`'s origin allowlist in sync with `AUTH_URL`.

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
threading). The SW handles auth callbacks and file sharing. All persistence uses IndexedDB —
`localStorage` is not used.

### Vite Configuration

- Path alias: `@/` → `/src/` (use this prefix for all non-same-folder imports).

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

- Use the `@/` alias for cross-folder imports (enforced by ESLint — no relative `../` paths
  except within the same folder).
- Imports must be sorted (`simple-import-sort`).
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`).

### TypeScript

- Strict mode enabled (`tseslint.configs.strictTypeChecked` + `stylisticTypeChecked`).
- Unused vars are errors (prefix with `_` to suppress).
- Unused imports are errors (`eslint-plugin-unused-imports`).
- Non-null assertions (`!`) are allowed (rule turned off).
