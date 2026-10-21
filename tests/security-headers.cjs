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
 const csp=headers['Content-Security-Policy'];
 const directive=name=>csp.split('; ').find(d=>d.split(' ')[0]===name)?.split(' ').slice(1);
 assert.deepEqual(directive('frame-ancestors'),["'none'"]);
 assert.deepEqual(directive('default-src'),["'self'"]);
 assert.deepEqual(directive('object-src'),["'none'"]);
 assert.deepEqual(directive('base-uri'),["'self'"]);
 assert.deepEqual(directive('form-action'),["'self'"]);
 assert.deepEqual(directive('font-src'),["'self'"],'fonts are self-hosted by next/font');
 assert.deepEqual(directive('connect-src'),["'self'"],'the browser talks only to this site (statistics go through /api/analytics)');
 assert.deepEqual(directive('frame-src'),["'none'"]);
 for(const name of ['script-src','style-src','img-src','connect-src','font-src'])
  assert.ok(directive(name).every(v=>v.startsWith("'")||v==='data:'||v==='blob:'),`${name}: no other origin in production`);
 assert.ok(!directive('script-src').includes("'unsafe-eval'"),'no eval in production');
 assert.equal(headers['Cross-Origin-Opener-Policy'],'same-origin');
 const {contentSecurityPolicy,securityHeaders}=await import(pathToFileURL(path.resolve('lib/security-headers.mjs')).href);
 // Extra origins only where needed: Turnstile when configured, the Vercel toolbar on previews, eval in development.
 assert.match(contentSecurityPolicy({turnstile:true}),/script-src [^;]*https:\/\/challenges\.cloudflare\.com[^;]*; .*frame-src https:\/\/challenges\.cloudflare\.com/);
 assert.match(contentSecurityPolicy({preview:true}),/script-src [^;]*https:\/\/vercel\.live/);
 assert.doesNotMatch(contentSecurityPolicy({}),/vercel|cloudflare/);
 assert.match(contentSecurityPolicy({development:true}),/'unsafe-eval'/);
 // Emergency switch: the same policy, reported instead of enforced.
 const reported=Object.fromEntries(securityHeaders({GRIMORIO_CSP:'report-only'}).map(({key,value})=>[key,value]));
 assert.equal(reported['Content-Security-Policy'],undefined);
 assert.match(reported['Content-Security-Policy-Report-Only'],/default-src 'self'/);
 assert.doesNotMatch(reported['Content-Security-Policy-Report-Only'],/upgrade-insecure-requests/);
 assert.equal(headers['X-Content-Type-Options'],'nosniff');
 assert.equal(headers['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(headers['Strict-Transport-Security'],/max-age=\d+/);
 assert.equal(headers['Permissions-Policy'],'camera=(), microphone=(), geolocation=()');
 // Images stay WebP: AVIF was withdrawn after the iPhone regression of 18 October 2026.
 assert.deepEqual(config.images.formats,['image/webp']);
 for(const page of ['app/admin/page.tsx','app/admin/statistiche/page.tsx','app/admin/segnalazioni/page.tsx','app/admin/segnalazioni/[id]/page.tsx','app/admin/incantesimi/page.tsx','app/admin/mostri/page.tsx','app/admin/registro/page.tsx','app/admin/contenuti/[sezione]/page.tsx','app/admin/contenuti/[sezione]/[id]/page.tsx','app/personaggi/page.tsx','app/account/page.tsx']){
  assert.match(fs.readFileSync(page,'utf8'),/robots\s*:\s*\{\s*index\s*:\s*false\s*,\s*follow\s*:\s*false\s*\}/,`${page} is not indexed by search engines`);
 }
 console.log('Security headers: full Content-Security-Policy (own origin only, extra origins only for Turnstile/preview/development, report-only switch), framing denied, existing headers kept, private pages marked noindex.');
})().catch(error=>{console.error(error);process.exit(1);});
