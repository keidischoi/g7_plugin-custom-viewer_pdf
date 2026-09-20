# Changelog

## [0.2.6] - 2026-09-20

### Fixed
- Page stack and left page-thumbnail rail no longer keep appending when zoom, file switch, or a slow render overlaps the previous build
- Cap both lists at `numPages` and cancel in-flight `getPage` work with a generation token
- Debounce zoom rebuilds; page thumbs jump with `turnPage` instead of painting a detached canvas

## [0.1.11] - 2026-09-19

### Fixed
- Removed `Object.defineProperty(__cdp3d)` and `fetch` hook that hid the host 🧊 badge
- Own overlay `#cdp_share_pdf_layer` on the image viewer only; do not change parent layout or host stack
- 📄 still sits under measured 3D badge, or top-right if none


## [0.1.9] - 2026-09-19

### Fixed
- Never modify/remove host 🧊 badge or stack
- Measure existing 3D badge/stack box and place 📄 **under** it (same right edge, +8px gap)


## [0.1.8] - 2026-09-19

### Fixed
- Stop registering into `window.__cdpViewers` (host drew two 📄 pills and dropped 🧊)
- Single plugin-owned badge `#cdp_share_pdf_badge` under the 3D badge, with its own click handler
- Do not treat the word "PDF" on badges as a download-list hit


## [0.1.7] - 2026-09-19

### Fixed
- Show 📄 when download list *text* contains `.pdf`, even if `productData.files` hook was missed
- Watch `#cdp_share_3d_badge` / badge stack with MutationObserver and keep PDF pill next to it
- Hook `fetch` for digital_product JSON and absorb `files`/`downloads`


## [0.1.6] - 2026-09-19

### Changed
- Same contract as custom-viewer3d: read host `productData.files` (digital download list) and show 📄 only when a PDF row exists
- Intercept `window.__cdp3d.run(productData)` via defineProperty so the download list is seen even if host only calls the 3D entry
- Prepend share-pdf.js before host boot (priority 80) without creating `__cdpViewers`


## [0.1.5] - 2026-09-19

### Fixed
- Detect PDF by mime/`format_ext`/`original_name`, not only `.pdf` in URL (CDP download URLs have no extension)
- Place 📄 as sibling of `#cdp_share_3d_badge` with the same pill style
- Scan attachments/downloads buckets + page text `.pdf`


## [0.1.4] - 2026-09-19

### Fixed
- Host stack often ignores PDF even after register(). Now **insert 📄 into `#cdp_viewer_badge_stack`** when PDF files exist
- Capture files from `window.__cdp3d.run(productData)` by wrapping it (host only called 3D)
- Discover `.pdf` links in the share/detail DOM if product payload has no files yet


## [0.1.3] - 2026-09-19

### Fixed
- **Do not create `window.__cdpViewers`**. Doing so blocked host registry init; custom-viewer3d then saw a dead object / `__ready` and hid the 🧊 badge
- Register only via existing `register()` or an already-created `__pending` array; poll until host is ready
- Inject `share-pdf.js` after other layout scripts (do not unshift in front of 3D)


## [0.1.2] - 2026-09-19

### Fixed
- Layout script now has `name` / `label` so G7 AssetFailure toast is not `undefined을(를) 불러오지 못했습니다`
- Skip PDF.js `getDocument` when preview/download URL is empty


## [0.1.1] - 2026-09-19

### Fixed
- Do not create host-reserved `#cdp_viewer_badge_stack` (that made custom-viewer3d think the host owned badges and skip its 🧊 badge)
- Do not replace `window.__cdpViewers`; only append de-duplicated `__pending`
- Fallback PDF badge sits *below* `#cdp_share_3d_badge` instead of overlapping top-right
- Remove fallback badge once the host stack is ready


## [0.1.0] - 2026-09-19

### Added

- Thin Event-Hook PDF viewer plugin mirroring `custom-viewer3d`
- Identifier `custom-viewer_pdf`, namespace `Plugins\Custom\ViewerPdf`
- Layout listener injects `share-pdf.js` on `cdp_share_detail` / `user_free_product_show`
- Host registry: `window.__cdpViewers.register` + `__pending` queue
- Compatibility API: `window.__cdpPdf.run(productData)` / `open` / `close`
- PDF.js 3.11 canvas modal (page nav, zoom, multi-file rail)
- Soft dependency on module `custom-digital_product`
