# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev             # Start dev server with hot reload (no service worker)
npm run cf-typegen      # Generate Cloudflare Pages Function types into functions/types.d.ts
npm run build           # Generate CF types + type-check + Vite build
npm run build:local     # Same as build, but sets CF_PAGES_COMMIT_SHA=$(date +%s) so VITE_COMMIT_HASH is non-empty
npm run build:local-auth # build:local in `local-auth` Vite mode (loads .env.local-auth)
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

- `npm run dev` — hot reload, no service worker.
- `npm run build:local && npm run preview` — build + preview the production bundle with the service
  worker active. Use `build:local-auth` instead when testing against a local auth server.

Both `dev` and `preview` serve on `localhost:5173` (same origin), so IndexedDB state (including ID
tokens) persists between them. Log in once via `build:local` + `preview` to get the full service
worker, then switch to `dev` for hot-reload development.

Cloudflare Pages handles `_redirects` rewrites, `404.html`, and Pages Functions in production only —
neither `dev` nor `preview` replicates this behavior locally. The CF Pages Function at
`functions/login/callback.ts` (the iOS/iPadOS auth fallback) is not exercised in local dev.

## Architecture

### Application Structure

ArtistAssistApp is a React 19 PWA for artists. The UI is a single `<Tabs>` component in
`ArtistAssistApp.tsx` with one tab per feature (ColorSet, Photo, ColorPicker, Palette, ColorMixing,
ColorMixingChart, Outline, Grid, TonalValues, SimplifiedPhoto, LimitedPalette, StyleTransfer,
ColorAdjustment, PerspectiveCorrection, BackgroundRemove, Compare, CustomColorBrand, Help). Tab
visibility is conditional on auth state and PWA display mode. Feature tabs that run ML models
(Outline, StyleTransfer, BackgroundRemove) share an `OnnxModelSelect` dropdown; the Outline tab's
"quick" option is modeled as a local ONNX model entry with an empty `url` (access gated via
`hasAccessTo` and `freeTier`). The Outline tab additionally supports two viewing modes: **Light
box** (fullscreen + screen-orientation lock, for tracing paper laid on a tablet screen) and **AR**
(live rear-camera feed with the outline overlaid, for tracing onto non-flat surfaces).

### State Management

A single Zustand store (`src/stores/app-store.ts`) composed from many slices — one slice per feature
area. Slices live in `src/stores/*-slice.ts`. The store is initialized at startup via
`initAppStore()` which loads persisted state from IndexedDB.

Notable slices:

- **`color-mixer-slice.ts`** — `buildPalette()` gets sampling points from the quantized image,
  matches them to paints via `findSimilarColorBulk`, merges similar colors, and saves to palette.
  Uses shared `colorMixer` worker singleton instead of inline Worker creation.
- **`palette-slice.ts`** — `saveToPaletteBulk()` for batch-saving palette entries with abort signal
  support

### Custom Hooks (`src/hooks/`)

- **`useLightbox`** — manages lightbox state, `requestFullscreen` on a container ref,
  `screen.orientation.lock(...)`, and auto-close when the user exits fullscreen via Esc. Has an
  in-flight guard (`isOpeningRef`) so double-clicks can't desync `enteredFullscreenRef` and leave
  the app stuck in fullscreen on close.
- **`useArMode`** — manages the AR camera stream:
  `getUserMedia({video: {facingMode: {ideal: 'environment'}}})` (rear camera preferred, graceful
  fallback to front), stream lifecycle, unmount race guard (`isMountedRef` stops tracks that resolve
  after unmount), concurrent-entry guard (`isRequestingRef`), and auto-exit when the parent passes
  `isActive: false` (e.g. user switches tabs). Returns a `videoRef` for the consuming `<video>`
  element.

The Outline tab orchestrates mutual exclusion between the two (entering AR closes the lightbox and
vice versa). The AR overlay itself is pure CSS: the outline `<canvas>` is rendered above the
`<video>` with `filter: invert(1)` and `mix-blend-mode: difference`, so each stroke paints as the
color complement of the live camera pixel underneath — max contrast on any surface color, no WebGL
pass. This is distinct from the grid/overlay pre-inversion (`invert-colors-webgl.ts` +
`invert-colors.glsl`).

### Services Layer (`src/services/`)

Pure business logic, no React:

- **`color/`** — color types (watercolor, oil, acrylic, etc.), color mixing via reflectance curves
  (`color-mixer.ts`), palette building with minimal paint selection (`palette-builder.ts`), color
  data fetched from `https://data.artistassistapp.com`
- **`canvas/`** — canvas rendering classes (zoomable image canvas, color picker canvas, grid canvas,
  reflectance chart). Base `Canvas` class recovers from browser-discarded bitmaps via
  `visibilitychange`/`pageshow`/`focus` event listeners
- **`image/`** — image processing: outline (`outline.ts`: dispatches on `OnnxModel` — if the model
  has a `url`, runs ONNX inference; otherwise runs the local WebGL Sobel pipeline — Gaussian blur →
  Sobel on all three Oklab channels → separable grayscale dilation → CPU Otsu threshold →
  `thresholdFilterWebGL` with antialiased `smoothstep` transitions), tonal values, perspective
  correction (`perspective-correction.ts`: `autoDetectPerspectiveVertices` downscales to SD, runs
  the `sobelGradientsXyWebGL` sibling shader to get per-pixel X/Y Sobel gradients on Oklab L packed
  as RGBA8, then per boundary does a margin-restricted argmax scan with an orientation-confidence
  and edge-bias weighted score, weighted PCA line fit with iterative outlier rejection, intersects
  the four lines, and validates the quadrilateral for convexity/area/min-edge-length), blur, limited
  palette, style transfer, background removal, sampling points (`sampling-point.ts`: Chamfer 3-4
  distance transform finds deepest pixel per color region, greedy merge by chroma/deltaE_OK), color
  match overlay (`color-match.ts`: reuses the Sobel+Otsu+threshold pipeline, then draws
  color-matched regions on top via `mergeImages`)
- **`image/filter/`** — WebGL-based image filters (Gaussian blur, Kuwahara filter,
  `sobel-edge-detection-webgl.ts` combined Gaussian+Sobel+dilation pipeline, standalone
  `dilation-webgl.ts` separable max morphology, threshold with `u_grayscale` fast path that skips
  Oklab conversion when input is already grayscale, perspective correction, color adjustment,
  interpolation with Bilinear/Bicubic/Lanczos), CPU helpers (`otsu-threshold.ts`: Otsu's method
  histogram-based threshold in Oklab L, with a `grayscaleInput` fast path that uses the red channel
  directly), CPU-based color quantization (`color-quantize.ts`: two-pass over-quantize then
  merge-closest in Oklab, `MAX_COLORS=60`), blue noise ordered dithering (`dither.ts`, threshold
  texture generated by `generate-blue-noise.mjs` at project root), and shared `types.ts` (e.g.
  `KernelSize` union). WebGL filters return `OffscreenCanvas`; callers chain them without
  round-tripping to `ImageBitmap` and transfer to bitmap only at the boundary.
- **`ml/`** — ONNX Runtime Web inference via `onnxruntime-web`; WASM files loaded from jsDelivr CDN.
  `OnnxModel` metadata (`ml/types.ts`) drives preprocessing and postprocessing: `resolution` (number
  or `[w, h]`), `maxPixelCount`, `inputSizeMultiple`, `preserveAspectRatio`, `colorChannelOrdering`
  (`'RGB'` or `'BGR'`), `mean`/`standardDeviation`, `outputName`, and a `postProcessing` pipeline
  (`MeanStdNormalization`, `Invert`, `ScaleTo255`) applied in order in `tensor.ts`.
  `image-transformer.ts` resizes output up to `IMAGE_SIZE['2K']` via Lanczos interpolation. Models
  used for background removal, style transfer, and the "quality" outline path. A model with an empty
  `url` means "run the local WebGL pipeline instead of ONNX."
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
- **`math/`** — geometry, matrix operations, GCD (generic math utilities like `clamp` and
  `ceilToMultiple` live in `~/src/utils/math-utils.ts`)
- **`ads/`** — ad integration
- **`event/`** — custom event manager
- **`print/`** — print functionality
- **`rating/`** — app rating prompts
- **`url/`** — URL parsing utilities

### Image Pipeline Helpers

`src/utils/graphics.ts` is the shared surface for image work:

- `DrawImageSource = ImageBitmap | OffscreenCanvas` — accepted by all canvas classes, WebGL filters,
  and most `image/` functions so bitmaps and canvases chain without conversions.
- `DrawImage` namespace builds `DrawImageParamsSupplier` functions: `cropMargins`,
  `expandToAspectRatio`, `resizeAndCrop`, `scale` (optional `sizeMultiple`), `resizeToPixelCount`,
  `resizeToSize`. Pass one or an array (chained left-to-right) to `drawImageToOffscreenCanvas` /
  `imageBitmapToBlob` via the `drawImage` option.
- `ResizeImage.resizeToPixelCount(pixelCount)` produces `ImageBitmapOptions` for the native
  `createImageBitmap` resize path (used by `resizeImageBitmap` / `createImageBitmapAndResize`).
- `IMAGE_SIZE.SD / HD / 2K` — standard target pixel counts. `original-image-slice` downscales the
  source image once to 2K at load time; downstream slices (color mixer, limited palette, etc.)
  further resize to SD before invoking workers so per-feature resizing is explicit and local.

### Web Workers

Heavy computation runs off the main thread using Web Workers + Comlink for RPC:

- `color-mixer-worker.ts` — wraps `ColorMixer` class
- `color-mixing-chart-worker.ts` — wraps color mixing chart generation
- `inference-worker.ts` — wraps `InferenceRunner` (ONNX)
- `color-quantization-worker.ts` — color quantization (posterize, limited palette, sampling points)
- `rgb-channels-percentile-worker.ts` — image statistics

Worker managers in `src/services/*/worker/*-worker-manager.ts` handle creating/communicating with
workers. The shared `WorkerManager` (`src/utils/worker-manager.ts`) lazily instantiates the worker
on first use and exposes `.run(operation, signal?)`: when `signal` aborts, the worker is
`terminate()`d so the next call creates a fresh instance (state-holding workers must not pass a
signal that could cut them off mid-session).

Convention for passing `ImageBitmap` into workers: wrap with Comlink's `transfer(image, [image])` so
the bitmap moves instead of being structured-cloned. The main-thread reference is neutered after
transfer — do not call `.close()` on it. The worker takes ownership and is responsible for calling
`image.close()` once it has drawn the bitmap onto its own canvas.

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

Every `.ts`/`.tsx` file (except config files and generated files with `/* eslint-disable */`)
**must** start with the AGPL-3.0 license header. ESLint enforces this via
`eslint-plugin-license-header`. Copy the header from any existing source file.

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
