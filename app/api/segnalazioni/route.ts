import { NextRequest, NextResponse, after } from "next/server";
import { BODY_MAX_BYTES, TYPE_LABELS, parseFeedback } from "@/lib/feedback-input";
import { feedbackPayload, sendPush } from "@/lib/push";
import {
  FORM_UNAVAILABLE, checkFormToken, deviceKey, feedbackAvailable, feedbackLimited, issueFormToken, markEmailFailed, markEmailSent,
  recordFeedbackSend, saveFeedback, sendFeedbackEmailWithReason, turnstilePassed,
} from "@/lib/feedback";
import { pageName } from "@/lib/feedback-names";
import { adminBadgeCount } from "@/lib/admin-badge";

// Anonymous reports from /segnala. Never cached, never handled by the service worker.
export const dynamic = "force-dynamic";

function reply(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

/** A signed time stamp: the report is accepted only a few seconds after the form was opened. Closed without FEEDBACK_SECRET. */
export function GET() {
  const token = issueFormToken();
  if (!token) return reply({ error: FORM_UNAVAILABLE, unavailable: true }, 503);
  return reply({ token });
}

/** The page that sends must be this site (same host as the request): other sites cannot post reports. */
function sameSiteOrigin(request: NextRequest): string | null {
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
  const origin = sameSiteOrigin(request);
  if (!origin) return reply({ error: "Origine non valida." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Richiesta non valida." }, 415);
  if (Number(request.headers.get("content-length") || 0) > BODY_MAX_BYTES) return reply({ error: "Messaggio troppo lungo." }, 413);
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > BODY_MAX_BYTES) return reply({ error: "Messaggio troppo lungo." }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "Richiesta non valida." }, 400);
  }
  // The host of this request: a contested page may be written with it (previews, tests).
  const parsed = parseFeedback(body, new URL(origin).host);
  if (!parsed.ok) return reply({ error: parsed.error }, 400);
  // Filled honeypot: the sender sees the usual answer, nothing is saved or sent.
  if (parsed.spam) return reply({ ok: true });
  const token = checkFormToken(parsed.token);
  if (token === "too-fast") return reply({ error: "Invio troppo rapido: attendi qualche secondo e riprova.", retry: true }, 429);
  if (token !== "ok") return reply({ error: "Modulo scaduto: riprova.", retry: true }, 400);
  if (!(await turnstilePassed((body as Record<string, unknown>).turnstile))) return reply({ error: "Verifica antispam non superata: ricarica la pagina e riprova." }, 403);

  const key = deviceKey(request.headers);
  try {
    if (await feedbackLimited(key)) return reply({ error: "Hai inviato molte segnalazioni: riprova più tardi." }, 429);
    const report = await saveFeedback(parsed.value);
    await recordFeedbackSend(key);
    // Saved first; the email and the admin notification follow after the answer, and their failure
    // never reaches the visitor (the report stays saved).
    after(async () => {
      // The number for the app icon badge travels with the notification (new reports, this one included, and proposals).
      const [name, badge] = await Promise.all([pageName(report.percorso, report.edizione).catch(() => null), adminBadgeCount().catch(() => null)]);
      const [email] = await Promise.all([
        sendFeedbackEmailWithReason(report, { origin, name }),
        sendPush("segnalazioni", feedbackPayload(report, TYPE_LABELS[report.tipo], name, badge)).catch(() => console.warn("[notifiche] Invio della notifica non riuscito.")),
      ]);
      // A failure keeps its reason (no addresses), shown in the reserved area next to «non inviata».
      if (email.result === "sent") await markEmailSent(report.id).catch(() => undefined);
      else if (email.reason) await markEmailFailed(report.id, email.reason).catch(() => undefined);
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: "Non è stato possibile salvare la segnalazione. Riprova tra poco." }, 503);
  }
}
