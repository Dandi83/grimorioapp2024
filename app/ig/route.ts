/**
 * The short link of the Instagram bio (PROMPT 34): ilgrimorio.app/ig (and /IG, next.config.mjs). A 307 to the Home with
 * ?da=bio, which the page reads and takes off the address (components/analytics-provider.tsx): the arrival counts as
 * «Link in bio». Never kept by the browser or the CDN, never indexed; the preview of the link follows it to the Home.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 307,
    headers: { Location: "/?da=bio", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
