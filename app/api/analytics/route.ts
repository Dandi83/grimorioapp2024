import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import {
  analyticsConfigured,
  analyticsSecret,
  storeAnalyticsEvent,
  exportAnalytics,
  type CardInfo,
} from "@/lib/analytics";
import { parseAnalyticsInput } from "@/lib/analytics-events";
import { getSpellById } from "@/lib/spells";
import { getMonsterById } from "@/lib/monsters";
import { isSrdAnimal } from "@/lib/monsters-types";
export const dynamic = "force-dynamic";
const CONSENT = "grimorio_statistics_consent",
  VISITOR = "grimorio_statistics_visitor";
const options = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
};
// ANALYTICS_SECRET signs new visitor IDs; IDs signed earlier with the admin passcode stay valid and are re-signed.
function sign(id: string, secret = analyticsSecret()) {
  return createHmac("sha256", secret).update(`statistics:${id}`).digest("hex");
}
function matches(signature: string, expected: string) {
  const a = Buffer.from(signature),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function visitorFrom(request: NextRequest): { id: string; legacy: boolean } | undefined {
  const [id, signature] = request.cookies.get(VISITOR)?.value.split(".") ?? [];
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id)) return;
  if (matches(signature, sign(id))) return { id, legacy: false };
  const legacy = process.env.ADMIN_PASSCODE;
  if (legacy && legacy !== analyticsSecret() && matches(signature, sign(id, legacy)))
    return { id, legacy: true };
}
function allowed(request: NextRequest) {
  return (
    analyticsConfigured() &&
    ["ilgrimorio.app", "www.ilgrimorio.app", "grimorioapp2024.vercel.app"].includes(
      request.nextUrl.hostname,
    )
  );
}
function response(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: NextRequest) {
  const excluded = await isAdmin();
  const choice = request.cookies.get(CONSENT)?.value;
  return response({
    enabled: allowed(request),
    excluded,
    consent: choice === "accepted" || choice === "rejected" ? choice : null,
  });
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return response({ error: "Origine non valida" }, 403);
  if (!allowed(request)) return response({ enabled: false }, 403);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return response({ error: "Richiesta troppo grande" }, 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return response({ error: "Richiesta troppo grande" }, 413);
    body = JSON.parse(text);
  } catch {
    return response({ error: "Richiesta non valida" }, 400);
  }
  if (body && typeof body === "object" && "consent" in body) {
    const choice = (body as { consent: unknown }).consent;
    if (choice !== "accepted" && choice !== "rejected")
      return response({ error: "Scelta non valida" }, 400);
    const result = response({ ok: true, consent: choice });
    result.cookies.set(CONSENT, choice, options);
    if (choice === "accepted") {
      const id = visitorFrom(request)?.id || randomUUID();
      result.cookies.set(VISITOR, `${id}.${sign(id)}`, options);
    } else result.cookies.set(VISITOR, "", { ...options, maxAge: 0 });
    return result;
  }
  if (await isAdmin()) return response({ ignored: true, reason: "admin" });
  if (request.cookies.get(CONSENT)?.value !== "accepted")
    return response({ ignored: true, reason: "consent" });
  const verified = visitorFrom(request);
  if (!verified) return response({ ignored: true, reason: "identity" });
  const visitor = verified.id;
  const input = parseAnalyticsInput(body);
  if (!input) return response({ error: "Evento non valido" }, 400);
  if (
    !input.test &&
    /bot|crawler|spider|headless|preview|facebookexternalhit|whatsapp/i.test(
      request.headers.get("user-agent") || "",
    )
  )
    return response({ ignored: true, reason: "bot" });
  // A malformed escape (e.g. "%E0") is a bad request, not a server failure.
  let cardId: string | undefined;
  try {
    if (/^\/(?:spell|mostro)\//.test(input.path))
      cardId = decodeURIComponent(input.path.slice(input.path.indexOf("/", 1) + 1));
  } catch {
    return response({ error: "Evento non valido" }, 400);
  }
  let card: CardInfo | undefined;
  try {
    if (input.path.startsWith("/spell/")) {
      const id = cardId!,
        record = await getSpellById(id);
      if (!record) return response({ ignored: true });
      card = { id, kind: "spell", title: record.nome_italiano };
    } else if (input.path.startsWith("/mostro/")) {
      const id = cardId!,
        record = await getMonsterById(id);
      if (!record) return response({ ignored: true });
      card = { id, kind: isSrdAnimal(record) ? "animal" : "monster", title: record.nome };
    }
    const stored = await storeAnalyticsEvent(input, visitor, card);
    after(async () => {
      try {
        await exportAnalytics();
      } catch {
        console.error("Analytics export pending; event retained for retry.");
      }
    });
    const result = response({ ok: true, stored });
    if (verified.legacy) result.cookies.set(VISITOR, `${visitor}.${sign(visitor)}`, options);
    return result;
  } catch {
    return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
  }
}
