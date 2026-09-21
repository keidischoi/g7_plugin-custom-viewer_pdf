#!/usr/bin/env node
var fs = require('fs');
var path = require('path');

function expect(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
  } else {
    console.log('ok  ' + msg);
  }
}

var src = fs.readFileSync(path.join(__dirname, '..', 'resources/assets/share-pdf.js'), 'utf8');
expect(src.indexOf("window.__cdpViewerOrder = window.__cdpViewerOrder || {}") !== -1, 'boot initializes __cdpViewerOrder');
expect(src.indexOf("window.__cdpViewerOrder['custom-viewer_pdf'] = Number(settings.badge_order) || 20") !== -1, 'boot publishes PDF badge_order');
expect(/badge_order:\s*20/.test(src), 'pdfCfg default badge_order is 20');

var defaults = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config/settings/defaults.json'), 'utf8'));
expect(defaults.defaults.badge_order === 20, 'defaults.json badge_order is 20');
expect(!!defaults.frontend_schema.badge_order, 'defaults.json exposes badge_order');

var ko = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'resources/lang/ko.json'), 'utf8'));
expect(ko.settings.badge_order.label === 'PDF 정렬 번호', 'ko label is PDF 정렬 번호');

var php = fs.readFileSync(path.join(__dirname, '..', 'src/Support/ViewerPdfSettings.php'), 'utf8');
expect(php.indexOf("'badge_order' => 20") !== -1, 'ViewerPdfSettings defaults include badge_order 20');
expect(php.indexOf('clampBadgeOrder') !== -1, 'get/put clamp badge_order');
