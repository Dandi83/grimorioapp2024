// Security headers of every page (next.config.mjs). Plain ESM: next.config and the tests import it.

/**
 * Content-Security-Policy. Only this site's own files run: no other origin may load scripts,
 * styles, fonts or images (the fonts are self-hosted by next/font). Inline scripts stay allowed
 * ('unsafe-inline'): a per-request nonce would turn every prerendered page into a dynamic one,
 * slower on the phone and without the static copies the offline mode relies on.
 *
 * Extra origins only when needed:
 * - Cloudflare Turnstile, when both its keys are set (anti-spam of /segnala);
 * - the Vercel toolbar, on preview deployments only;
 * - 'unsafe-eval' in development only (React's development build needs it).
 */
export function contentSecurityPolicy({ turnstile = false, preview = false, development = false, reportOnly = false } = {}) {
  const vercel = preview ? ["https://vercel.live"] : [];
  const cloudflare = turnstile ? ["https://challenges.cloudflare.com"] : [];
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : []), ...cloudflare, ...vercel],
    "style-src": ["'self'", "'unsafe-inline'", ...vercel],
    "img-src": ["'self'", "data:", "blob:", ...(preview ? ["https://vercel.live", "https://vercel.com"] : [])],
    "font-src": ["'self'", ...(preview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
    "connect-src": ["'self'", ...cloudflare, ...(preview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : [])],
    "frame-src": cloudflare.length || vercel.length ? [...cloudflare, ...vercel] : ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return [...Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`), ...(development || reportOnly ? [] : ["upgrade-insecure-requests"])].join("; ");
}

/**
 * Headers of every response. GRIMORIO_CSP=report-only (set on Vercel, then redeploy) sends the
 * policy as Content-Security-Policy-Report-Only: an emergency switch if something gets blocked.
 */
export function securityHeaders(env = process.env) {
  const reportOnly = env.GRIMORIO_CSP === "report-only";
  const policy = contentSecurityPolicy({
    reportOnly,
    turnstile: !!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
    preview: env.VERCEL_ENV === "preview",
    development: env.NODE_ENV === "development",
  });
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000" },
    // No other site may show these pages inside a frame (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    { key: reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: policy },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
