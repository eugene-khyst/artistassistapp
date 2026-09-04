# AGENTS.md

Rules for AI coding agents working in this repository. Read the code for how things work; read this
for what you must not break.

## Commands

```bash
npm run dev          # hot reload against .env.development (local services, no service worker)
npm run build:dev    # production bundle against .env.development
npm run preview      # serve the built bundle, with the service worker
npm run test         # generated GLSL constants, type-check, lint, format, unit tests; no browser
npm run test:browser # WebGL tests (Playwright Chromium + SwiftShader)

# Maintainer only. Never run these.
npm run lingui:extract
npm run translate
npm run generate:blue-noise
```

Fix lint and formatting with `npm run lint:fix` and `npm run format:write` rather than by hand.

`dev` and `preview` both serve `localhost:5173`, so IndexedDB — auth included — survives between
them: use `build:dev` + `preview` to exercise the production bundle and service worker against local
services, then return to `dev` without logging in again.

Put tests in the root `test/` directory, mirroring `src/`; never under `src/`. Name a test
`*.browser.test.ts` to run it against real WebGL2. `npm run test` deliberately omits the browser
project, because the deploy environment cannot install Chromium; the pre-commit hook runs both.
Shaders can only be tested there — the node project mocks every `.glsl` import, and a shader does
not exist until the Vite GLSL plugin has resolved its `#include`s and minified it. Test a shader by
its properties (an identity resample, a flat color, a preserved symmetry, a suppressed frequency),
never against a second implementation of the same math in the test.

Never assert on console output; silence it with a spy where a test exercises a logged failure. Mock
at the boundary a unit talks to, and assert the value a mock was called with rather than only that
it was called.

## Change Discipline

Never fix a reported symptom in isolation. Trace the affected flow end to end, identify its
ownership boundaries and invariants, and check how the fix interacts with every caller and with the
rest of the current diff. Then make the smallest coherent change that fits the existing design. Do
not propose or perform broad rewrites, architecture changes, or data-model changes unless the
current design demonstrably cannot satisfy the requirement and the maintainer approves that scope.

Do not inspect, assess, or report the Git index or staging status unless asked. The index is
intentionally stale during iterative work; review the working tree.

## Stores

Slices compose into one Zustand store. Rules that are not visible from a slice on its own:

- Register every new durable store in `STORE_RELOADS` (`src/stores/sync/store-reloads.ts`). Its
  order encodes the custom-brands → color-sets dependency, and tokens advance only after a
  successful reload so failures retry on the next wake.
- Cross-tab sync is wake-based (`visibilitychange`/`pageshow`), not broadcast. Persist a field for
  another tab to read only when another tab must react to it.
- Route local changes to serialized state through `persistChange`, never a direct db write.
- Image-derived slices register `{abort, clear}` with `registerOriginalImageDependency` instead of
  being enumerated by image selection. Editors register `{reset, clear, restore}` with
  `imageEditorControls`. Keep both inversions: `edit-image-slice` must not know an editor slice.
  `reset` runs when the editor closes or its command is undone; `clear` additionally for state that
  survives an editor switch; `restore` puts back the controls that produced a command.
- Guard `OnnxModel` setters by object identity, not `id`, so a React Query refetch can propagate
  changed metadata for the same id into the active pipeline.
- Leave `activateLatestColorSet` unawaited at the end of `loadColorSets`, so no reload path makes
  `initApp` block on color data, and keep the identity re-check before it commits: an in-form save
  changes the latest color set without bumping the reload revision.
- Bump a `*ReloadRevision` counter only inside the slice's IDB reload action, so external
  replacements re-prefill the form while in-form saves never clobber edits in progress.
- `initApp` must always reset `isAppInitializing`. Bootstrap side effects go through `tryStep` and
  queue failures with `addInitError` rather than blocking render; `UnhandledRejectionHandler` drains
  that queue once on mount, so it is pre-mount-only.

### Image editing

- An `EditImageCommand` carries the editor controls that produced it, never values derived from
  them, so a preview, an undo entry and a replayed step all restore the same controls. The one
  exception is the percentile max values, which cost a worker round trip and are cached on the
  command.
- Keep `edit-image-command.ts` free of the WebGL applier in `edit-image.ts`, or every editor slice
  pulls it into its module graph.
- Consecutive edits from one editor must not compose (saturation 120 then 130 would replay as 1.56).
  That is what `replaceable` is for: the superseded command stays in the history for undo but is
  never applied. Crop and Straighten are not replaceable, because two crops do compose.
- Preserve the identity of `imageBeforeLastEdit` across successive edits from one editor — it keeps
  the percentile worker cache warm and is what the Adjust Colors white-point picker samples.
- Adjust Colors previews on slider release (`onChangeComplete`), never while dragging, so nothing
  anywhere is debounced. One release is one history entry. Reopening the editor or undoing under an
  open one turns white balance off, so the automatic white balance always belongs to the first
  adjustment.
- `showAppliedImageEditorControls` resets only when the history changed: a canceled edit must not
  clear a value the user just set.
- `hasEditedImageAlpha` and `exportEditedImage` answer different questions and must not be merged:
  save preserves the source format, alpha detection covers every alpha-capable type.
- A command's result blob is internal transport — `applyEditImageCommand` decodes it straight back
  and save re-encodes from the bitmap — so keep it lossless.

## Services (`src/services/`)

Pure business logic, no React.

### `canvas/`

- Keep the `visibilitychange`/`pageshow`/`focus` listeners in the base `Canvas`: they recover from
  bitmaps the browser discarded while the tab was hidden.
- Reset selection state owned by a `CanvasMode` (polygon vertices, crop rectangle) only in
  `onImagesLoaded`. Never reset in `activate`/`deactivate` — toggling "Original" deactivates the
  mode and must not discard the user's selection — and never bridge a store revision into a mode to
  reset it. `CompositeCanvasMode` replays `onImagesLoaded` for an inactive delegate when it next
  activates, so the delegate always has a context and the reset never sees a zero image dimension.
  Store-side editor controls reset on editor switch instead, except the crop aspect ratio, which
  shapes the rectangle and so resets only with the whole editor.
- `setImages`/`setImageIndex` re-fit zoom and pan only when the image dimensions change. Pass a
  stable `sourceImageKey` to `useZoomableImageCanvas`: change it when the underlying source image
  changes, keep it stable while regenerating derived images so the user's viewport survives.

### `image/filter/`

- Filters take an `OffscreenCanvas` and return one. Convert to `ImageBitmap` only where something
  takes ownership: slice state that later closes it, or a Comlink call (an `OffscreenCanvas` cannot
  cross a worker boundary). Convert with `transferToImageBitmap()`, never
  `createImageBitmap(canvas)`, which copies. A caller holding a bitmap converts it in with
  `toOffscreenCanvas`, which passes a canvas straight through; a filter's own
  `copyOffscreenCanvas(renderer.canvas)` must stay a real copy, because `cleanUp()` destroys the
  drawing buffer right after.
- The input is a canvas because `UNPACK_PREMULTIPLY_ALPHA_WEBGL` is ignored for `ImageBitmap`
  sources, whose own creation-time alpha wins. Only a canvas source lets a filter declare the alpha
  its math needs. `WebGLRenderer`'s `premultiplyAlpha` sets that declaration at both ends of the
  pass, the upload flag and the context's `premultipliedAlpha`. Pass `true` from a filter that is
  linear in the pixels — resample, blur, layer mix, perspective warp — and leave it off wherever the
  shader does non-linear color work (levels, gamma, saturation, Oklab, ΔE, threshold, variance),
  which is only correct on straight alpha. Getting this backwards is invisible on opaque images and
  darkens the soft fringe of a cut-out subject.
- `glsl/color-constants.glsl` is **generated** from `@eugene-khyst/artistassistapp-color-mixer` by
  `npm run generate:glsl-constants`, and `npm run test` fails when it is stale. Never edit it, and
  never write a color matrix, white point or luminance triple into a shader: take it from there, so
  the GPU and the TypeScript conversions cannot disagree. Any entry shader including `oklab.glsl`,
  `xyz.glsl`, `lab.glsl` or `luminance.glsl` must include `color-constants.glsl` ahead of it —
  includes are flat and the plugin does not dedupe them, so a fragment cannot include it itself.
- Texture unit 0 is reserved for the source image; bind render-pass textures from unit 1. One image
  binds as `sampler2D u_texture`; several same-sized images upload as one `TEXTURE_2D_ARRAY` and
  bind as `sampler2DArray u_textures`, because GLSL ES 3.00 forbids dynamic indexing of sampler
  arrays but allows any layer coord.

### `ml/`

- Catalog JSON carries identity and inference metadata only. Labels and scores live in the app,
  keyed by id, so they can be translated.
- Keep ONNX Runtime WASM bundled locally from `onnxruntime-web`; never point it at a third-party
  CDN.
- Wrap inference in `withProcessedImageCache` (returns `ImageBitmap`) or
  `withProcessedImageBlobCache` (returns `Blob`) — pick whichever the slice already stores, so a
  cache hit never re-encodes. `transformImage` returns an `OffscreenCanvas`, so resizing and
  encoding never copy it first. Skip the cache for an image-editor command: its result blob already
  lives in the undo history and `edit-image-slice` caches what it renders, which is why Colorize,
  Upscale, Remove background and Remove objects are all uncached.
- The cache key covers `PROCESSED_IMAGE_CACHE_VERSION`, a digest of the model's inference-affecting
  metadata, and every input image digest — the style image is an input, so it belongs in `digests`.
  `processedImageKey` strips only `priority` and `freeTier` by rest-destructuring, so a new field is
  part of the key by default: the worst case is a needless re-run, never a stale image.
- Keep presentation fields out of the model JSON; renaming one there invalidates every cached image.
  Pre- and post-processing live in code, which the JSON cannot express, so bump
  `PROCESSED_IMAGE_CACHE_VERSION` when changing them.
- The cache is derived data: keep it out of cloud sync, ZIP export and `store-changes`. Models
  without a `url` are never cached. Callers pick the encode format (PNG for line art, the JPEG
  default for photo-like output).
- One ONNX session exists at a time: `withInferenceSession` cancels the one in flight, so a nested
  call kills its own parent. Inside the callback use `transformImageInSession` with the supplied
  `run`, never `transformImage`.

### `cloud/`

- Detect edits with the canonical state hash, never a provider revision — revisions churn without
  content changes. Treat cached remote IDs as hints and fall back to lookup.
- Upload the state file last, as the commit point, so it always matches what was hashed. Serialize
  cloud state from the complete `image-metadata` set, never filtered by local blob health: a photo
  that must be uploaded and cannot be materialized aborts the sync, while a locally unreadable photo
  already present remotely stays repairable from the cloud copy.
- Downloads do not trust local metadata: fetch a photo unless its blob reads completely and matches
  its digest. Image blobs are content-addressed staging, so re-uploading after a failure is safe.
- Manual repair never calls provider create APIs. It tries matching files newest-first, verifies the
  digest, and changes only the local blob cache, so the state hash stays unchanged. Normal downloads
  distinguish a vanished remote file from invalid bytes; manual repair reports both as unavailable.
- Blocking conflicts never offer disconnection. Their in-memory Postpone suppresses background sync
  for the tab session and explicit sync clears it; update-notification dismissal is separate.
- Disconnect must work without cached sync state, and moved-out items must survive it. Google
  read/delete paths never create the root; only upload may.
- `ImageUnreadableError` maps to `LocalImageUnreadable` at the cloud boundary. ZIP import/export is
  local-only, validates entries and image digests before replacing local state, and export fails
  open, omitting unreadable photos and their color mixtures.

### `db/`

- **`image-metadata` decides which photos exist; `image-blobs` is best-effort byte storage.**
- Read blob records by primary key, never through an index: `index.get()`/`getAll()` return an
  unreadable blob on iOS 18.4.x ([292142](https://bugs.webkit.org/show_bug.cgi?id=292142)).
- Write only fresh bytes. Re-storing a blob read back from IndexedDB loses its file
  ([240216](https://bugs.webkit.org/show_bug.cgi?id=240216)), which is why `touchImage` updates
  metadata alone.
- Migrations run inside `withWebLock` so concurrent tabs cannot race. A migration needing
  non-IndexedDB awaits does that work in `prepare`, outside any transaction.
- Never recreate or delete a retired store in `LegacyArtistAssistAppDB` automatically; migrations
  empty them. Migration 006 may leave metadata without a blob when legacy bytes cannot be copied.
- Recent Photos does not hash or filter blobs, so photos are never hidden or auto-deleted; a missing
  or undecodable blob surfaces through the card's unavailable state. Do not add an availability
  cache or a background scan.
- Integrity-sensitive reads fully read and hash the bytes; `readImageBytes` reports missing,
  unreadable or mismatched bytes as `ImageUnreadableError`. Manual repair checks metadata and writes
  a fresh blob in one transaction, so it cannot resurrect a concurrently deleted photo.
- A configured style image is checked against the digest in app settings rather than hashed; if its
  record, digest or decoding is invalid, remove the record and the setting atomically while leaving
  the model available for choosing a replacement.

### `auth/`

- The durable `auth-attempt` is the pending redirect state and supports standalone ↔ browser
  handoff. Redirect completion exchanges its token using the stored PKCE verifier; email OTP and
  redirect completion persist the same IDB session shape.
- `resolveAuth()` owns verification and refresh, with refreshes serialized by `withAuthLock`.
- Decryption failures throw `ForceLogoutError` and must route through `logout(error.type)`.

### `validation.ts`

Keep Valibot confined to external JSON validation. Custom-brand JSON and cloud shapes omit `rho`;
`fromCustomColorBrandSource` reconstructs it at the persistence boundary.

## React Query data shape

- Fetchers consumed by hooks return plain arrays, never Maps, so RQ's `structuralSharing` (which
  only walks plain objects and arrays) preserves data refs across refetches. Rebuild Maps in
  `select` with `indexById` / `indexBy`.
- `select` identity must be stable: pass the helper directly under `useQuery`; for `useQueries`,
  define a module-scope adapter (e.g. `indexColors` in `useColors.ts`), since TS cannot propagate
  the queryFn type to the per-query `select` generic. `combine` must be `useCallback`'d.
- Pass _stable_ collection props — see `selectedBrands` in `ColorSetChooser.tsx`. Antd's
  `Form.useWatch` already returns reference-stable values.
- In `useSelectedCatalogItem`, `selectedItemId` is `null` for an explicit cancel and `undefined` for
  "use the default"; `defaultPredicate` keeps an item selectable without letting it become the
  default.
- `fetchColorsBulk` is store-only, with no React Query, and keeps its `Map<string, Map<…>>` shape.

## Image pipeline

- `src/utils/graphics.ts` is the shared surface: use `DrawImageSource` everywhere, and chain
  `DrawImage.*` suppliers through the `drawImage` option of `drawImageToOffscreenCanvas` and
  `imageToBlob` rather than computing crops at call sites.
- `IMAGE_SIZE.SD/HD/2K` are the standard target pixel counts. `original-image-slice` downscales to
  2K once at load; downstream slices resize to SD locally before invoking workers.
- Only `Interpolation.Lanczos` scales its kernel with the reduction factor, so linear and bilinear
  alias when minifying and are upscale-only. `removeBackground` resamples its mask with
  `Interpolation.Bilinear`: a soft matte must not ring, and the mask is normally upscaled. That is
  settled — never propose Lanczos there.
- ONNX-derived image slices invalidate through their setters: changing model, style or input aborts
  and clears derived output; loaders no-op while already loading, commit only if their
  `AbortController` is still current, and close stale `ImageBitmap`s.
- Upscale tiles carry a 48px halo, wider than the model's 34px receptive field, so a tiled result
  matches an untiled one and needs no feathering. Keep the factors integer divisors of the model's
  4x, or core boundaries stop landing on whole output pixels and seams return. A model with a wider
  receptive field cannot be tiled at all.

## Web Workers

- Worker managers live in `src/services/*/worker/*-worker-manager.ts` over the shared
  `WorkerManager`. When the signal passed to `.run(operation, signal?)` aborts, the worker is
  terminated and the next call creates a fresh one — so **a state-holding worker must not be passed
  a signal** unless losing that state is the right answer to the abort, as it is for inference.
- Pass an `ImageBitmap` in with Comlink's `transfer(image, [image])` so it moves instead of being
  cloned. The main-thread reference is neutered afterwards: do not `close()` it. The worker owns the
  bitmap and closes it once drawn.

## Internationalization

- All user-facing strings use Lingui macros (`t`, `msg`, `<Trans>`). Source locale is
  `src/locales/en.po`.
- **Never run `lingui:extract` or `translate`.** Change the source strings and stop; leave the `.po`
  files alone. Never inspect catalogs for missing translations or report missing entries in a
  review.
- Punctuate per block, not per string: a block of one sentence — a heading, an `Empty` description,
  a one-line caption or label — takes no period; two or more sentences are punctuated normally. Keep
  a colon when the line introduces a list.

## PWA

- COEP/COOP headers are required for SharedArrayBuffer, which ONNX WASM threading needs.
- There are no Pages Functions: `public/_redirects` routes `/login/callback` to the SPA, where
  application code completes auth. The service worker only serves the app shell for that navigation,
  and its POST handling is limited to share-target imports.
- Requests carrying `Authorization` or `cache: no-store`, and all requests to the auth origin, must
  bypass runtime caching.
- All persistence uses IndexedDB. `localStorage` is not used.

## Vite

- Use the `@/` alias for every non-same-folder import.
- `.env` holds production settings and `.env.development` overlays them in development. Keep app,
  auth, data and JWK values aligned: `VITE_APP_URL` is also the ID-token audience.
- `src/config.ts` centralizes environment values and shared data-request timeouts; do not duplicate
  them at call sites.

## Styling

- Three layers load from `src/index.css`: `styles/base.css` (resets), `styles/antd-overrides.css`
  (`.ant-*` selectors), `styles/utilities.css` (global `u-*` classes). Per-component styles live in
  co-located `*.module.css`.
- Prefer AntD design tokens as CSS variables (`--ant-padding`, `--ant-color-bg-elevated`) over
  hardcoded values or `theme.useToken()`.
- **AntD 6 injects its CSS-in-JS into `<head>` at runtime, after bundled CSS, so an override at
  equal specificity loses by source order.** Any utility or module class overriding a property AntD
  touches needs `!important`: `width` on Select/Input/Cascader, `margin` on
  Form.Item/Divider/Slider, `padding` on Modal/Drawer/Card body slots, `color` on Typography and
  `.anticon`, `background-color` on Card/Tabs nav. Inline `style` is exempt, since specificity 1000
  always wins.
- Pass dynamic values as CSS custom properties on `style`, typed via `CssVariables`, instead of
  computing pixel values in JS when the CSS can consume a variable.
- CSS Modules use bracket access (`styles['fooBar']`); `styles.fooBar` errors with TS4111.

## Code Conventions

### Comments

Write none by default. A comment is only for a WHY the code cannot show: a browser bug, a
workaround, an invariant that breaks if reordered, an error ignored on purpose.

- One line. If it needs two, fix the name or the code instead.
- Short, simple English. No slang, no idioms, no metaphors, no rhetorical dashes.
- Never restate what the code or an identifier already says, and never narrate a change.

### TypeScript

- Every `.ts`/`.tsx` file except config and generated files must start with the AGPL-3.0 license
  header; copy it from any existing source file.
- `[]` explicitly clears an array and `null` explicitly clears a non-array value. `undefined` never
  means clear: it leaves the value unchanged in an update, or selects the default otherwise.
- No `.then()` chains. Use `async`/`await`; where the surrounding function cannot be async, `void` a
  single fire-and-forget promise, and use a `void` async IIFE only for several awaited steps or
  local error handling.
- Use `import type` for type-only imports. Non-null assertions are allowed. Unused vars and imports
  are errors; prefix a deliberately unused binding with `_`.
