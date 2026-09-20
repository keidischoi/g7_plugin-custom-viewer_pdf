# 호스트 한 줄 (custom-digital_product)

호스트 ViewerRegistry는 `register()` 할 때마다 **마지막 뷰어만** 남깁니다.
그래서 PDF가 `register()` 하면 🧊가 사라지고 📄만 남습니다.

PDF 플러그인은 레지스트리에 등록하지 않습니다.
3D와 같이 다운로드 리스트를 받으려면 share/detail boot에서 `__cdp3d.run` 옆에 한 줄만 추가하세요.

```js
if (window.__cdp3d) window.__cdp3d.run(productData);
if (window.__cdpPdf) window.__cdpPdf.run(productData);
```

이 한 줄이 있으면 플러그인이 `productData.files`에서 pdf만 골라
🧊 **바로 아래**에 📄를 그립니다. 호스트 배지는 건드리지 않습니다.
