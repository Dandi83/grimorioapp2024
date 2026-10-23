import { NextRequest, NextResponse, after } from "next/server";

import { adminBadgeCount } from "@/lib/admin-badge";
import { checkFormToken, issueFormToken, turnstilePassed } from "@/lib/feedback";
import { PROPOSAL_MAX_BYTES, parseProposal } from "@/lib/homebrew-types";
import { proposalDeviceKey, proposalLimited, recordProposalSend, saveProposal } from "@/lib/homebrew";
import { partId } from "@/lib/public-sections";
import { proposalPayload, sendPush } from "@/lib/push";
import { visibilityState } from "@/lib/section-visibility";
import { effectiveHidden } from "@/lib/public-sections";

// Creatures proposed from /bestiario/proponi: the same protections as the reports (app/api/segnalazioni):
// same-site origin, signed time stamp, honeypot, Turnstile when configured, send limits per device.
// Nothing is published here: the proposal waits for the administrator in /admin/proposte.
export const dynamic = "force-dynamic";

function reply(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

/** Closed while the Bestiario or its Homebrew collection is hidden from the public. */
async function closed(): Promise<boolean> {
  const state = await visibilityState();
  return effectiveHidden(state.sections, state.parts).includes("bestiario") || state.parts.includes(partId("bestiario", "homebrew"));
}

export async function GET() {
  if (await closed()) return reply({ error: "Non disponibile." }, 404);
  return reply({ token: issueFormToken() });
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
  if (!sameSite(request)) return reply({ error: "Origine non valida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Richiesta non valida." }, 415);
  if (Number(request.headers.get("content-length") || 0) > PROPOSAL_MAX_BYTES) return reply({ error: "Scheda troppo lunga." }, 413);
  if (await closed()) return reply({ error: "Le proposte non sono aperte in questo momento." }, 404);
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
    if (await proposalLimited(key)) return reply({ error: "Hai inviato molte proposte: riprova più tardi." }, 429);
    const proposal = await saveProposal({ ...parsed.value, impronta: key });
    await recordProposalSend(key);
    after(async () => {
      const badge = await adminBadgeCount().catch(() => null);
      await sendPush("proposte", proposalPayload(proposal, badge)).catch(() => console.warn("[notifiche] Invio della notifica non riuscito."));
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: "Non è stato possibile salvare la proposta. Riprova tra poco." }, 503);
  }
}
