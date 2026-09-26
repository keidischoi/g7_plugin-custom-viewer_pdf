#!/usr/bin/env node
/**
 * Regression: switching files in the 파일 목록 rail must show the picked file.
 * A slower earlier load (file 1 still downloading) must not replace file 2 when it finishes.
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
var start = src.indexOf('function openFile(idx)');
var end = src.indexOf('function openModal(startIdx)');
var body = start !== -1 && end > start ? src.slice(start, end) : '';

expect(!!body, 'openFile exists');
expect(/var seq = \(state\.loadSeq = \(state\.loadSeq \|\| 0\) \+ 1\);/.test(body), 'openFile takes a load sequence token');
expect(/if \(!isLatest\(\)\) \{\s*try \{ doc\.destroy\(\); \} catch/.test(body), 'stale document is dropped, not shown');
expect(/\}\)\.catch\(function \(\) \{\s*if \(!isLatest\(\)\) return;/.test(body), 'stale failure does not show iframe fallback');
expect(body.indexOf('showSwitchLoading(') !== -1, 'old file is cleared while the new one loads');
if (!process.exitCode) console.log('file_switch_seq passed');
