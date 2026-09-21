#!/usr/bin/env node
/**
 * Regression: PDF stage/scroller chrome must follow themePalette, not a hardcoded black fill.
 */
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

expect(!/stage\.style\.cssText = '[^']*background:#111/.test(src), 'stage style is not hardcoded #111');
expect(src.indexOf("stage.setAttribute('data-cdp-pdf-stage', '1')") !== -1, 'stage is marked for tests');
expect(src.indexOf("background:' + pal.canvasBg + ';display:flex;min-height:0;position:relative") !== -1, 'stage uses pal.canvasBg');
expect(src.indexOf("align-items:center;background:' + pal.canvasBg + ';") !== -1, 'scroller uses pal.canvasBg');
expect(src.indexOf('function isDarkTheme()') !== -1, 'isDarkTheme exists');
expect(src.indexOf("data-theme") !== -1 && src.indexOf('prefers-color-scheme') !== -1, 'theme detection covers data-theme and prefers-color-scheme');
expect(src.indexOf('chromeBg:') !== -1 && src.indexOf('fileThumbBg:') !== -1, 'palette includes chrome tokens');
expect(src.indexOf("background:' + pal.chromeBg") !== -1, 'page nav uses themed chrome');
expect(src.indexOf("background:' + pal.chromeSolid") !== -1, 'zoom box uses themed chrome');
expect(src.indexOf("background:' + pal.thumbRailBg") !== -1, 'page thumbs use themed rail');
expect(src.indexOf('theme: { isDark: isDarkTheme, palette: themePalette }') !== -1, 'theme helpers are exported');
expect(!/bumpRenderGens\(\);\s*showIframeFallback\(url\);/.test(src), 'native iframe is not shown before pdf.js');
expect(src.indexOf('showIframeFallback(url);') !== -1, 'iframe fallback still exists for pdf.js failure');

if (process.exitCode) {
  console.error('theme_stage_bg failed');
  process.exit(1);
}
console.log('theme_stage_bg passed');
