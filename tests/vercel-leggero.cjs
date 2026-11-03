// PROMPT 55: Vercel lighter. Only main is deployed by Git; the public pages are static until an admin save refreshes
// them (no timed regeneration: every regeneration is an ISR write); a homebrew save no longer refreshes the whole site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.deepEqual(vercel.git, {deploymentEnabled: {'**': false, main: true}}, 'only main gets an automatic deployment (branches with «/» too)');
assert.deepEqual(vercel.crons, [{path: '/api/analytics/maintenance', schedule: '0 4 * * *'}], 'the daily maintenance stays');

function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
// No timed regeneration of a public page; robots and sitemap at most once a day.
for (const file of files('app')) {
  const match = fs.readFileSync(file, 'utf8').match(/export const revalidate = ([^;]+);/);
  if (!match) continue;
  assert.ok(['app/robots.ts', 'app/sitemap.ts'].includes(file) && Number(match[1]) >= 86400, `${file}: revalidate ${match[1]}`);
}
// The cached data read by every page carries no timer: a timed value would lower the revalidate time of the pages.
for (const [file, tag] of [['lib/section-visibility.ts', 'SECTIONS_TAG'], ['lib/content-overrides.ts', 'OVERRIDES_TAG'], ['lib/spell-index.ts', '"spells"'], ['lib/monster-index.ts', '"monsters"']]) {
  assert.ok(fs.readFileSync(file, 'utf8').includes(`{ tags: [${tag}], revalidate: false }`), file);
}
for (const file of files('lib').concat(files('app'))) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/revalidate: (\d+)/g)) {
    assert.ok(file === 'lib/isr-fallback.ts' && match[1] === '60', `${file}: a timed cache (revalidate: ${match[1]})`);
  }
}
// A page built with the fallback values (database not readable) lives a minute, never until the next save.
for (const file of ['lib/section-visibility.ts', 'lib/content-overrides.ts', 'app/page.tsx', 'app/classi/[id]/page.tsx', 'app/ricerca-indice.json/route.ts']) {
  assert.ok(fs.readFileSync(file, 'utf8').includes('shortLivedFallback()'), file);
}
// Homebrew: lists, search, sitemap and its own card; never the whole site.
const homebrew = fs.readFileSync('app/actions/admin-homebrew.ts', 'utf8');
assert.ok(!homebrew.includes('revalidatePath("/", "layout")'), 'homebrew: not the whole site');
assert.ok(homebrew.includes('revalidatePath(`/mostro/${id}`)') && homebrew.includes('updateTag("monsters")'));
assert.equal((homebrew.match(/refresh\(\)/g) || []).length, 0, 'every refresh names its card');
// The search index stays a static file (a route handler without a revalidate time is dynamic otherwise).
assert.ok(fs.readFileSync('app/ricerca-indice.json/route.ts', 'utf8').includes('export const dynamic = "force-static";'));
// No server source maps in the deployment.
assert.ok(fs.readFileSync('next.config.mjs', 'utf8').includes('turbopackSourceMaps: false'));

console.log('Vercel leggero: only main deployed, no timed ISR regeneration, fallback pages short-lived, homebrew refresh narrowed, no source maps.');
