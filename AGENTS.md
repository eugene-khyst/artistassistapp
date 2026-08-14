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
npm run test         # Runs type-check + lint + format + Vitest
npm run test:unit    # Vitest service-layer tests only

# i18n workflow — run by the maintainer only, never by an agent
npm run lingui:extract  # Extract translatable strings from source to .po files
npm run translate       # Auto-translate .po files via Google Translate API

# Code generators — run by the maintainer only
npm run generate:blue-noise  # Regenerate src/services/image/filter/blue-noise.ts
```

Tests live in the root `test/` directory, mirroring `src/`; never place tests under `src/`.

### Development Workflow

Both `dev` and `preview` serve on `localhost:5173` (same origin), so IndexedDB state (including auth
state) persists between them. `dev` and `build:dev` load `.env.development`; use `build:dev` +
`preview` to exercise the production bundle and service worker against the same local services, then
return to `dev` without logging in again. Plain `build` + `preview` uses the production settings in
`.env`.

### Change Discipline

Never fix a reported symptom in isolation. First trace the affected flow end to end, identify its
ownership boundaries and invariants, and check how the proposed fix interacts with every caller and
with the rest of the current diff. Then make the smallest coherent change that fits the existing
design. Do not propose or perform broad rewrites, architecture changes, or data-model changes unless
the current design demonstrably cannot satisfy the requirement and the maintainer approves that
scope.

Do not inspect, assess, or report the Git index or staging status unless the maintainer explicitly
asks. The index is intentionally stale during iterative work; review the working tree instead.

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
Local changes to serialized state use `persistChange`: db write → token merge → shared
trailing-debounced cloud push (~5s). Image-derived slices register `{abort, clear}` with
`registerProcessedImage`; image selection iterates those handles instead of enumerating slices.

Form-driven tabs (`ColorSetChooser`, `CustomColorBrandCreator`) re-prefill their AntD form from a
`*ReloadRevision` counter bumped only in the slice's IDB reload action — external replacements
(cloud download, cross-tab wake) refresh the form, while in-form saves never clobber edits in
progress. `loadColorSets` ends with an unawaited `activateLatestColorSet`, so every reload path
activates the saved set without `initApp` or a store reload blocking on color data. Activation runs
in a `createAbortableOperation`, so a new run supersedes the one in flight and reports through
`isColorSetActivationLoading` / `colorSetActivationError`; `ColorSetActivationNotification` only
renders the failure notice. An in-form save changes the latest color set without bumping the
revision, so activation re-checks its identity before committing.

Bootstrap side effects run through `tryStep`; failures are queued with `addInitError` rather than
preventing render. `UnhandledRejectionHandler` drains that queue once on mount, so it is
pre-mount-only. `initApp` must always reset `isAppInitializing`.

### Services Layer (`src/services/`)

Pure business logic, no React. Notable non-obvious bits:

- **`canvas/`** — base `Canvas` recovers from browser-discarded bitmaps via
  `visibilitychange`/`pageshow`/`focus` listeners. `ZoomableImageCanvas` notifies canvas events
  (`ClickOrTap`) through a shared `EventManager` that subclasses reuse for their own event types.
  `setImages`/`setImageIndex` re-fit zoom and pan only when the image dimensions change, so swapping
  in a re-rendered same-size image keeps the view the user zoomed to. Every `useZoomableImageCanvas`
  caller also passes a stable source key: change it when the underlying source changes to reset
  same-size replacements, but keep it stable while regenerating derived images so their viewport is
  preserved.
- **`image/filter/`** — WebGL filters return `OffscreenCanvas` so callers chain them without
  round-tripping to `ImageBitmap`; transfer to bitmap only at the boundary. `WebGLRenderer` reserves
  texture unit 0 for the source image, so render-pass textures bind from unit 1. One image binds as
  `sampler2D u_texture`; several same-sized images upload as one `TEXTURE_2D_ARRAY` layer stack and
  bind as `sampler2DArray u_textures` (GLSL ES 3.00 forbids dynamic indexing of sampler arrays, but
  the layer coord takes any value).
- **`ml/`** — `OnnxModel` metadata drives preprocessing and the ordered `postProcessing` pipeline.
  ONNX Runtime WASM is bundled locally from `onnxruntime-web`; do not point it at a third-party CDN.
  Inference is slow, so slices wrap it in `withProcessedImageCache` (returns `ImageBitmap`) or
  `withProcessedImageBlobCache` (returns `Blob`, and owns the transform's bitmap) — pick whichever
  the slice already stores, so a cache hit never re-encodes. Entries live in `processed-images`,
  keyed by `PROCESSED_IMAGE_CACHE_VERSION`, a digest of the model's inference-affecting metadata,
  and every input image digest — the style image counts as an input, so it belongs in `digests`.
  `processedImageKey` strips presentation-only fields (`name`, `description`, `image`, `priority`,
  `freeTier`) by rest-destructuring, so a new field is part of the key by default: the worst case is
  a needless re-run, never a stale image. Pre- and post-processing also live in code, which the
  model JSON cannot express — bump `PROCESSED_IMAGE_CACHE_VERSION` when changing them. Callers pick
  the encode format (PNG for line art, the JPEG default for photo-like output). Models without a
  `url` run a local WebGL pipeline and are never cached. The cache is derived data: it stays out of
  cloud sync, ZIP export, and `store-changes`.
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
  disconnect must work without cached sync state. Cloud state is serialized from the complete
  `image-metadata` set and is never filtered by local blob health: a photo that must be uploaded and
  cannot be materialized aborts the sync, while a locally unreadable photo already present remotely
  stays repairable from the cloud copy; the state file — uploaded last, as the commit point — always
  matches what was hashed. Downloads do not trust local metadata: a photo is fetched unless its blob
  reads completely and matches its digest. Image blobs are content-addressed staging and are safe to
  re-upload after a failed attempt. Manual repair never calls provider create APIs; it tries
  matching files newest-first, verifies the digest, and changes only the local blob cache, so the
  state hash stays unchanged. Normal downloads distinguish a vanished remote file from invalid
  bytes; manual repair reports both as unavailable. `ImageUnreadableError` maps to
  `LocalImageUnreadable` at the cloud boundary. ZIP import/export is local-only and validates
  entries and image digests before replacing local state; export fails open, omitting unreadable
  photos and their color mixtures.
- **`validation.ts`** — keep Valibot confined to external JSON validation. Custom-brand JSON/cloud
  shapes omit `rho`; `fromCustomColorBrandSource` reconstructs it at the persistence boundary.
- **`db/`** — IndexedDB via `idb`; schema in `schema.ts`. Numbered migrations in `migrations.ts` run
  inside `withWebLock` (`src/utils/web-lock.ts`) so concurrent tabs don't race; a migration needing
  non-IndexedDB awaits does its work in `prepare`, outside any transaction. Retired stores remain in
  `LegacyArtistAssistAppDB`; never recreate or delete them automatically. Their migrations empty
  them. **`image-metadata` decides which photos exist; `image-blobs` is best-effort byte storage.**
  Both are keyed by digest, so blob records are read by primary key, never through an index —
  `index.get()`/`getAll()` return an unreadable blob on iOS 18.4.x
  ([292142](https://bugs.webkit.org/show_bug.cgi?id=292142)). Re-storing a blob read back from
  IndexedDB loses its file ([240216](https://bugs.webkit.org/show_bug.cgi?id=240216)), so only fresh
  bytes are written and `touchImage` updates metadata alone. Integrity-sensitive reads fully read
  and hash the bytes; `readImageBytes` reports missing, unreadable, or mismatched bytes as
  `ImageUnreadableError`. Recent Photos does not hash or filter blobs, so photos are never hidden or
  auto-deleted; missing or undecodable blobs surface through the card's unavailable state. There is
  no availability cache or background scan. Manual repair checks metadata and writes only a fresh
  blob in one transaction, so it cannot resurrect a concurrently deleted photo. Migration 006 may
  leave metadata without a blob when legacy bytes cannot be copied. ZIP export captures state, blob
  references, and validated bytes through `getLocalStateWithImageBytes`, so compression operates on
  one IndexedDB snapshot. A configured style image is materialized before use; if its record, bytes,
  digest, or decoding is invalid, the record and setting are removed atomically while the model
  remains available for choosing a replacement.
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

Lingui-based. Source locale `src/locales/en.po`. All user-facing strings must use Lingui macros
(`t`, `msg`, `<Trans>`). **Never run `lingui:extract` or `translate`** — the maintainer runs both
once before committing. Change the source strings and stop there; leave the `.po` files alone. Never
inspect catalogs for missing translations or report missing catalog entries during review.

User-facing text is punctuated per block, not per string: a block of a single sentence — a heading,
an `Empty` description, a one-line caption or label — ends without a period, while a block of two or
more sentences is punctuated normally. A colon is kept when the line introduces a list.

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

### Comments

Write none by default. A comment is only for a WHY the code cannot show: a browser bug, a
workaround, an invariant that breaks if reordered, an error ignored on purpose.

- One line. If it needs two, fix the name or the code instead.
- Short, simple English. No slang, no idioms, no metaphors, no rhetorical dashes.
- Never restate what the code or an identifier already says, and never narrate a change.

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
- Do not use Promise `.then()` chains. Use `async`/`await`; when the surrounding function cannot be
  async, `void` the call for a single fire-and-forget promise, and invoke a `void` async IIFE only
  when several awaited steps or local error handling are needed.
- Unused vars are errors (prefix with `_` to suppress).
- Unused imports are errors (`eslint-plugin-unused-imports`).
- Non-null assertions (`!`) are allowed (rule turned off).
