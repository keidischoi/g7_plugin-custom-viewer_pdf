# Changelog

## [0.2.16] - 2026-09-21

### Added
- Settings page `badge_order` (default 20, 0–999; lower appears higher). Host reads `window.__cdpViewerOrder['custom-viewer_pdf']`.

## [0.2.15] - 2026-09-21

### Fixed
- Admin settings 404 (`template_id=1, name=custom-viewer_pdf.plugin_settings`). G7 registers `admin/plugin_settings.json` as `{identifier}.{layout_name}`, so `layout_name` must stay `plugin_settings`. 0.2.14 used the full name and G7 stored `custom-viewer_pdf.custom-viewer_pdf.plugin_settings`.
- Drop extra admin JSON files that `registerPluginLayouts()` would also prefix and sync.
- Re-register the settings row on plugin activate/upgrade using `template_layouts` (`source_type=plugin`).

## [0.2.14] - 2026-09-21

### Fixed
- Admin settings page no longer 404s on `template_id=1, name=custom-viewer_pdf.plugin_settings` (serve that layout by exact name; stop deleting the row)
- Share-page badge stack is not re-appended every 250ms, so the drawings badge click/hover still fires

## [0.2.13] - 2026-09-21

### Fixed
- Saved `badge_order` is no longer overwritten by G7 `getConfigValues()` defaults on the share page
- Re-sort `#cdp_viewer_badge_stack` after publishing `window.__cdpViewerOrder` so the host skip-if-same-ids remount actually shows the new order

## [0.2.12] - 2026-09-21

### Fixed
- Remove `plugin.json` `layouts: custom-viewer_pdf.plugin_settings` so G7 install/admin no longer shows **Failed to load layout**
- Stop intercepting `core.layout.get/find/load/resolve`
- Delete the orphaned settings layout row 0.2.9/0.2.10 may have written to the host `layouts` table

## [0.2.11] - 2026-09-21

### Fixed
- Stop 503 from `getConfigValues()` → G7 settings → `getConfigValues()` recursion
- Do not upsert layouts from the plugin constructor on every request

## [0.2.10] - 2026-09-21

### Fixed
- Settings form now GET/PUT `/api/plugins/custom-viewer_pdf/admin/settings` so saved values persist (was writing to the host `/api/admin/plugins/...` store the plugin never reads)

## [0.2.9] - 2026-09-21

### Added
- Settings page `badge_order` (default 20, 0–999; lower appears higher) published as `window.__cdpViewerOrder['custom-viewer_pdf']`

### Fixed
- Expose `badge_order` in G7 `defaults.json` schema so the admin settings form renders **PDF 정렬 번호**

## [0.2.8] - 2026-09-20

### Fixed
- PDF stage/scroller no longer uses a hardcoded black `#111` background
- Viewer chrome (page rail, nav, zoom) follows the host light/dark theme
- Theme detection also reads `data-theme`, `color-scheme`, page background, and `prefers-color-scheme`
- Do not mount Chrome's native PDF iframe until pdf.js fails, so the themed stage is not covered by a black viewer

## [0.2.7] - 2026-09-20

### Fixed
- Left page thumbnails follow the current page as the main PDF scroller moves (rail-only scroll, not `scrollIntoView`)

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
