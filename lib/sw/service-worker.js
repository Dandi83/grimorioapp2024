/* Service worker of Il Grimorio.App. Served by app/sw.js/route.ts, which defines
 * VERSION (one per deployment) before this code.
 *
 * - Program files (/_next/static, optimized images, icons): from the phone's cache;
 *   their names change with every version, so they can never be stale.
 * - Public pages: network first. Only without network, or after 3 seconds without
 *   an answer, the last saved copy is shown, and the page displays a notice.
 * - Never handled: admin area, character pages, account, API, Server Actions,
 *   Next.js navigation data (RSC). They always go to the network.
 */
/* global VERSION */
const PAGES = `grimorio-pages-${VERSION}`;
const STATIC = "grimorio-static";
const STATIC_LIMIT = 400;
const NETWORK_TIMEOUT = 3000;
const PUBLIC_PAGE = /^\/(?:$|grimorio$|bestiario$|preferiti$|fonti$|privacy$|compendio(?:\/condizioni)?$|avanzamento$|oggetti-magici(?:\/[^/]+)?$|spell\/[^/]+$|mostro\/[^/]+$|manuale\/condizioni-[^/]+$|equipaggiamento(?:\/(?:armi|armature|avventura|strumenti)(?:\/[^/]+)?)?$)/;
const STATIC_FILE = /^\/(?:_next\/static\/|_next\/image|damage-icons\/|icon|hero-|manifest\.webmanifest$)/;

// Pages just served from the saved copy, by address: the page asks and shows a notice.
const savedCopies = new Map();
const NOTICE_WINDOW = 60000;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES);
    // The main sections of the bottom navigation are ready offline after the first visit.
    await Promise.all(["/", "/grimorio", "/bestiario", "/compendio", "/preferiti"].map(async path => {
      try {
        const response = await fetch(path, { credentials: "same-origin" });
        if (response.ok) await cache.put(path, stamped(response, Date.now()));
      } catch {
        // offline during install: the page is saved at the next visit
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Saved pages of previous versions may reference files that no longer exist.
    for (const key of await caches.keys()) {
      if (key.startsWith("grimorio-pages-") && key !== PAGES) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate" && PUBLIC_PAGE.test(url.pathname)) {
    event.respondWith(networkFirst(event, url));
  } else if (STATIC_FILE.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "saved-copy?" && event.ports[0]) {
    const served = savedCopies.get(data.path);
    savedCopies.delete(data.path);
    const recent = served && Date.now() - served.at < NOTICE_WINDOW;
    event.ports[0].postMessage({ savedAt: recent ? served.savedAt : null });
  } else if (data.type === "cache-files" && Array.isArray(data.urls)) {
    // Files the first page loaded before the service worker was active.
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC);
      for (const href of data.urls.slice(0, 200)) {
        const url = new URL(href, self.location.origin);
        if (url.origin !== self.location.origin || !STATIC_FILE.test(url.pathname)) continue;
        if (await cache.match(url.href)) continue;
        try {
          const response = await fetch(url.href);
          if (response.ok) await cache.put(url.href, response);
        } catch {
          // offline: it will be cached when used
        }
      }
      await trim(cache);
    })());
  }
});

function stamped(response, time) {
  const headers = new Headers(response.headers);
  headers.set("x-grimorio-saved-at", String(time));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function networkFirst(event, url) {
  const cache = await caches.open(PAGES);
  const key = url.pathname;
  // "no-cache": the browser's own HTTP cache may not answer for the network,
  // otherwise an old page could be shown offline without the notice.
  const network = fetch(new Request(event.request, { cache: "no-cache" })).then(async response => {
    if (response.ok && response.type === "basic") await cache.put(key, stamped(response.clone(), Date.now()));
    return response;
  });
  // Keep saving the fresh page even if the saved copy was shown first.
  event.waitUntil(network.catch(() => undefined));
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT, "timeout"));
  try {
    const first = await Promise.race([network, timeout]);
    if (first !== "timeout") return first;
  } catch {
    // no network: use the saved copy below
  }
  const saved = await cache.match(key);
  if (saved) {
    const savedAt = Number(saved.headers.get("x-grimorio-saved-at")) || Date.now();
    savedCopies.set(key, { savedAt, at: Date.now() });
    return markedCopy(saved, savedAt);
  }
  try {
    return await network;
  } catch {
    return offlinePage();
  }
}

// The saved date also travels inside the page: the browser (iPhone above all) may stop
// this worker before the page asks, and the answer kept in memory would be lost.
async function markedCopy(response, savedAt) {
  if (!(response.headers.get("Content-Type") || "").includes("text/html")) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  const marked = html.replace(/<head(\s[^>]*)?>/i, head => `${head}<meta name="grimorio-saved-at" content="${savedAt}">`);
  return new Response(marked, { status: response.status, statusText: response.statusText, headers });
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT))) await cache.delete(key);
}

function offlinePage() {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — Il Grimorio.App</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#f0ebe1;font-family:Georgia,serif;text-align:center;padding:24px">
<div><p style="font-size:28px;margin:0 0 12px">Sei offline</p><p style="color:#a8a29e;font-family:system-ui,sans-serif;line-height:1.5">Questa pagina non è ancora salvata sul telefono.<br>Le pagine già aperte con la connessione sono disponibili anche offline.</p>
<p><a href="/" style="color:#d4a64a">Torna alla Home</a></p></div></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
