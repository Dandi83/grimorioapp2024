import { readFileSync } from "node:fs";
import path from "node:path";

import { serviceWorkerEnabled } from "@/lib/service-worker-config";

// Built once per deployment: the version changes with every commit, so phones
// install the new service worker and drop pages saved by the previous one.
export const dynamic = "force-static";


// Removes itself and every saved copy, then reloads the open pages from the network.
const SELF_DESTRUCT = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith("grimorio-")) await caches.delete(key);
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
})()));
`;

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "local";
  const body = serviceWorkerEnabled()
    ? `const VERSION = ${JSON.stringify(version)};\n` + readFileSync(path.join(process.cwd(), "lib/sw/service-worker.js"), "utf8")
    : SELF_DESTRUCT;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Browsers must always check for a new version.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
