import { isAdmin } from "@/lib/admin-auth";
import { pictureOwner, readPicture } from "@/lib/monster-picture-server";
import { cardPath, hiddenCardPaths, hiddenPartIds, hiddenSections } from "@/lib/section-visibility";
import type { PictureSize } from "@/components/monster-picture";

export const dynamic = "force-dynamic";

const FILE = /^([a-f0-9]{16})-(s|m|l)\.webp$/;
const notFound = () => new Response("Non trovata", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * One size of the picture of a creature «Dalla redazione» (PROMPT 44). The public gets it only while the card that uses
 * it can be seen (not hidden with the eye, its collection and the Bestiario shown): then for a year, as the address
 * changes with the picture. The administrator sees the pictures of the hidden cards and the ones not saved yet, never
 * kept by a cache. Not in the service worker's first copy: it only keeps program files and pages.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const match = FILE.exec((await params).file);
  if (!match) return notFound();
  const [, v, size] = match;
  const owner = await pictureOwner(v);
  let visible = false;
  if (owner) {
    const [cards, parts, sections] = await Promise.all([hiddenCardPaths(), hiddenPartIds().catch(() => [] as string[]), hiddenSections()]);
    visible = !cards.includes(cardPath("mostro", owner)) && !parts.includes("bestiario:grimorio") && !sections.includes("bestiario");
  }
  if (!visible && !(await isAdmin())) return notFound();
  const data = await readPicture(v, size as PictureSize);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "Cache-Control": visible ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
