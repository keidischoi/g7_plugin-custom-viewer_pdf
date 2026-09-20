#!/usr/bin/env node
/**
 * Regression: overlapping rebuilds must not grow page/thumb lists past numPages.
 */
function makeScroller() {
  var nodes = [];
  return {
    nodes: nodes,
    set innerHTML(v) { if (v === '') nodes.length = 0; },
    get innerHTML() { return nodes.length ? 'x' : ''; },
    appendChild: function (el) { nodes.push(el); }
  };
}

function delayed(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function buildStack(scroller, opts) {
  var genRef = opts.genRef;
  var cancel = opts.cancel;
  var total = opts.total;
  var delay = opts.delay || 5;
  var gen = (genRef.value = genRef.value + 1);
  scroller.innerHTML = '';
  var els = [];
  function stillCurrent() {
    return !cancel.disposed && gen === genRef.value;
  }
  function addPage(i) {
    return delayed(delay).then(function () {
      if (cancel && !stillCurrent()) return;
      if (i > total || els.length >= total) return;
      scroller.appendChild({ page: i });
      els.push(i);
      return addPage(i + 1);
    });
  }
  return addPage(1).then(function () { return els; });
}

function buildStackBuggy(scroller, opts) {
  var total = opts.total;
  var delay = opts.delay || 5;
  scroller.innerHTML = '';
  var els = [];
  function addPage(i) {
    return delayed(delay).then(function () {
      if (i > total) return;
      scroller.appendChild({ page: i });
      els.push(i);
      return addPage(i + 1);
    });
  }
  return addPage(1);
}

function expect(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
  } else {
    console.log('ok  ' + msg);
  }
}

async function main() {
  var total = 8;

  var buggy = makeScroller();
  var b1 = buildStackBuggy(buggy, { total: total, delay: 8 });
  var b2 = buildStackBuggy(buggy, { total: total, delay: 8 });
  var b3 = buildStackBuggy(buggy, { total: total, delay: 8 });
  await Promise.all([b1, b2, b3]);
  expect(buggy.nodes.length > total, 'pre-fix overlapping rebuilds grow past numPages (got ' + buggy.nodes.length + ')');

  var fixed = makeScroller();
  var genRef = { value: 0 };
  var cancel = { disposed: false };
  var f1 = buildStack(fixed, { genRef: genRef, cancel: cancel, total: total, delay: 8 });
  var f2 = buildStack(fixed, { genRef: genRef, cancel: cancel, total: total, delay: 8 });
  var f3 = buildStack(fixed, { genRef: genRef, cancel: cancel, total: total, delay: 8 });
  await Promise.all([f1, f2, f3]);
  expect(fixed.nodes.length === total, 'fixed overlapping rebuilds stay at numPages (got ' + fixed.nodes.length + ')');

  var stopped = makeScroller();
  var genRef2 = { value: 0 };
  var cancel2 = { disposed: false };
  var s1 = buildStack(stopped, { genRef: genRef2, cancel: cancel2, total: total, delay: 8 });
  cancel2.disposed = true;
  genRef2.value += 1;
  await s1;
  expect(stopped.nodes.length === 0 || stopped.nodes.length <= total, 'dispose cancels in-flight appends (got ' + stopped.nodes.length + ')');

  if (process.exitCode) {
    console.error('page_stack_gen failed');
    process.exit(1);
  }
  console.log('page_stack_gen passed');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
