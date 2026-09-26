#!/usr/bin/env node
/**
 * Regression: preview_url built with the proxy's internal port (https://host:8482/api/...)
 * must be requested on the page origin, otherwise fetch/pdf.js fail cross-origin.
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
var m = src.match(/function sameOriginUrl\(u\) \{[\s\S]*?\n  \}\n/);
expect(!!m, 'sameOriginUrl exists');
var location = { origin: 'https://3ds.example.com', hostname: '3ds.example.com' };
var sameOriginUrl = new Function('location', 'URL', m[0] + 'return sameOriginUrl;')(location, URL);

expect(sameOriginUrl('https://3ds.example.com:8482/api/x/preview/9') === 'https://3ds.example.com/api/x/preview/9', 'internal port is mapped to the page origin');
expect(sameOriginUrl('http://3ds.example.com/api/x?file=1') === 'https://3ds.example.com/api/x?file=1', 'http on same host is mapped to https page origin');
expect(sameOriginUrl('https://cdn.other.com/a.pdf') === 'https://cdn.other.com/a.pdf', 'other hosts are left alone');
expect(sameOriginUrl('/api/x/preview/1') === '/api/x/preview/1', 'relative URLs are left alone');
expect(/return sameOriginUrl\(f\.preview_url/.test(src), 'pickUrl uses sameOriginUrl');
if (!process.exitCode) console.log('same_origin_url passed');
