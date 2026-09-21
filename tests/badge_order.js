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
expect(src.indexOf('if (!changed) return') !== -1, 'stack sort skips when order is unchanged');
expect(src.indexOf('data-cdp-pdf-click-guard') !== -1, 'stack click guard blocks remount during pointer');
expect(src.indexOf('kids.forEach(function (el) { stack.appendChild(el); })') === -1, 'does not unconditionally appendChild every tick');
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

var layoutRel = 'resources/layouts/admin/plugin_settings.json';
var layout = fs.readFileSync(path.join(__dirname, '..', layoutRel), 'utf8');
var parsed = JSON.parse(layout);
expect(layout.indexOf('field_badge_order') !== -1 && layout.indexOf('PDF 정렬 번호') !== -1, layoutRel + ' has PDF 정렬 번호');
expect(layout.indexOf('/api/plugins/custom-viewer_pdf/admin/settings') !== -1, layoutRel + ' saves via plugin settings API');
expect(layout.indexOf('/api/admin/plugins/') === -1, layoutRel + ' does not use host admin settings API');
expect(parsed.layout_name === 'plugin_settings', 'G7 prefixes layout_name with the plugin identifier');
expect(!parsed.init_actions, layoutRel + ' has no leftover snow init_actions');
expect(!fs.existsSync(path.join(__dirname, '..', 'resources/layouts/custom-viewer_pdf.plugin_settings.json')), 'root layouts JSON is not registered by G7');
expect(!fs.existsSync(path.join(__dirname, '..', 'resources/layouts/admin/plugin_settings.schema.json')), 'extra admin schema JSON is not registered as a layout');
expect(!fs.existsSync(path.join(__dirname, '..', 'resources/layouts/admin/custom-viewer_pdf.plugin_settings.json')), 'extra prefixed admin JSON is not registered as a layout');

var pluginJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'plugin.json'), 'utf8'));
expect(pluginJson.version === '0.2.15', 'plugin.json is 0.2.15');
expect(!pluginJson.layouts, 'plugin.json does not declare a host layouts entry');

var phpPlugin = fs.readFileSync(path.join(__dirname, '..', 'plugin.php'), 'utf8');
expect(phpPlugin.indexOf('ViewerPdfSettings::get()') === -1, 'getConfigValues does not call ViewerPdfSettings::get (avoids 503 recursion)');
expect(phpPlugin.indexOf('function getSettingsSchema') !== -1, 'plugin declares getSettingsSchema');
expect(phpPlugin.indexOf('function activate') !== -1 && phpPlugin.indexOf('SettingsLayoutRegistrar::ensure()') !== -1, 'activate re-registers the settings layout');
expect(phpPlugin.indexOf("'0.2.15'") !== -1, 'upgrade 0.2.15 re-registers the settings layout');

var listener = fs.readFileSync(path.join(__dirname, '..', 'src/Listeners/ViewerPdfLayoutListener.php'), 'utf8');
expect(listener.indexOf('core.layout.get') === -1, 'listener does not intercept core.layout.get');
expect(listener.indexOf('removeOrphan') === -1, 'listener does not delete the settings layout row');
expect(listener.indexOf('SettingsLayoutRegistrar::ensure()') !== -1, 'listener upserts settings layout once');

var php = fs.readFileSync(path.join(__dirname, '..', 'src/Support/ViewerPdfSettings.php'), 'utf8');
expect(php.indexOf("'badge_order' => 20") !== -1, 'ViewerPdfSettings defaults include badge_order 20');
expect(php.indexOf('clampBadgeOrder') !== -1, 'get/put clamp badge_order');
expect(php.indexOf('$readingG7') !== -1, 'fromG7 is re-entrancy guarded');
expect(php.indexOf('mergeRow($out, self::fromG7())') !== -1 && php.indexOf('mergeRow($out, self::fromG7())') < php.indexOf('candidateFiles()'), 'saved settings file wins over G7 defaults');

var registrar = fs.readFileSync(path.join(__dirname, '..', 'src/Support/SettingsLayoutRegistrar.php'), 'utf8');
expect(registrar.indexOf('function removeOrphan') === -1, 'registrar no longer deletes the settings layout');
expect(registrar.indexOf("unset($data['name'], $data['init_actions'])") !== -1, 'registrar strips leftover name/init_actions');
expect(registrar.indexOf("BASE_LAYOUT_NAME = 'plugin_settings'") !== -1, 'file layout_name stays plugin_settings');
expect(registrar.indexOf("LAYOUT_NAME = 'custom-viewer_pdf.plugin_settings'") !== -1, 'DB name is identifier.plugin_settings');

function orderWouldMove(order, ranks) {
  var ranked = order.map(function (el, i) { return { el: el, rank: ranks[el], i: i }; });
  ranked.sort(function (a, b) { return a.rank - b.rank || a.i - b.i; });
  for (var i = 0; i < ranked.length; i++) {
    if (ranked[i].el !== order[i]) return true;
  }
  return false;
}
expect(!orderWouldMove(['drawings', 'pdf', '3d'], { drawings: 10, pdf: 20, '3d': 30 }), 'already-sorted stack is unchanged');
expect(orderWouldMove(['pdf', 'drawings', '3d'], { drawings: 10, pdf: 20, '3d': 30 }), 'unsorted stack is changed');
