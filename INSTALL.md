# Install — custom-viewer_pdf 0.1.0 (G7 PLUGIN)

Identifier: `custom-viewer_pdf` (install folder **must** match: `plugins/custom-viewer_pdf/`)

> Not a module. Do **not** use `module:install` / `modules/`.

## Prerequisites

1. Gnuboard7 with `php82`
2. Host module **`custom-digital_product`** installed and active
3. Share/detail layouts expose product files with `preview_url` or `download_url` for `.pdf`

## Commands

```bash
php82 artisan plugin:install custom-viewer_pdf
php82 artisan plugin:activate custom-viewer_pdf
php82 artisan extension:update-autoload
php82 artisan hooks:clear
php82 artisan cache:clear
php82 artisan route:clear
```

Manual copy into `plugins/custom-viewer_pdf/` then the same commands.

## Verify

```bash
php82 artisan plugin:list | grep viewer_pdf
curl -sI "https://YOUR_HOST/api/plugins/custom-viewer_pdf/assets/share-pdf.js" | head -5
```

Open a share/detail page that has a PDF attachment. Host badge stack should show **📄 PDF** next to **🧊 3D**.
