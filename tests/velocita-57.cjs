// PROMPT 57: panels hold the page (also on iPhone) and give the position back; the room at the end of the page goes
// only when nothing on screen would move; the search box of the lists is a label; the hero pictures first in the
// queue; statistics and the occasional boxes after the page is idle; the welcome screen in its own chunk.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body><main style="height:3000px"></main></body>', { url: 'https://ilgrimorio.app/' });
global.window = dom.window; global.document = dom.window.document;
let scrollY = 420; const scrolled = [];
Object.defineProperty(dom.window, 'scrollY', { configurable: true, get: () => scrollY });
dom.window.scrollTo = (x, y) => { scrolled.push(y); scrollY = y; };

const { lockScroll, scrollLocks } = require('../lib/scroll-lock.ts');
const body = document.body;
const unlockA = lockScroll();
assert.equal(body.style.position, 'fixed', 'the body is fixed (overflow: hidden alone is ignored by iOS for the page)');
assert.equal(body.style.top, '-420px', 'at the position it had');
assert.equal(body.style.width, '100%');
assert.equal(scrollLocks(), 1);
const unlockB = lockScroll();
assert.equal(scrollLocks(), 2, 'a sheet over the search: two locks');
unlockB();
assert.equal(body.style.position, 'fixed', 'the first panel still holds the page');
unlockB();
assert.equal(scrollLocks(), 1, 'a second release of the same lock counts once');
unlockA();
assert.equal(body.style.position, '', 'the body as before');
assert.equal(body.style.top, '');
assert.deepEqual(scrolled, [420], 'the position put back exactly');
assert.equal(scrollLocks(), 0);

// The room at the end of the page (M5).
const { releaseWhenAway } = require('../lib/page-room.ts');
let height = 3000, inner = 844;
Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, get: () => height });
Object.defineProperty(dom.window, 'innerHeight', { configurable: true, get: () => inner });
let released = 0;
scrollY = 3000 - 844; // at the very end
const flush = releaseWhenAway(() => released++);
assert.equal(released, 0, 'at the end of the page the room stays (a jump otherwise)');
scrollY = 3000 - 844 - 100; dom.window.dispatchEvent(new dom.window.Event('scroll'));
assert.equal(released, 0, '100 px up: still too close (the room is 60 px tall)');
scrollY = 3000 - 844 - 300; dom.window.dispatchEvent(new dom.window.Event('scroll'));
assert.equal(released, 1, 'far enough: released once');
dom.window.dispatchEvent(new dom.window.Event('scroll')); flush();
assert.equal(released, 1, 'never twice');
scrollY = 500; releaseWhenAway(() => released++);
assert.equal(released, 2, 'away from the end: released at once');
scrollY = 2156; const flush2 = releaseWhenAway(() => released++);
assert.equal(released, 2); flush2(); assert.equal(released, 3, 'the page changes: flushed');
height = 600; scrollY = 0; releaseWhenAway(() => released++);
assert.equal(released, 4, 'a page that fits the screen cannot jump: released at once');

// Where it is used.
const read = file => fs.readFileSync(file, 'utf8');
for (const file of ['components/search/search-panel.tsx', 'components/edition/first-launch-screen.tsx', 'components/edition/edition-pill.tsx']) {
  assert.ok(read(file).includes('lockScroll()'), `${file} holds the page with lockScroll`);
  assert.ok(!read(file).includes('style.overflow'), `${file}: no more overflow on the body`);
}
assert.ok(read('components/analytics-provider.tsx').includes('releaseWhenAway(() => { delete document.documentElement.dataset.statisticsRoom;'), 'the statistics room goes only away from the end');
assert.ok(read('components/home/rating-box.tsx').includes('releaseWhenAway(') && read('components/home/rating-box.tsx').includes('data-rating="spazio"'), 'the question leaves its room while the reader is at the end');
// M3: the whole search box opens the keyboard.
assert.match(read('components/catalog-ui.tsx'), /<label className="flex min-h-12 min-w-0 flex-1 cursor-text[^"]*" data-list-search-box="">/);
// Speed: the hero pictures first; late scripts; the welcome screen apart.
assert.ok(/priority\n\s+fetchPriority="high"/.test(read('app/page.tsx')), 'Home hero fetchPriority high');
assert.ok(/priority\n\s+fetchPriority="high"/.test(read('app/spell/[id]/page.tsx')), 'spell hero fetchPriority high');
assert.ok(read('app/layout.tsx').includes('<LateExtras vercel={process.env.VERCEL === "1"} />') && !read('app/layout.tsx').includes('<AnalyticsProvider />'), 'statistics after idle');
assert.ok(read('components/edition/first-launch.tsx').includes('dynamic(() => import("@/components/edition/first-launch-screen")'), 'welcome screen in its own chunk');
assert.ok(read('components/home/home-extras.tsx').includes('<LateBoxes support={support} />'), 'question and support card after idle');
// A2: the pages saved for the offline use (the regex itself is exercised in tests/service-worker.cjs).
const sw = read('lib/sw/service-worker.js');
for (const part of ['talenti(?:\\/[^/]+)?$', 'padronanze|proprieta', 'creati-da-voi|del-grimorio|creature-originali', 'installa$']) assert.ok(sw.includes(part), `service worker saves ${part}`);
console.log('PROMPT 57: panels hold the page and give it back, room released only away from the end, search box as label, hero first, late scripts, welcome screen apart, offline pages.');

// Statistics after idle: an event fired before the provider mounts (a share in the first second) is kept and replayed.
{
  const late = fs.readFileSync('components/layout/late-extras.tsx', 'utf8');
  assert.ok(late.includes('window.addEventListener("grimorio:analytics-event", keep)') && late.includes('"grimorio:analytics-ready"'), 'early events kept until the provider listens');
  assert.ok(fs.readFileSync('components/analytics-provider.tsx', 'utf8').includes('window.dispatchEvent(new Event("grimorio:analytics-ready"))'), 'the provider says when it listens');
  console.log('PROMPT 57: early statistics events kept and replayed.');
}
