#!/usr/bin/env node
/**
 * Regression: zoom in/out must keep the page being read, not jump back to page 1.
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
var sched = (src.match(/function scheduleRebuild\(\) \{[\s\S]*?\n  \}\n/) || [''])[0];
var rescale = (src.match(/function rescaleStack\(\) \{[\s\S]*?\n  \}\n/) || [''])[0];

expect(sched.indexOf('rescaleStack()') !== -1, 'zoom rescales the existing stack');
expect(!!rescale, 'rescaleStack exists');
expect(rescale.indexOf('innerHTML') === -1, 'rescale does not clear the scroller (which resets scrollTop to 0)');
expect(rescale.indexOf('captureScrollAnchor(') !== -1, 'rescale captures the reading position first');
expect(/scroller\.scrollTop = slotTopIn\(scroller, target\) \+ anchor\.frac/.test(rescale), 'rescale restores the reading position');
expect(src.indexOf("target.scrollIntoView({ block: 'start' })") === -1, 'stack build sets scrollTop directly');
if (!process.exitCode) console.log('zoom_keeps_page passed');
