const assert = require('node:assert/strict');
const fs = require('node:fs');
const { bottomBarShift } = require('../lib/viewport-anchor.ts');

// PROMPT 23: the bottom bar follows the bottom of what is visible when iOS leaves the visible area shifted.
const at = (visualTop, visualHeight = 844, editing = false) => bottomBarShift({ layoutHeight: 844, visualHeight, visualTop, editing });
assert.equal(at(0), 0, 'nothing shifted: the bar does not move (every other browser)');
assert.equal(at(0.4), 0, 'less than a pixel: nothing');
assert.equal(at(120), 120, 'the visible area 120 px below the layout viewport: the bar follows it down');
assert.equal(at(-80), -80, 'above it: up');
assert.equal(at(0, 810), -34, 'the visible area ends 34 px higher (home indicator band): the bar stays in sight');
assert.equal(at(300, 500, true), 0, 'keyboard open (a field is being edited): as today');
assert.equal(at(100, 300), 0, 'pinch-zoom: the bar stays put');
assert.equal(bottomBarShift({ layoutHeight: 0, visualHeight: 0, visualTop: 0, editing: false }), 0);

// The bar keeps its look: no new classes, only the measured move; never on a computer (lg:hidden, as before).
const nav = fs.readFileSync('components/bottom-nav.tsx', 'utf8');
assert.match(nav, /className="fixed inset-x-0 bottom-0 z-50 mx-auto h-\[calc\(80px\+env\(safe-area-inset-bottom,0px\)\)\][^"]* lg:hidden"/);
assert.match(nav, /window\.visualViewport/);
assert.doesNotMatch(nav, /(?:display|visibility|opacity)\s*=\s*/, 'never hidden and shown again');
console.log('Bottom bar: follows the visible area when iOS leaves it shifted, still as today with the keyboard, pinch-zoom or nothing shifted; look and computer unchanged.');
