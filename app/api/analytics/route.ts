import { NextRequest, NextResponse, after } from "next/server";
import { spellName } from "@/lib/spell-name";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import {
  analyticsConfigured,
  analyticsSecret,
  storeAnalyticsEvent,
  exportAnalytics,
  excludeVisitor,
  type CardInfo,
} from "@/lib/analytics";
import { parseAnalyticsInput } from "@/lib/analytics-events";
import {
  CONSENT_COOKIE as CONSENT,
  VISITOR_COOKIE as VISITOR,
  EXCLUDED_COOKIE,
  COOKIE_OPTIONS as options,
  EXCLUDED_OPTIONS,
  signVisitor as sign,
  visitorOf,
  visitorExcluded,
} from "@/lib/analytics-exclusion";
import { getSpellById } from "@/lib/spells";
import { getMonsterById } from "@/lib/monsters";
import { isSrdAnimal } from "@/lib/monsters-types";
export const dynamic = "force-dynamic";
function visitorFrom(request: NextRequest): string | undefined {
  return visitorOf(request.cookies.get(VISITOR)?.value);
}
/**
 * A device of the administrator (lib/analytics-exclusion.ts): logged in now, marked by its cookie, or a visitor ID
 * marked before. It never saves events, also after the logout.
 */
async function excludedDevice(request: NextRequest): Promise<boolean> {
  if (request.cookies.get(EXCLUDED_COOKIE)?.value === "1" || (await isAdmin())) return true;
  const visitor = analyticsSecret() ? visitorFrom(request) : undefined;
  return !!visitor && (await visitorExcluded(visitor));
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
  const excluded = await excludedDevice(request);
  const choice = request.cookies.get(CONSENT)?.value;
  const result = response({
    enabled: allowed(request),
    excluded,
    consent: choice === "accepted" || choice === "rejected" ? choice : null,
  });
  // Renewed at every visit: the mark of an administrator's device lasts while the device is used.
  if (excluded) result.cookies.set(EXCLUDED_COOKIE, "1", EXCLUDED_OPTIONS);
  return result;
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
      const id = visitorFrom(request) || randomUUID();
      result.cookies.set(VISITOR, `${id}.${sign(id)}`, options);
      // A device of the administrator that accepts: its new visitor ID is refused from the start.
      if (await excludedDevice(request)) await excludeVisitor(id).catch(() => {});
    } else result.cookies.set(VISITOR, "", { ...options, maxAge: 0 });
    return result;
  }
  if (await excludedDevice(request)) return response({ ignored: true, reason: "admin" });
  if (request.cookies.get(CONSENT)?.value !== "accepted")
    return response({ ignored: true, reason: "consent" });
  const visitor = visitorFrom(request);
  if (!visitor) return response({ ignored: true, reason: "identity" });
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
      card = { id, kind: "spell", title: spellName(record.nome_italiano) };
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
    return response({ ok: true, stored });
  } catch {
    return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
  }
}
