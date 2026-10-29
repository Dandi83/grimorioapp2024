import { NextRequest, NextResponse } from "next/server";
import { spellName } from "@/lib/spell-name";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import {
  analyticsConfigured,
  analyticsSecret,
  storeAnalyticsEvent,
  storeRating,
  admitEvent,
  analyticsAddressKey,
  excludeVisitor,
  forgetFavorites,
  storeFavorite,
  type CardInfo,
} from "@/lib/analytics";
import { parseAnalyticsInput } from "@/lib/analytics-events";
import {
  CONSENT_COOKIE as CONSENT,
  VISITOR_COOKIE as VISITOR,
  EXCLUDED_COOKIE,
  COOKIE_OPTIONS as options,
  CHOICE_OPTIONS,
  EXCLUDED_OPTIONS,
  signVisitor as sign,
  visitorOf,
  visitorExcluded,
} from "@/lib/analytics-exclusion";
import { clientAddress } from "@/lib/admin-login-limit";
import { getSpellById } from "@/lib/spells";
import { getMonsterById } from "@/lib/monsters";
import { isSrdAnimal } from "@/lib/monsters-types";
import { MERGED_SPELL_IDS } from "@/lib/monster-id-aliases";
import { publicSpellId } from "@/lib/spell-public-id";
import { getHomebrew } from "@/lib/homebrew";
import { storeTableVote } from "@/lib/table-votes";
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
  // The host the browser asked for: Next writes 127.0.0.1 as «localhost» in nextUrl, so the browser tests could not
  // keep the statistics off on 127.0.0.1 and on on localhost. On Vercel the two are the same name.
  const host = (request.headers.get("host") || "").replace(/:\d+$/, "") || request.nextUrl.hostname;
  return (
    analyticsConfigured() &&
    // GRIMORIO_ANALYTICS_TEST_HOST: set only by the browser tests (e2e/run.mjs), never on Vercel.
    ["ilgrimorio.app", "www.ilgrimorio.app", "grimorioapp2024.vercel.app", process.env.GRIMORIO_ANALYTICS_TEST_HOST].includes(host)
  );
}
function response(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
/**
 * Counted by default, from the first page, except who presses «No» (28 October 2026): the statistics are first
 * party, aggregated, without IP or user agent, never sent to others (lib/analytics.ts), so they need no consent
 * (Garante, cookie guidelines of 10 June 2021). consent: "accepted" = the bar closed with «Ok», "rejected" = «No»
 * (excluded, nothing saved any more), null = the bar not answered yet (counted).
 */
export async function GET(request: NextRequest) {
  const excluded = await excludedDevice(request);
  const choice = request.cookies.get(CONSENT)?.value;
  const consent = choice === "accepted" || choice === "rejected" ? choice : null;
  const result = response({ enabled: allowed(request), excluded, consent });
  // Renewed at every visit: the mark of an administrator's device lasts while the device is used, a «No» too.
  if (excluded) result.cookies.set(EXCLUDED_COOKIE, "1", EXCLUDED_OPTIONS);
  if (consent) result.cookies.set(CONSENT, consent, CHOICE_OPTIONS);
  // Counted: the random visitor ID is given here, before the first events of the page, so the events sent
  // together at the opening share it.
  // Only a few new IDs an hour for one network address (lib/analytics.ts, ANALYTICS_LIMITS): a script without the
  // cookie cannot make up visitors; a real browser over the limit is simply not counted.
  if (allowed(request) && !excluded && consent !== "rejected" && !visitorFrom(request)
    && await admitEvent(analyticsAddressKey(clientAddress(request.headers)), true).catch(() => false)) {
    const id = randomUUID();
    result.cookies.set(VISITOR, `${id}.${sign(id)}`, options);
  }
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
    result.cookies.set(CONSENT, choice, CHOICE_OPTIONS);
    if (choice === "accepted") {
      const id = visitorFrom(request) || randomUUID();
      result.cookies.set(VISITOR, `${id}.${sign(id)}`, options);
      // A device of the administrator that accepts: its new visitor ID is refused from the start.
      if (await excludedDevice(request)) await excludeVisitor(id).catch(() => {});
    } else {
      result.cookies.set(VISITOR, "", { ...options, maxAge: 0 });
      // «No»: the stars of this browser are no longer counted in «I più salvati».
      const visitor = visitorFrom(request);
      if (visitor) await forgetFavorites(visitor).catch(() => {});
    }
    return result;
  }
  if (await excludedDevice(request)) return response({ ignored: true, reason: "admin" });
  // «No» (also pressed before 28 October 2026, when it was «Rifiuta statistiche»): nothing is saved.
  if (request.cookies.get(CONSENT)?.value === "rejected")
    return response({ ignored: true, reason: "rejected" });
  // The first event of a browser gives it a new random visitor ID (a cookie that does not verify too, never re-signed).
  const known = visitorFrom(request);
  const visitor = known || randomUUID();
  const input = parseAnalyticsInput(body);
  if (!input) return response({ error: "Evento non valido" }, 400);
  if (
    !input.test &&
    /bot|crawler|spider|headless|preview|facebookexternalhit|whatsapp/i.test(
      request.headers.get("user-agent") || "",
    )
  )
    return response({ ignored: true, reason: "bot" });
  // The limits per network address, for new visitor IDs and for the whole site (ANALYTICS_LIMITS): over them the
  // event is dropped in silence, the visitor sees nothing.
  if (!(await admitEvent(analyticsAddressKey(clientAddress(request.headers)), !known).catch(() => true)))
    return response({ ok: true, stored: false });
  // «Come ti trovi con il Grimorio?»: only the vote, the day and the kind of device, in its own table.
  if (input.event === "valutazione") {
    try {
      const stored = await storeRating(input.vote!, visitor, input.device ?? null, input.test);
      const result = response({ ok: true, stored });
      if (!known) result.cookies.set(VISITOR, `${visitor}.${sign(visitor)}`, options);
      return result;
    } catch {
      return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
    }
  }
  // «L'hai provato al tavolo?» (PROMPT 19): only on a published card of «I mostri creati da voi»; one vote per device
  // and card, changeable, in its own table (lib/table-votes.ts).
  if (input.event === "prova_tavolo") {
    try {
      const card = input.path.slice("/mostro/".length);
      if (!(await getHomebrew(card))) return response({ ignored: true });
      const stored = await storeTableVote(visitor, card, input.tableVote!, input.test);
      const result = response({ ok: true, stored });
      if (!known) result.cookies.set(VISITOR, `${visitor}.${sign(visitor)}`, options);
      return result;
    } catch {
      return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
    }
  }
  // A star (favorite_add, favorite_remove): only for a card of the catalog, counted on its address id (a spell renamed
  // by PROMPT 8 or merged with another card counts on the new address), then the state of the visitor and the card.
  if (input.event === "favorite_add" || input.event === "favorite_remove") {
    try {
      const spell = input.favoriteKind === "incantesimo";
      const record = spell ? await getSpellById(MERGED_SPELL_IDS[input.favoriteId!] ?? input.favoriteId!) : await getMonsterById(input.favoriteId!);
      if (!record) return response({ ignored: true });
      const id = spell ? publicSpellId(record.id) : record.id;
      const card: CardInfo = "nome_italiano" in record
        ? { id, kind: "spell", title: spellName(record.nome_italiano) }
        : { id, kind: isSrdAnimal(record) ? "animal" : "monster", title: record.nome };
      const stored = await storeAnalyticsEvent(input, visitor, card);
      if (stored) await storeFavorite(visitor, input.favoriteKind!, id, input.event === "favorite_add", input.test);
      const result = response({ ok: true, stored });
      if (!known) result.cookies.set(VISITOR, `${visitor}.${sign(visitor)}`, options);
      return result;
    } catch {
      return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
    }
  }
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
      // The stored id (lib/spell-public-id.ts): the readings of the old and new address of a card add up.
      const record = await getSpellById(cardId!);
      if (!record) return response({ ignored: true });
      card = { id: record.id, kind: "spell", title: spellName(record.nome_italiano) };
    } else if (input.path.startsWith("/mostro/")) {
      const id = cardId!,
        record = await getMonsterById(id);
      if (!record) return response({ ignored: true });
      card = { id, kind: isSrdAnimal(record) ? "animal" : "monster", title: record.nome };
    }
    const stored = await storeAnalyticsEvent(input, visitor, card);
    const result = response({ ok: true, stored });
    if (!known) result.cookies.set(VISITOR, `${visitor}.${sign(visitor)}`, options);
    return result;
  } catch {
    return response({ error: "Statistiche temporaneamente non disponibili" }, 503);
  }
}
