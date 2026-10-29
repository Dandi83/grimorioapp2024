const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bottomBarShift } = require('../lib/viewport-anchor.ts');

// PROMPT 23, 27: the bottom bar is measured only when the visible area changes size (the keyboard closing), only down
// to the bottom edge, never while the page bounces; the page does not bounce (overscroll-behavior-y: none).
const at = (visualTop, visualHeight = 844, { editing = false, scrollY = 500, maxScroll = 4000 } = {}) => bottomBarShift({ layoutHeight: 844, visualHeight, visualTop, editing, scrollY, maxScroll });
assert.equal(at(0), 0, 'nothing shifted: the bar does not move (every other browser)');
assert.equal(at(0.4), 0, 'less than a pixel: nothing');
assert.equal(at(120), 120, 'the visible area 120 px below the layout viewport: the bar goes down to the bottom edge');
assert.equal(at(-80), 0, 'never up');
assert.equal(at(0, 810), 0, 'the visible area ends higher: the bar stays (never up)');
assert.equal(at(300, 500, { editing: true }), 0, 'keyboard open (a field is being edited): as today');
assert.equal(at(100, 300), 0, 'pinch-zoom: the bar stays put');
assert.equal(at(120, 844, { scrollY: -60 }), null, 'bouncing over the top: nothing measured, the bar keeps where it is');
assert.equal(at(120, 844, { scrollY: 4100 }), null, 'bouncing past the bottom: nothing measured');
assert.equal(at(120, 844, { scrollY: 0, maxScroll: 0 }), 120, 'a short page at the top: measured');
assert.equal(bottomBarShift({ layoutHeight: 0, visualHeight: 0, visualTop: 0, editing: false, scrollY: 0, maxScroll: 0 }), 0);

// The bar keeps its look; it listens to the size of the visible area only, never to the scroll; never on a computer.
const nav = fs.readFileSync('components/bottom-nav.tsx', 'utf8');
assert.match(nav, /className="fixed inset-x-0 bottom-0 z-50 mx-auto h-\[calc\(80px\+env\(safe-area-inset-bottom,0px\)\)\][^"]* lg:hidden"/);
assert.match(nav, /viewport\.addEventListener\("resize", schedule\)/);
assert.doesNotMatch(nav, /addEventListener\("scroll"/, 'never on scroll');
assert.doesNotMatch(nav, /style\.transition|transition-(?:transform|all)|\btransition\b(?!-colors)/, 'no animated move');
assert.doesNotMatch(nav, /(?:display|visibility|opacity)\s*=\s*/, 'never hidden and shown again');
const css = fs.readFileSync('app/globals.css', 'utf8');
assert.match(css, /html \{[^}]*overscroll-behavior-y: none;/);
assert.match(css, /body \{[^}]*overscroll-behavior-y: none;/);
console.log('Bottom bar: no bounce of the page, measured only when the visible area changes size, only down, never while scrolling or bouncing; look and computer unchanged.');
