/*! custom-viewer_pdf 0.2.2 share PDF viewer (plugin; host=custom-digital_product) */
(function () {
  if (window.__cdpPdf) return;

  function pdfCfg() {
    var d = { badge_label: 'PDF', badge_icon: '📄', show_print: true, show_download: true, show_page_thumbs: true, show_file_rail: true, show_zoom: true, wheel_turns_page: true, wheel_scroll_px: 140, default_scale: 1.15 };
    try {
      var fromG7 = (window.G7Config && window.G7Config.plugins && window.G7Config.plugins['custom-viewer_pdf']) || {};
      var s = Object.assign({}, fromG7, window.__cdpPdfSettings || {});
      Object.keys(s).forEach(function (k) { d[k] = s[k]; });
      d.wheel_scroll_px = Number(d.wheel_scroll_px) || 140;
      d.default_scale = Number(d.default_scale) || 1.15;
      ['show_print','show_download','show_zoom','show_page_thumbs','show_file_rail','wheel_turns_page'].forEach(function (k) {
        d[k] = !(d[k] === false || d[k] === 0 || d[k] === '0' || d[k] === 'false');
      });
    } catch (e) {}
    return d;
  }

  function pullSettings() {
    return Promise.resolve();
  }

  var PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build';
  var state = {
    files: [],
    productData: null,
    modal: null,
    modalFiles: [],
    currentIdx: 0,
    page: 1,
    pageCount: 0,
    scale: (function(){ try { return Number(pdfCfg().default_scale) || 1.15; } catch(e){ return 1.15; } })(),
    pdfDoc: null,
    rendering: false,
    pendingPage: null,
    disposed: true,
    ui: null,
    raf: 0
  };

  function extOf(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  function pickUrl(f) {
    if (!f || typeof f !== 'object') return '';
    return String(f.preview_url || f.download_url || f.url || f.file_url || f.href || '');
  }

  function extOfFile(f) {
    if (!f) return '';
    var direct = String(f.format_ext || f.ext || f.extension || f.file_ext || '').toLowerCase().replace(/^\./, '');
    if (direct) return direct;
    return extOf(f.file_name) || extOf(f.name) || extOf(f.original_name) || extOf(f.file_path);
  }

  function isPdfFile(f) {
    if (!f || typeof f !== 'object') return false;
    var mime = String(f.mime || f.mime_type || f.content_type || f.file_type || '').toLowerCase();
    if (mime.indexOf('pdf') !== -1) return true;
    if (extOfFile(f) === 'pdf') return true;
    var names = [f.file_name, f.name, f.original_name, f.filename, f.file_path, f.path];
    for (var i = 0; i < names.length; i++) {
      if (/\.pdf(?:$|[?#])/i.test(String(names[i] || ''))) return true;
    }
    return false;
  }

  function normalizeProductFiles(raw) {
    var list = [];
    if (!raw) return list;
    if (Array.isArray(raw)) list = raw.slice();
    else if (typeof raw === 'object') {
      Object.keys(raw).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (k) {
        if (raw[k]) list.push(raw[k]);
      });
    }
    var out = [];
    list.forEach(function (f, i) {
      if (!f || typeof f !== 'object') return;
      var row = Object.assign({}, f);
      if (!row.file_name) row.file_name = String(f.file_name || f.name || f.original_name || '');
      if (row.index === undefined || row.index === null) row.index = i;
      out.push(row);
    });
    return out;
  }

  function isDarkTheme() {
    try {
      return !!(document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    } catch (e) {
      return true;
    }
  }

  function themePalette() {
    return isDarkTheme() ? {
      overlayBg: 'rgba(0,0,0,.72)', panelBg: '#111827', text: '#f3f4f6', muted: '#9ca3af',
      border: '#374151', btnBg: '#374151', btnText: '#f9fafb', railBg: '#0b1220', canvasBg: '#1f2937'
    } : {
      overlayBg: 'rgba(15,23,42,.55)', panelBg: '#fff', text: '#111827', muted: '#6b7280',
      border: '#e5e7eb', btnBg: '#111827', btnText: '#fff', railBg: '#f3f4f6', canvasBg: '#e5e7eb'
    };
  }

  function collectDomPdfFiles() {
    var out = [];
    var seen = {};
    function add(name, url) {
      name = String(name || '').trim().replace(/\s+/g, ' ');
      url = String(url || '').trim();
      if (!/\.pdf(?:$|[?#])/i.test(name) && !/\.pdf(?:$|[?#])/i.test(url)) return;
      var key = url || name;
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ index: out.length, file_name: name || 'file.pdf', exists: true, preview_url: url, download_url: url });
    }
    try {
      var nodes = document.querySelectorAll('a, button, span, div, li, p, td, [download], [data-file-name]');
      for (var i = 0; i < Math.min(nodes.length, 800); i++) {
        var el = nodes[i];
        if (el.id === 'cdp_share_pdf_badge' || el.id === 'cdp_share_pdf_modal') continue;
        var href = el.getAttribute && (el.getAttribute('href') || el.getAttribute('data-preview-url') || el.getAttribute('data-download-url') || el.getAttribute('data-file-url') || '');
        var label = (el.getAttribute && (el.getAttribute('data-file-name') || el.getAttribute('download'))) || '';
        var text = '';
        try { text = el.childNodes.length <= 3 ? String(el.textContent || '') : ''; } catch (e2) {}
        add(label || text, href);
      }
    } catch (e) {}
    return out;
  }

  function pageHasPdfName() {
    if (collectDomPdfFiles().length) return true;
    try {
      var text = document.body ? String(document.body.innerText || '') : '';
      return /[\w.\-()]+\.pdf\b/i.test(text);
    } catch (e) {
      return false;
    }
  }

  function filesFromProduct(productData) {
    var src = productData || {};
    var raw = [];
    if (src.files) raw = raw.concat(normalizeProductFiles(src.files));
    if (src.downloads) raw = raw.concat(normalizeProductFiles(src.downloads));
    if (src.attachments) raw = raw.concat(normalizeProductFiles(src.attachments));
    return raw.filter(function (f) { return f && f.exists !== false && isPdfFile(f); });
  }

  function imageBox() {
    var el = document.getElementById('cdp_share_image_viewer');
    return el || null;
  }

  function host3dBox() {
    var ids = ['cdp_share_3d_badge', 'cdp_viewer_badge_stack'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) return el;
    }
    try {
      var nodes = document.querySelectorAll('button, a, [role="button"]');
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        if (n.id === 'cdp_share_pdf_badge') continue;
        var label = String(n.textContent || '').replace(/\s+/g, ' ').trim();
        if (label === '3D' || label.indexOf('3D') !== -1 && label.length < 12) {
          var img = imageBox();
          if (!img) return n;
          var ib = img.getBoundingClientRect();
          var nb = n.getBoundingClientRect();
          if (nb.top >= ib.top - 8 && nb.left >= ib.left && nb.right <= ib.right + 8) return n;
        }
      }
    } catch (e) {}
    return null;
  }

  function placeBadge() {
    var btn = document.getElementById('cdp_share_pdf_badge');
    if (!btn) return;
    var img = imageBox();
    if (!img) {
      btn.style.display = 'none';
      return;
    }
    var ib = img.getBoundingClientRect();
    if (ib.width < 40 || ib.height < 40) {
      btn.style.display = 'none';
      return;
    }
    var top = ib.top + 12;
    var right = window.innerWidth - ib.right + 12;
    var host = host3dBox();
    if (host) {
      var hb = host.getBoundingClientRect();
      if (hb.height > 8) {
        top = hb.bottom + 8;
        right = window.innerWidth - hb.right;
      }
    }
    btn.style.display = 'inline-flex';
    btn.style.top = Math.round(top) + 'px';
    btn.style.right = Math.round(Math.max(8, right)) + 'px';
  }

  function ensureBadge() {
    return;
    var has = (state.files && state.files.length) || pageHasPdfName();
    var btn = document.getElementById('cdp_share_pdf_badge');
    if (!has) {
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      return;
    }
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'cdp_share_pdf_badge';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'PDF 미리보기');
      btn.innerHTML = '<span style="font-size:28px;line-height:1">📄</span><span>PDF</span>';
      btn.style.cssText = 'position:fixed;z-index:40;display:none;align-items:center;gap:8px;padding:12px 20px;border-radius:9999px;border:0;background:rgba(17,24,39,.88);color:#fff;font-size:24px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.28);line-height:1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openModal(0);
      });
      document.body.appendChild(btn);
    }
    placeBadge();
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS_CDN + '/pdf.min.js';
      s.async = true;
      s.onload = function () {
        if (!window.pdfjsLib) return reject(new Error('pdfjsLib missing'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + '/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { reject(new Error('pdf.js load failed')); };
      document.head.appendChild(s);
    });
  }

  function setStatus(msg) {
    if (state.ui && state.ui.status) state.ui.status.textContent = msg || '';
  }

  function closeModal() {
    state.disposed = true;
    state.pdfDoc = null;
    state.rendering = false;
    state.pendingPage = null;
    try {
      var fs = document.exitFullscreen || document.webkitExitFullscreen;
      if (fs && (document.fullscreenElement || document.webkitFullscreenElement)) fs.call(document);
    } catch (eFs) {}
    try {
      if (state._bodyOverflow != null) document.body.style.overflow = state._bodyOverflow;
      state._bodyOverflow = null;
    } catch (eU) {}
    if (state.modal && state.modal.parentNode) state.modal.parentNode.removeChild(state.modal);
    state.modal = null;
    state.ui = null;
  }

  function ensureTextLayerCss() {
    if (document.getElementById('cdp_pdf_textlayer_css')) return;
    var s = document.createElement('style');
    s.id = 'cdp_pdf_textlayer_css';
    s.textContent =
      '.cdp-pdf-page{position:relative;margin:0 auto;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);}' +
      '.cdp-pdf-page canvas{display:block;}' +
      '.cdp-pdf-textlayer{position:absolute;inset:0;overflow:hidden;line-height:1;transform-origin:0 0;z-index:2;}' +
      '.cdp-pdf-textlayer span{position:absolute;white-space:pre;color:transparent;cursor:text;transform-origin:0 0;}' +
      '.cdp-pdf-textlayer ::selection{background:rgba(56,189,248,.35);}';
    (document.head || document.documentElement).appendChild(s);
  }



  function bindPageObserver() {
    if (!state.ui || !state.ui.scroller || !state.ui.pageEls) return;
    if (state._pageObs) {
      try { state._pageObs.disconnect(); } catch (e) {}
    }
    var obs = new IntersectionObserver(function (entries) {
      var best = null, ratio = 0;
      entries.forEach(function (en) {
        if (en.intersectionRatio > ratio) { ratio = en.intersectionRatio; best = en.target; }
      });
      if (!best) return;
      var n = parseInt(best.getAttribute('data-page') || '0', 10);
      if (!n || n === state.page) return;
      state.page = n;
      if (state.ui.pageLabel) state.ui.pageLabel.textContent = state.page + ' / ' + state.pageCount;
      if (typeof state.ui.paintPageActive === 'function') {
        try { state.ui.paintPageActive(); } catch (e2) {}
      }
    }, { root: state.ui.scroller, threshold: [0.4, 0.6, 0.8] });
    state.ui.pageEls.forEach(function (el) { obs.observe(el); });
    state._pageObs = obs;
  }

  function buildContinuousStack() {
    if (!state.pdfDoc || !state.ui || !state.ui.scroller) return;
    var scroller = state.ui.scroller;
    var scale = state.scale || 1.15;
    try {
      var stageEl = state.ui.stage;
      if (stageEl) {
        var fr = stageEl.querySelector('iframe[data-cdp-pdf-frame]');
        if (fr && fr.parentNode) fr.parentNode.removeChild(fr);
      }
    } catch (eFr) {}
    scroller.innerHTML = '';
    var els = [];
    state.ui.pageEls = els;
    var total = state.pdfDoc.numPages || 1;
    state.pageCount = total;
    state.page = state.page || 1;
    if (state.ui && state.ui.pageLabel) state.ui.pageLabel.textContent = state.page + ' / ' + total;
    function addPage(i) {
      if (state.disposed) return;
      if (i > total) {
        bindPageObserver();
        return;
      }
      state.pdfDoc.getPage(i).then(function (page) {
        var vp = page.getViewport({ scale: scale });
        var wrap = document.createElement('div');
        wrap.className = 'cdp-pdf-page';
        wrap.setAttribute('data-page', String(i));
        wrap.style.cssText = 'margin:28px auto;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.45);border-radius:2px;position:relative;';
        var canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.cssText = 'display:block;background:#fff;';
        wrap.appendChild(canvas);
        var tag = document.createElement('div');
        tag.textContent = i + ' / ' + total;
        tag.style.cssText = 'position:absolute;right:8px;bottom:8px;font-size:11px;color:#374151;background:rgba(255,255,255,.88);padding:2px 6px;border-radius:4px;pointer-events:none;';
        wrap.appendChild(tag);
        scroller.appendChild(wrap);
        els.push(wrap);
        return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      }).then(function () { addPage(i + 1); }).catch(function () { addPage(i + 1); });
    }
    state._rebuildStack = buildContinuousStack;
    addPage(1);
  }

  function turnPage(next) {
    if (!state.pdfDoc) return;
    next = Math.max(1, Math.min(state.pageCount || next, next));
    if (state.ui && state.ui.pageEls && state.ui.pageEls[next - 1]) {
      state.page = next;
      try { state.ui.pageEls[next - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      if (state.ui.pageLabel) state.ui.pageLabel.textContent = state.page + ' / ' + state.pageCount;
      if (typeof state.ui.paintPageActive === 'function') try { state.ui.paintPageActive(); } catch (e2) {}
      return;
    }
    if (next === state.page) return;
    renderPage(next);
  }

  function renderPage(num) {
    if (!state.pdfDoc || !state.ui || !state.ui.canvas) return;
    if (state.rendering) {
      state.pendingPage = num;
      return;
    }
    state.rendering = true;
    state.page = num;
    var pageObj = null;
    var viewport = null;
    state.pdfDoc.getPage(num).then(function (page) {
      if (state.disposed) return;
      pageObj = page;
      viewport = page.getViewport({ scale: state.scale });
      var canvas = state.ui.canvas;
      var ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      if (state.ui.pageWrap) {
        state.ui.pageWrap.style.width = viewport.width + 'px';
        state.ui.pageWrap.style.height = viewport.height + 'px';
      }
      return page.render({ canvasContext: ctx, viewport: viewport }).promise;
    }).then(function () {
      if (state.disposed || !pageObj || !viewport) return;
      ensureTextLayerCss();
      var layer = state.ui.textLayer;
      if (!layer) return;
      layer.innerHTML = '';
      layer.style.width = viewport.width + 'px';
      layer.style.height = viewport.height + 'px';
      return pageObj.getTextContent().then(function (textContent) {
        var pdfjsLib = window.pdfjsLib;
        if (pdfjsLib && typeof pdfjsLib.renderTextLayer === 'function') {
          return pdfjsLib.renderTextLayer({
            textContent: textContent,
            textContentSource: textContent,
            container: layer,
            viewport: viewport,
            textDivs: []
          }).promise;
        }
      });
    }).then(function () {
      state.rendering = false;
      if (state.ui && state.ui.pageLabel) state.ui.pageLabel.textContent = state.page + ' / ' + state.pageCount;
      if (state.ui && typeof state.ui.paintPageActive === 'function') {
        try { state.ui.paintPageActive(); } catch (ePa) {}
      }
      if (state.pendingPage != null) {
        var next = state.pendingPage;
        state.pendingPage = null;
        renderPage(next);
      }
    }).catch(function () {
      state.rendering = false;
      if (state.ui && state.ui.pageLabel) state.ui.pageLabel.textContent = state.page + ' / ' + state.pageCount;
    });
  }

  function showIframeFallback(url) {
    try {
      if (!state.ui || !state.ui.canvas || !url) return;
      var host = (state.ui && state.ui.stage) || (state.ui.canvas && state.ui.canvas.parentNode);
      if (!host) return;
      if (state.ui.pageWrap) state.ui.pageWrap.style.display = 'none';
      var old = host.querySelector('iframe[data-cdp-pdf-frame]');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var frame = document.createElement('iframe');
      frame.setAttribute('data-cdp-pdf-frame', '1');
      frame.src = url;
      frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;z-index:1;';
      host.appendChild(frame);
    } catch (e) {}
  }

  function openPdfDocument(pdfjsLib, url) {
    return fetch(url, { credentials: 'include' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.arrayBuffer();
    }).then(function (buf) {
      return pdfjsLib.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
    }).catch(function () {
      return pdfjsLib.getDocument({ url: url, withCredentials: true, verbosity: 0 }).promise;
    }).catch(function () {
      return pdfjsLib.getDocument({ url: url, withCredentials: false, verbosity: 0 }).promise;
    });
  }

  function openFile(idx) {
    var list = state.modalFiles || [];
    if (!list.length) {
      setStatus('PDF 파일이 없습니다');
      return;
    }
    state.currentIdx = Math.max(0, Math.min(idx, list.length - 1));
    var file = list[state.currentIdx];
    var url = pickUrl(file);
    if (!url) {
      setStatus('미리보기 주소가 없습니다');
      return;
    }
    if (state.ui && typeof state.ui.paintThumbs === 'function') {
      try { state.ui.paintThumbs(); } catch (eT) {}
    }
    setStatus((file.file_name || 'PDF') + ' 불러오는 중…');
    state.disposed = false;
    showIframeFallback(url);
    setStatus(file.file_name || 'PDF');
    loadPdfJs().then(function (pdfjsLib) {
      if (state.disposed) return null;
      return openPdfDocument(pdfjsLib, url);
    }).then(function (doc) {
      if (state.disposed || !doc) return;
      state.pdfDoc = doc;
      state.pageCount = doc.numPages || 1;
      state.page = 1;
      if (state.ui && state.ui.pageLabel) state.ui.pageLabel.textContent = '1 / ' + state.pageCount;
      try {
        var host = state.ui && state.ui.stage;
        var frame = host && host.querySelector('iframe[data-cdp-pdf-frame]');
        if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
        if (state.ui.pageWrap) state.ui.pageWrap.style.display = '';
        if (state.ui.canvas) state.ui.canvas.style.display = '';
      } catch (eClr) {}
      setStatus(file.file_name || 'PDF');
      if (typeof buildContinuousStack === 'function') buildContinuousStack();
      else renderPage(1);
      if (state.ui && typeof state.ui.buildPageThumbs === 'function') {
        try { state.ui.buildPageThumbs(); } catch (eBt) {}
      }
    }).catch(function () {
      setStatus(file.file_name || 'PDF');
    });
  }

  function openModal(startIdx) {
    closeModal();
    try {
      if ((!state.files || !state.files.length) && window.__cdpViewers && typeof window.__cdpViewers.getLastProduct === 'function') {
        run(window.__cdpViewers.getLastProduct());
      }
    } catch (eProd) {}
    var list = (state.files && state.files.length) ? state.files.slice() : collectDomPdfFiles();
    list = list.filter(function (f) { return f && (pickUrl(f) || isPdfFile(f)); });
    if (!list.length) return;
    state.modalFiles = list;
    state.currentIdx = Math.max(0, Math.min(startIdx || 0, list.length - 1));
    if (!document.body) return;
    var pal = themePalette();
    var overlay = document.createElement('div');
    overlay.id = 'cdp_share_pdf_modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:' + pal.overlayBg + ';display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    try {
      state._bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } catch (eLock) {}
    overlay.addEventListener('wheel', function (e) {
      e.stopPropagation();
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY > 0) state.scale = Math.max(0.5, state.scale - 0.1);
        else state.scale = Math.min(3, state.scale + 0.1);
        if (typeof state._rebuildStack === 'function') state._rebuildStack();
        else renderPage(state.page);
        return;
      }
      var sc = (state.ui && state.ui.scroller) || overlay.querySelector('[data-cdp-pdf-scroller]');
      if (!sc) return;
      e.preventDefault();
      var step = Number(pdfCfg().wheel_scroll_px) || 140;
      var dy = e.deltaY;
      if (Math.abs(dy) < 1) dy = e.deltaY;
      sc.scrollTop += (dy > 0 ? Math.max(step, Math.abs(dy)) : -Math.max(step, Math.abs(dy)));
    }, { passive: false });
    var panel = document.createElement('div');
    panel.setAttribute('data-cdp-pdf-panel', '1');
    panel.style.cssText = 'width:min(1120px,98%);height:min(780px,94vh);background:' + pal.panelBg + ';border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.45);color:' + pal.text;
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid ' + pal.border + ';flex-shrink:0';
    var title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:14px';
    title.textContent = 'PDF 미리보기';
    var status = document.createElement('div');
    status.style.cssText = 'font-size:12px;color:' + pal.muted + ';flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    function topBtn(label, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'background:' + pal.btnBg + ';color:' + pal.btnText + ';border:0;border-radius:8px;padding:6px 12px;cursor:pointer';
      b.addEventListener('click', function (e) { e.preventDefault(); fn(); });
      return b;
    }
    var FS_IN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>';
    var FS_OUT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8V3h5M21 8V3h-5M3 16v5h5M16 21h5v-5"/></svg>';
    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.title = '전체화면';
    fsBtn.setAttribute('aria-label', '전체화면');
    fsBtn.innerHTML = FS_IN;
    fsBtn.style.cssText = 'width:36px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:' + pal.btnBg + ';color:' + pal.btnText + ';border:0;border-radius:8px;cursor:pointer';
    fsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      try {
        var el = document.fullscreenElement || document.webkitFullscreenElement;
        if (el) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else if (panel.requestFullscreen) panel.requestFullscreen();
        else if (panel.webkitRequestFullscreen) panel.webkitRequestFullscreen();
      } catch (e2) {}
    });
    bar.appendChild(title);
    bar.appendChild(status);
    bar.appendChild(fsBtn);
    bar.appendChild(topBtn('닫기', closeModal));
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;min-height:0;overflow:hidden;background:' + pal.canvasBg;
    var rail = document.createElement('div');
    var railCollapsed = true;
    rail.style.cssText = 'display:flex;flex-direction:row;align-items:stretch;gap:0;flex:0 0 18px;width:18px;max-width:18px;min-height:0;overflow:visible;position:relative;z-index:6;background:transparent;transition:width .22s ease,max-width .22s ease,flex-basis .22s ease';
    var railMain = document.createElement('div');
    railMain.style.cssText = 'display:none;flex-direction:column;align-items:stretch;flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;background:' + pal.canvasBg;
    var railBtnCss = 'flex:0 0 auto;height:28px;border:0;background:transparent;color:' + pal.text + ';cursor:pointer;font-size:12px';
    var railUp = document.createElement('button');
    railUp.type = 'button';
    railUp.textContent = '▲';
    railUp.title = '위로 스크롤';
    railUp.style.cssText = railBtnCss;
    var railDown = document.createElement('button');
    railDown.type = 'button';
    railDown.textContent = '▼';
    railDown.title = '아래로 스크롤';
    railDown.style.cssText = railBtnCss;
    var thumbs = document.createElement('div');
    thumbs.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px;overflow-x:hidden;overflow-y:auto;flex:1;min-height:0;scrollbar-width:none;background:' + pal.canvasBg;
    var thumbButtons = [];
    function paintThumbs() {
      thumbButtons.forEach(function (btn, i) {
        var on = i === state.currentIdx;
        btn.style.outline = on ? '2px solid #60a5fa' : '2px solid transparent';
        btn.style.outlineOffset = '2px';
        btn.style.boxShadow = on ? '0 8px 20px rgba(96,165,250,.35)' : '0 2px 8px rgba(0,0,0,.25)';
      });
    }
    list.forEach(function (f, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.title = f.file_name || ('PDF ' + (i + 1));
      btn.style.cssText = 'width:88px;min-height:72px;padding:8px 6px;border-radius:10px;border:0;background:rgba(17,24,39,.88);color:#fff;cursor:pointer;font-size:11px;line-height:1.3;word-break:break-all';
      btn.innerHTML = '<div style="font-size:20px;line-height:1">📄</div><div style="margin-top:6px">' +
        String(f.file_name || ('PDF ' + (i + 1))).replace(/</g, '') + '</div>';
      btn.addEventListener('click', function () {
        openFile(i);
        paintThumbs();
      });
      thumbs.appendChild(btn);
      thumbButtons.push(btn);
    });
    function scrollRailBy(dir) {
      thumbs.scrollBy({ top: dir * 88, behavior: 'smooth' });
    }
    railUp.addEventListener('click', function (e) { e.preventDefault(); scrollRailBy(-1); });
    railDown.addEventListener('click', function (e) { e.preventDefault(); scrollRailBy(1); });
    var pageThumbs = document.createElement('div');
    pageThumbs.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px;overflow-x:hidden;overflow-y:auto;scrollbar-width:thin;background:rgba(17,24,39,.28);border-radius:10px;max-height:100%;';
    var pageThumbBtns = [];
    function paintPageActive() {
      pageThumbBtns.forEach(function (btn, i) {
        var on = (i + 1) === state.page;
        btn.style.outline = on ? '2px solid #60a5fa' : '2px solid transparent';
        btn.style.boxShadow = on ? '0 8px 20px rgba(96,165,250,.35)' : '0 2px 8px rgba(0,0,0,.2)';
        if (on) {
          try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (eSv) {}
        }
      });
    }
    function buildPageThumbs() {
      pageThumbs.innerHTML = '';
      pageThumbBtns = [];
      if (!state.pdfDoc) return;
      var total = state.pdfDoc.numPages || 1;
      var i = 1;
      function next() {
        if (i > total || state.disposed) return;
        var pageNo = i;
        i += 1;
        state.pdfDoc.getPage(pageNo).then(function (pg) {
          var vp = pg.getViewport({ scale: 0.18 });
          var c = document.createElement('canvas');
          c.width = vp.width;
          c.height = vp.height;
          c.style.cssText = 'width:88px;height:auto;display:block;background:#fff';
          return pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(function () { return c; });
        }).then(function (c) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.title = '페이지 ' + pageNo;
          btn.style.cssText = 'padding:0;border:0;border-radius:8px;background:#fff;cursor:pointer;overflow:hidden';
          btn.appendChild(c);
          btn.style.position = 'relative';
          var cap = document.createElement('span');
          cap.textContent = String(pageNo);
          cap.style.cssText = 'position:absolute;left:4px;bottom:2px;font-size:10px;color:#111;background:rgba(255,255,255,.8);padding:0 3px;border-radius:3px;line-height:1.2';
          btn.appendChild(cap);
          btn.addEventListener('click', function () { renderPage(pageNo); });
          pageThumbs.appendChild(btn);
          pageThumbBtns.push(btn);
          paintPageActive();
          next();
        }).catch(function () { next(); });
      }
      next();
    }
    var RAIL_OPEN = '<svg width="10" height="14" viewBox="0 0 10 14"><polyline points="3.5 2 7.5 7 3.5 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var RAIL_CLOSE = '<svg width="10" height="14" viewBox="0 0 10 14"><polyline points="6.5 2 2.5 7 6.5 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var railToggle = document.createElement('button');
    railToggle.type = 'button';
    railToggle.innerHTML = RAIL_OPEN;
    railToggle.title = '파일 목록';
    railToggle.style.cssText = 'flex:0 0 18px;width:18px;border:0;border-left:1px solid ' + pal.border + ';background:' + pal.panelBg + ';color:' + pal.text + ';cursor:pointer;display:flex;align-items:center;justify-content:center';
    function applyRailCollapsed(on) {
      railCollapsed = !!on;
      if (railCollapsed) {
        rail.style.flex = '0 0 18px';
        rail.style.width = '18px';
        rail.style.maxWidth = '18px';
        rail.style.background = 'transparent';
        railMain.style.display = 'none';
        railToggle.innerHTML = RAIL_OPEN;
        railToggle.setAttribute('aria-expanded', 'false');
      } else {
        rail.style.flex = '0 0 114px';
        rail.style.width = '114px';
        rail.style.maxWidth = '114px';
        rail.style.background = pal.canvasBg;
        railMain.style.display = 'flex';
        railToggle.innerHTML = RAIL_CLOSE;
        railToggle.setAttribute('aria-expanded', 'true');
      }
    }
    railToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      applyRailCollapsed(!railCollapsed);
    });
    overlay.addEventListener('click', function (e) {
      if (railCollapsed) return;
      if (rail.contains(e.target)) return;
      applyRailCollapsed(true);
    });
    railMain.appendChild(railUp);
    railMain.appendChild(thumbs);
    railMain.appendChild(railDown);
    rail.appendChild(railMain);
    rail.appendChild(railToggle);
    applyRailCollapsed(true);
    rail.style.display = 'flex';
    var stage = document.createElement('div');
    stage.style.cssText = 'flex:1;overflow:hidden;background:#111;display:flex;min-height:0;position:relative';
    var scroller = document.createElement('div');
    scroller.setAttribute('data-cdp-pdf-scroller', '1');
    scroller.style.cssText = 'flex:1;min-width:0;min-height:0;overflow-x:hidden;overflow-y:scroll;display:flex;flex-direction:column;align-items:center;';
    var pageWrap = document.createElement('div');
    pageWrap.className = 'cdp-pdf-page';
    var canvas = document.createElement('canvas');
    var textLayer = document.createElement('div');
    textLayer.className = 'cdp-pdf-textlayer';
    pageWrap.appendChild(canvas);
    pageWrap.appendChild(textLayer);
    scroller.appendChild(pageWrap);
    stage.appendChild(scroller);
    scroller.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      var step = Number(pdfCfg().wheel_scroll_px) || 140;
      scroller.scrollTop += (e.deltaY > 0 ? step : -step);
    }, { passive: false });
    var pageRail = document.createElement('div');
    pageRail.style.cssText = 'position:absolute;left:10px;top:12px;bottom:12px;width:96px;z-index:4;display:flex;align-items:stretch;pointer-events:auto;opacity:.45;transition:opacity .2s ease';
    pageRail.appendChild(pageThumbs);
    stage.appendChild(pageRail);
    var MAG_MINUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M8 11h6"/></svg>';
    var MAG_PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>';
    var pageNav = document.createElement('div');
    pageNav.style.cssText = 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:9999px;background:rgba(17,24,39,.55);z-index:5;opacity:.38;transition:opacity .2s ease';
    function pill(html, title, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.title = title;
      b.innerHTML = html;
      b.style.cssText = 'min-width:32px;height:32px;border:0;border-radius:9999px;background:transparent;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center';
      b.addEventListener('click', function (e) { e.preventDefault(); fn(); });
      return b;
    }
    var pageLabel = document.createElement('span');
    pageLabel.style.cssText = 'font-size:13px;color:#fff;min-width:56px;text-align:center';
    pageNav.appendChild(pill('‹', '이전 페이지', function () { if (state.page > 1) turnPage(state.page - 1); }));
    pageNav.appendChild(pageLabel);
    pageNav.appendChild(pill('›', '다음 페이지', function () { if (state.page < state.pageCount) turnPage(state.page + 1); }));
    var PRINT_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>';
    function printCurrent() {
      var file = (state.modalFiles || [])[state.currentIdx] || {};
      var url = pickUrl(file);
      var win = null;
      try { win = window.open('about:blank', 'cdp_pdf_print'); } catch (eOpen) { win = null; }
      if (!win) {
        setStatus('인쇄 팝업이 차단되었습니다. 이 사이트 팝업을 허용하세요.');
        return;
      }
      try {
        win.document.write('<!doctype html><title>인쇄</title><body style="font:14px sans-serif;padding:24px">인쇄 준비 중…</body>');
        win.document.close();
      } catch (eW) {}
      function printSrc(src) {
        try { win.location.replace(src); } catch (eL) {
          try { win.location.href = src; } catch (eL2) {}
        }
        var tries = 0;
        var t = setInterval(function () {
          tries += 1;
          try {
            if (win.closed) { clearInterval(t); return; }
            win.focus();
            win.print();
            clearInterval(t);
          } catch (eP) {
            if (tries >= 25) clearInterval(t);
          }
        }, 200);
      }
      if (!url) {
        try { win.print(); } catch (e0) {}
        return;
      }
      fetch(url, { credentials: 'include' }).then(function (res) {
        if (!res.ok) throw new Error('print fetch');
        return res.blob();
      }).then(function (blob) {
        printSrc(URL.createObjectURL(blob));
      }).catch(function () {
        printSrc(url);
      });
    }
    var zoomBox = document.createElement('div');
    zoomBox.style.cssText = 'position:absolute;right:14px;bottom:18px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:5;opacity:.38;transition:opacity .2s ease;padding:6px;border-radius:12px;background:rgba(17,24,39,.82);box-shadow:0 4px 14px rgba(0,0,0,.35)';
    var DL_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>';
    function downloadCurrent() {
      var file = (state.modalFiles || [])[state.currentIdx] || {};
      var url = String(file.download_url || pickUrl(file) || '');
      if (!url) return;
      var a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || 'file.pdf';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      if (a.parentNode) a.parentNode.removeChild(a);
    }
    zoomBox.appendChild(pill(PRINT_ICON, '인쇄', printCurrent));
    zoomBox.appendChild(pill(DL_ICON, '다운로드', downloadCurrent));
    zoomBox.appendChild(pill(MAG_PLUS, '확대', function () { state.scale = Math.min(3, state.scale + 0.15); if (state._rebuildStack) state._rebuildStack(); else renderPage(state.page); }));
    zoomBox.appendChild(pill(MAG_MINUS, '축소', function () { state.scale = Math.max(0.5, state.scale - 0.15); if (state._rebuildStack) state._rebuildStack(); else renderPage(state.page); }));
    function fadeOn(on) {
      pageNav.style.opacity = on ? '1' : '.38';
      zoomBox.style.opacity = on ? '1' : '.38';
      pageRail.style.opacity = on ? '1' : '.45';
    }
    stage.addEventListener('mouseenter', function () { fadeOn(true); });
    stage.addEventListener('mouseleave', function () { fadeOn(false); });
    stage.appendChild(pageNav);
    stage.appendChild(zoomBox);
    try {
      var c = pdfCfg();
      if (!c.show_page_thumbs && pageRail) pageRail.style.display = 'none';
      if (!c.show_file_rail && rail) rail.style.display = 'none';
      if (!c.show_print || !c.show_download || !c.show_zoom) {
        var pills = zoomBox.querySelectorAll('button');
        if (pills[0] && !c.show_print) pills[0].style.display = 'none';
        if (pills[1] && !c.show_download) pills[1].style.display = 'none';
        if (pills[2] && !c.show_zoom) pills[2].style.display = 'none';
        if (pills[3] && !c.show_zoom) pills[3].style.display = 'none';
      }
    } catch (eCfg) {}

    body.appendChild(rail);
    body.appendChild(stage);
    panel.appendChild(bar);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    state.modal = overlay;
    state.ui = { status: status, canvas: canvas, pageLabel: pageLabel, paintThumbs: paintThumbs, paintPageActive: paintPageActive, buildPageThumbs: buildPageThumbs, panel: panel, pageWrap: pageWrap, textLayer: textLayer, stage: stage, scroller: scroller };
    document.addEventListener('fullscreenchange', function () {
      var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fsBtn.innerHTML = on ? FS_OUT : FS_IN;
      fsBtn.title = on ? '전체화면 종료' : '전체화면';
      fsBtn.setAttribute('aria-label', fsBtn.title);
      panel.style.borderRadius = on ? '0' : '12px';
      panel.style.width = on ? '100%' : 'min(1120px,98%)';
      panel.style.height = on ? '100%' : 'min(780px,94vh)';
    });
    paintThumbs();
    if (state.ui.pageLabel) state.ui.pageLabel.textContent = '1 / …';
    openFile(state.currentIdx);
  }

  function run(productData) {
    try {
      if (productData) state.productData = productData;
      var files = filesFromProduct(productData || state.productData);
      if (!files.length) files = collectDomPdfFiles();
      state.files = files;
      ensureBadge();
    } catch (e) {
      try { ensureBadge(); } catch (e2) {}
    }
  }

  function registerWithHost() {
    var entry = {
      id: 'custom-viewer_pdf',
      extensions: ['pdf'],
      badge: {
        icon: pdfCfg().badge_icon || '📄',
        label: pdfCfg().badge_label || 'PDF',
        onClick: function (product) {
          pullSettings().then(function () {
            try { if (product) run(product); } catch (e0) {}
            try { openModal(0); } catch (e) {}
          }).catch(function () {
            try { if (product) run(product); } catch (e0) {}
            try { openModal(0); } catch (e) {}
          });
        }
      }
    };
    try {
      if (window.__cdpViewers && window.__cdpViewers.__ready && typeof window.__cdpViewers.register === 'function') {
        window.__cdpViewers.register(entry);
        return true;
      }
    } catch (e1) {}
    try {
      if (!(window.__cdpViewers && window.__cdpViewers.__ready)) {
        window.__cdpViewers = window.__cdpViewers || {};
        window.__cdpViewers.__pending = window.__cdpViewers.__pending || [];
        window.__cdpViewers.__pending = window.__cdpViewers.__pending.filter(function (row) {
          return !row || row.id !== entry.id;
        });
        window.__cdpViewers.__pending.push(entry);
      }
    } catch (e2) {}
    return false;
  }

  try { registerWithHost(); } catch (eReg) {}
  (function retryRegister() {
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      var ok = false;
      try { ok = registerWithHost(); } catch (e) {}
      if (ok || n > 40) clearInterval(t);
    }, 250);
  })();

  window.__cdpPdf = {

    run: function (d) {
      try { return Promise.resolve(run(d)).catch(function () {}); } catch (e) { return Promise.resolve(); }
    },
    open: function (i) { try { openModal(i); } catch (e) {} },
    close: function () { try { closeModal(); } catch (e) {} },
    supported: ['pdf'],
    viewable: ['pdf'],
    listable: ['pdf'],
    files: function () { return (state.files || []).slice(); }
  };

  function tick() {
    try { run(state.productData); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  window.addEventListener('resize', placeBadge);
  window.addEventListener('scroll', placeBadge, true);
  var n = 0;
  var tmr = setInterval(function () {
    n += 1;
      tick();
    if (n >= 40) clearInterval(tmr);
  }, 250);
})();
