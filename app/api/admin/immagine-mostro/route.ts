import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-action-helpers";
import { UPLOAD_MAX_BYTES, convertPicture } from "@/lib/monster-picture-server";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The picture field of the editor of a creature «Dalla redazione» (PROMPT 44): a JPG or PNG becomes three WebP sizes
 * under 150 KB, saved in the database. Only the administrator, only from this site. The card is not changed here: the
 * editor keeps the version and saves it with the rest.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameSite = false;
  try { sameSite = !!origin && new URL(origin).host === (request.headers.get("host") || request.nextUrl.host); } catch {}
  if (!sameSite) return NextResponse.json({ error: "Origine non valida" }, { status: 403, headers: PRIVATE });
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorizzato" }, { status: 401, headers: PRIVATE }); }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > UPLOAD_MAX_BYTES + 1024) return NextResponse.json({ error: "Immagine troppo grande (al massimo 4 MB)." }, { status: 413, headers: PRIVATE });
  let file: File | null = null;
  try { file = (await request.formData()).get("immagine") as File | null; } catch {}
  if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Scegli un’immagine JPG o PNG." }, { status: 400, headers: PRIVATE });
  if (file.size > UPLOAD_MAX_BYTES) return NextResponse.json({ error: "Immagine troppo grande (al massimo 4 MB)." }, { status: 413, headers: PRIVATE });
  const result = await convertPicture(Buffer.from(await file.arrayBuffer())).catch(() => ({ ok: false as const, error: "Conversione non riuscita. Riprova." }));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422, headers: PRIVATE });
  return NextResponse.json(result.picture, { headers: PRIVATE });
}
