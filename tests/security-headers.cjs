const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
 const config=(await import(pathToFileURL(path.resolve('next.config.mjs')).href)).default;
 const rules=await config.headers();
 const all=rules.find(rule=>rule.source==='/:path*');
 assert.ok(all,'security headers apply to every page');
 const headers=Object.fromEntries(all.headers.map(({key,value})=>[key,value]));
 assert.equal(headers['X-Frame-Options'],'DENY','no site may frame the app');
 assert.equal(headers['Content-Security-Policy'],"frame-ancestors 'none'");
 assert.equal(headers['X-Content-Type-Options'],'nosniff');
 assert.equal(headers['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(headers['Strict-Transport-Security'],/max-age=\d+/);
 assert.equal(headers['Permissions-Policy'],'camera=(), microphone=(), geolocation=()');
 // The CSP only restricts framing: scripts, styles and images keep working as before.
 assert.doesNotMatch(headers['Content-Security-Policy'],/script-src|default-src|style-src|img-src/);
 // Images stay WebP: AVIF was withdrawn after the iPhone regression of 18 October 2026.
 assert.deepEqual(config.images.formats,['image/webp']);
 for(const page of ['app/admin/page.tsx','app/admin/statistiche/page.tsx','app/personaggi/page.tsx','app/account/page.tsx']){
  assert.match(fs.readFileSync(page,'utf8'),/robots\s*:\s*\{\s*index\s*:\s*false\s*,\s*follow\s*:\s*false\s*\}/,`${page} is not indexed by search engines`);
 }
 console.log('Security headers: framing denied on every page, existing headers kept, private pages marked noindex.');
})().catch(error=>{console.error(error);process.exit(1);});
