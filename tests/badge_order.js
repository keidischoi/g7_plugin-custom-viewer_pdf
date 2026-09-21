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
expect(src.indexOf('function sortHostBadgeStack()') !== -1, 'boot re-sorts host badge stack');
expect(src.indexOf('if (window.__cdpPdf) return;') === -1, 'stale host-loaded share-pdf.js still publishes order');
expect(/badge_order:\s*20/.test(src), 'pdfCfg default badge_order is 20');

var defaults = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config/settings/defaults.json'), 'utf8'));
expect(defaults.badge_order && defaults.badge_order.default === 20, 'defaults.json badge_order default is 20');
expect(defaults.badge_order.type === 'number', 'defaults.json badge_order is a number field');
expect(!!(defaults.badge_order.frontend_schema && defaults.badge_order.frontend_schema.expose), 'defaults.json exposes badge_order');

var ko = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'resources/lang/ko.json'), 'utf8'));
expect(ko.settings.badge_order.label === 'PDF 정렬 번호', 'ko label is PDF 정렬 번호');

var html = fs.readFileSync(path.join(__dirname, '..', 'resources/assets/settings.html'), 'utf8');
expect(html.indexOf('name="badge_order"') !== -1 && html.indexOf('PDF 정렬 번호') !== -1, 'settings.html has PDF 정렬 번호');

['resources/layouts/custom-viewer_pdf.plugin_settings.json', 'resources/layouts/admin/plugin_settings.json'].forEach(function (rel) {
  var layout = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  expect(layout.indexOf('field_badge_order') !== -1 && layout.indexOf('PDF 정렬 번호') !== -1, rel + ' has PDF 정렬 번호');
  expect(layout.indexOf('/api/plugins/custom-viewer_pdf/admin/settings') !== -1, rel + ' saves via plugin settings API');
  expect(layout.indexOf('/api/admin/plugins/') === -1, rel + ' does not use host admin settings API');
});

var pluginJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'plugin.json'), 'utf8'));
expect(!pluginJson.layouts, 'plugin.json does not declare a host layouts entry');

var phpPlugin = fs.readFileSync(path.join(__dirname, '..', 'plugin.php'), 'utf8');
expect(phpPlugin.indexOf('ViewerPdfSettings::get()') === -1, 'getConfigValues does not call ViewerPdfSettings::get (avoids 503 recursion)');
expect(phpPlugin.indexOf('SettingsLayoutRegistrar::ensure()') === -1, 'plugin boot does not upsert layouts');

var listener = fs.readFileSync(path.join(__dirname, '..', 'src/Listeners/ViewerPdfLayoutListener.php'), 'utf8');
expect(listener.indexOf('core.layout.get') === -1, 'listener does not intercept core.layout.get');
expect(listener.indexOf('removeOrphan') !== -1, 'listener removes orphaned settings layout rows');

var php = fs.readFileSync(path.join(__dirname, '..', 'src/Support/ViewerPdfSettings.php'), 'utf8');
expect(php.indexOf("'badge_order' => 20") !== -1, 'ViewerPdfSettings defaults include badge_order 20');
expect(php.indexOf('clampBadgeOrder') !== -1, 'get/put clamp badge_order');
expect(php.indexOf('$readingG7') !== -1, 'fromG7 is re-entrancy guarded');
expect(php.indexOf('mergeRow($out, self::fromG7())') !== -1 && php.indexOf('mergeRow($out, self::fromG7())') < php.indexOf('candidateFiles()'), 'saved settings file wins over G7 defaults');
