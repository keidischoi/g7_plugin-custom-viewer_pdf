# G7 PDF Viewer Plugin (`custom-viewer_pdf`)

**Identifier:** `custom-viewer_pdf` · **Version:** 0.1.0 · **License:** MIT  
**Type:** G7 **plugin** — **not** a module.

Thin **Event-Hook plugin** that provides PDF preview UI for files already managed by
[`custom-digital_product`](https://github.com/keidischoi/g7-module-custom-digital_product).

> Catalog, orders, downloads, and mypage tabs stay in the host.  
> If `custom-digital_product` is off, this plugin **no-ops**.

## Host contract (필수)

3D 플러그인(`custom-viewer3d`)과 동일한 호스트 연결입니다.

1. 레이아웃 `cdp_share_detail` / `user_free_product_show`에 `share-pdf.js` 주입
2. 로드 즉시 `window.__cdpViewers.register(...)` (없으면 `__pending` 큐)
3. 호스트가 상품 데이터를 넘기면 `window.__cdpPdf.run(productData)`
4. 파일 URL은 `preview_url` 우선, 없으면 `download_url`
5. 호스트 배지 스택(`__cdpViewers.__ready` / `#cdp_viewer_badge_stack`)이 있으면 자체 배지를 그리지 않음

```js
window.__cdpViewers.register({
  id: 'custom-viewer_pdf',
  extensions: ['pdf'],
  badge: { icon: '📄', label: 'PDF', onClick: function () { openModal(0); } },
});

window.__cdpPdf.run(productData);
```

호스트가 `window.__cdp3d.run(productData)`만 호출하고 PDF run을 아직 안 부르는 경우,
호스트 ViewerRegistry에 `custom-viewer_pdf`를 3D와 같이 추가해야 합니다.
그때까지는 레지스트리 `onClick`만으로 모달을 열 수 있게 배지를 등록합니다.

## What it owns

| Owned by plugin | Owned by host (`custom-digital_product`) |
| --- | --- |
| `resources/assets/share-pdf.js` | Share/detail pages, file list, download cards |
| Asset route `/api/plugins/custom-viewer_pdf/assets/share-pdf.js` | ViewerRegistry |
| Layout script injection | Catalog / checkout / orders |

## Install path

```text
plugins/custom-viewer_pdf/
```

```bash
php82 artisan plugin:install custom-viewer_pdf
php82 artisan plugin:activate custom-viewer_pdf
php82 artisan extension:update-autoload
php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear
```

## Public API

```
GET /api/plugins/custom-viewer_pdf/assets/share-pdf.js
```

PDF.js는 jsDelivr CDN(`pdfjs-dist@3.11.174`)에서 로드합니다.
미리보기 URL은 호스트 쿠키/세션을 쓰도록 `withCredentials: true`입니다.
