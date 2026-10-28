/* Service worker of Il Grimorio.App. Served by app/sw.js/route.ts, which defines
 * VERSION (one per deployment) before this code.
 *
 * - Program files (/_next/static, optimized images, icons): from the phone's cache;
 *   their names change with every version, so they can never be stale.
 * - Public pages: network first. Only without network, or after 3 seconds without
 *   an answer, the last saved copy is shown, and the page displays a notice.
 * - The search index (/ricerca-indice.json): network first too, saved for the search offline.
 * - Hidden sections (/admin/sezioni): every page sends their addresses; their saved copies are
 *   deleted and never shown, and a page answered 404 online loses its saved copy too. Sections with
 *   hidden parts (an edition, a tab, a block) come with a signature of those parts: when it changes,
 *   the copies saved before are deleted, so a part hidden since then never comes back offline.
 * - Admin notifications (/admin/notifiche): a «push» shows the notification, a tap opens its address.
 *   A push carrying «badge» also sets the number on the app icon (0 removes it), with the app closed too.
 *   Only the devices the administrator subscribed receive them; nothing else changes for the public.
 * - Never handled: admin area, character pages, account, API, Server Actions,
 *   Next.js navigation data (RSC). They always go to the network.
 */
/* global VERSION */
const PAGES = `grimorio-pages-${VERSION}`;
const STATIC = "grimorio-static";
const STATIC_LIMIT = 400;
const NETWORK_TIMEOUT = 3000;
const PUBLIC_PAGE = /^\/(?:$|grimorio$|bestiario$|preferiti$|fonti$|info$|termini$|sostieni$|privacy$|segnala$|compendio(?:\/condizioni)?$|classi(?:\/[^/]+)?$|avanzamento$|oggetti-magici(?:\/[^/]+)?$|spell\/[^/]+$|mostro\/[^/]+$|manuale\/condizioni-[^/]+$|regole\/[^/]+$|equipaggiamento(?:\/(?:armi|armature|avventura|strumenti)(?:\/[^/]+)?)?$)/;
const SEARCH_INDEX = "/ricerca-indice.json";
const STATIC_FILE = /^\/(?:_next\/static\/|_next\/image|damage-icons\/|icon|hero-|manifest\.webmanifest$)/;
// Files of the app with the same name in every version (icons, manifest): saved again after a new version, so an
// installed app gets a new logo.
const SAME_NAME_FILE = /^\/(?:icon[^/]*\.(?:png|webp)$|manifest\.webmanifest$)/;

// Addresses of the hidden sections (lib/public-sections.ts), sent by every page and kept for offline use.
const SETTINGS = "grimorio-settings";
const HIDDEN_KEY = "/__sezioni-nascoste";
const PARTS_KEY = "/__parti-nascoste";
let hiddenPaths = null;

async function loadHidden() {
  if (hiddenPaths) return hiddenPaths;
  try {
    const saved = await (await caches.open(SETTINGS)).match(HIDDEN_KEY);
    hiddenPaths = saved ? await saved.json() : [];
  } catch {
    hiddenPaths = [];
  }
  return hiddenPaths;
}

// Same rule as sectionOfPath(): "/spell/" and "/manuale/condizioni-" are prefixes, "/classi" covers its subpages.
function isHidden(pathname, paths) {
  return paths.some(path => path.endsWith("/") || path.endsWith("-")
    ? pathname.startsWith(path) && pathname.length > path.length
    : pathname === path || pathname.startsWith(`${path}/`));
}

async function saveHidden(paths) {
  hiddenPaths = paths;
  await (await caches.open(SETTINGS)).put(HIDDEN_KEY, new Response(JSON.stringify(paths), { headers: { "Content-Type": "application/json" } }));
  if (!paths.length) return;
  const cache = await caches.open(PAGES);
  for (const request of await cache.keys()) {
    if (isHidden(new URL(request.url).pathname, paths)) await cache.delete(request);
  }
}

// { "<section address>": "<hidden parts>" } of the last page loaded online.
async function saveParts(list) {
  const settings = await caches.open(SETTINGS);
  const saved = await settings.match(PARTS_KEY);
  const before = saved ? await saved.json() : {};
  const after = Object.fromEntries(list.map(item => [item.path, item.signature]));
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(path => before[path] !== after[path]);
  await settings.put(PARTS_KEY, new Response(JSON.stringify(after), { headers: { "Content-Type": "application/json" } }));
  if (!changed.length) return;
  const cache = await caches.open(PAGES);
  for (const request of await cache.keys()) {
    if (isHidden(new URL(request.url).pathname, changed)) await cache.delete(request);
  }
}

// Pages just served from the saved copy, by address: the page asks and shows a notice.
const savedCopies = new Map();
const NOTICE_WINDOW = 60000;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES);
    // The main sections of the bottom navigation are ready offline after the first visit.
    await Promise.all(["/", "/grimorio", "/bestiario", "/compendio", "/preferiti", SEARCH_INDEX].map(async path => {
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
    const files = await caches.open(STATIC);
    for (const key of await files.keys()) {
      if (SAME_NAME_FILE.test(new URL(key.url).pathname)) await files.delete(key);
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

  if ((request.mode === "navigate" && PUBLIC_PAGE.test(url.pathname)) || url.pathname === SEARCH_INDEX) {
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
  } else if (data.type === "hidden-sections" && Array.isArray(data.paths)) {
    const parts = Array.isArray(data.parts) ? data.parts.filter(item => item && typeof item.path === "string" && item.path.startsWith("/") && typeof item.signature === "string").slice(0, 100) : [];
    event.waitUntil(saveHidden(data.paths.filter(path => typeof path === "string" && path.startsWith("/")).slice(0, 100)).then(() => saveParts(parts)));
  } else if (data.type === "cache-files" && Array.isArray(data.urls)) {
    // Files the first page loaded before the service worker was active.
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC);
      for (const href of data.urls.slice(0, 200)) {
        const url = new URL(href, self.location.origin);
        if (url.origin !== self.location.origin || !STATIC_FILE.test(url.pathname)) continue;
        // Resized images depend on the Accept header of the browser (Vary: Accept): fetched from here they
        // came back as a larger JPEG that the page never matched. They are saved at their next use instead.
        if (url.pathname.startsWith("/_next/image")) continue;
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

self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "Il Grimorio.App";
  // Only addresses of this site: a notification never opens another site.
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/admin";
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url },
    }),
    appBadge(data.badge),
  ]));
});

// The number on the app icon (same rule as lib/app-badge.ts): a device without badges does nothing.
async function appBadge(count) {
  if (!Number.isInteger(count) || count < 0) return;
  const nav = self.navigator;
  try {
    if (count > 0 && nav && typeof nav.setAppBadge === "function") await nav.setAppBadge(count);
    else if (count === 0 && nav && typeof nav.clearAppBadge === "function") await nav.clearAppBadge();
  } catch {
    // not allowed or not supported: the notification is shown anyway
  }
}

// The address opens in a window of the app already open, else in a new one. An expired admin session
// shows the login there, then the same page (the address does not change).
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        await client.focus();
        if (client.navigate) await client.navigate(url);
        return;
      } catch {
        // not controlled by this worker: open a new window below
      }
    }
    await self.clients.openWindow(url);
  })());
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
  const hidden = isHidden(key, await loadHidden());
  const network = fetch(new Request(event.request, { cache: "no-cache" })).then(async response => {
    if (response.ok && response.type === "basic" && !hidden) await cache.put(key, stamped(response.clone(), Date.now()));
    // A page of a hidden section answers 404: its old copy must not come back offline.
    else if (response.status === 404 || hidden) await cache.delete(key);
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
  const saved = hidden ? undefined : await cache.match(key);
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
