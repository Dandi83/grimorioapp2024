import { NextRequest, NextResponse, after } from "next/server";

import { adminBadgeCount } from "@/lib/admin-badge";
import { FORM_UNAVAILABLE, checkFormToken, feedbackAvailable, issueFormToken, turnstilePassed } from "@/lib/feedback";
import { PROPOSAL_MAX_BYTES, parseProposal } from "@/lib/homebrew-types";
import { proposalDeviceKey, proposalLimits, recordProposalSend, saveProposal } from "@/lib/homebrew";
import { noticeTurn, summaryNotice } from "@/lib/notice-limit";
import { partId } from "@/lib/public-sections";
import { proposalPayload, sendPush } from "@/lib/push";
import { visibilityState } from "@/lib/section-visibility";
import { effectiveHidden } from "@/lib/public-sections";
import { communityPublic } from "@/lib/community";
import { isAdmin } from "@/lib/admin-auth";

// Creatures proposed from /bestiario/proponi: the same protections as the reports (app/api/segnalazioni):
// same-site origin, signed time stamp, honeypot, Turnstile when configured, send limits per device.
// Nothing is published here: the proposal waits for the administrator in /admin/proposte.
export const dynamic = "force-dynamic";

function reply(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * «forbidden» while «I mostri creati da voi» is switched off (lib/community.ts) and the sender is not the
 * administrator (403); «closed» while the Bestiario or the section is hidden from /admin/sezioni (404).
 */
async function access(): Promise<"open" | "closed" | "forbidden"> {
  if (!communityPublic()) return (await isAdmin()) ? "open" : "forbidden";
  const state = await visibilityState();
  return effectiveHidden(state.sections, state.parts).includes("bestiario") || state.parts.includes(partId("bestiario", "homebrew")) ? "closed" : "open";
}
const SWITCHED_OFF = "Le proposte non sono aperte in questo momento.";

export async function GET() {
  const state = await access();
  if (state === "forbidden") return reply({ error: SWITCHED_OFF }, 403);
  if (state === "closed") return reply({ error: "Non disponibile." }, 404);
  const token = issueFormToken();
  if (!token) return reply({ error: FORM_UNAVAILABLE, unavailable: true }, 503);
  return reply({ token });
}

function sameSite(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return origin && host && new URL(origin).host === host ? origin : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!feedbackAvailable()) return reply({ error: FORM_UNAVAILABLE, unavailable: true }, 503);
  if (!sameSite(request)) return reply({ error: "Origine non valida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Richiesta non valida." }, 415);
  if (Number(request.headers.get("content-length") || 0) > PROPOSAL_MAX_BYTES) return reply({ error: "Scheda troppo lunga." }, 413);
  const state = await access();
  if (state === "forbidden") return reply({ error: SWITCHED_OFF }, 403);
  if (state === "closed") return reply({ error: SWITCHED_OFF }, 404);
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > PROPOSAL_MAX_BYTES) return reply({ error: "Scheda troppo lunga." }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "Richiesta non valida." }, 400);
  }
  const parsed = parseProposal(body);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  // Filled honeypot: the usual answer, nothing saved.
  if (parsed.spam) return reply({ ok: true });
  const token = checkFormToken(parsed.token);
  if (token === "too-fast") return reply({ error: "Invio troppo rapido: attendi qualche secondo e riprova.", retry: true }, 429);
  if (token !== "ok") return reply({ error: "Modulo scaduto: riprova.", retry: true }, 400);
  if (!(await turnstilePassed((body as Record<string, unknown>).turnstile))) return reply({ error: "Verifica antispam non superata: ricarica la pagina e riprova." }, 403);
  const key = proposalDeviceKey(request.headers);
  try {
    const { limited, peak } = await proposalLimits(key);
    if (limited) return reply({ error: "Hai inviato molte proposte: riprova più tardi." }, 429);
    // Over the ceiling of the whole site the proposal is saved all the same, without a notice.
    const proposal = await saveProposal({ ...parsed.value, impronta: key, picco: peak });
    await recordProposalSend(key);
    if (peak) return reply({ ok: true });
    after(async () => {
      // At most NOTICES_PER_HOUR notices an hour, then a single summary (lib/notice-limit.ts).
      const turn = await noticeTurn("proposte").catch(() => "send" as const);
      if (turn === "skip") return;
      const badge = await adminBadgeCount().catch(() => null);
      const payload = turn === "summary" ? { ...summaryNotice("proposte"), ...(typeof badge === "number" ? { badge } : {}) } : proposalPayload(proposal, badge);
      await sendPush("proposte", payload).catch(() => console.warn("[notifiche] Invio della notifica non riuscito."));
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: "Non è stato possibile salvare la proposta. Riprova tra poco." }, 503);
  }
}
