import { showCardAction } from "@/app/actions/admin-cards";
import { HiddenTag } from "@/components/sections/hidden-tag";

/** «Nascosta» and «Mostra» at the top of a card hidden with the eye of the admin area: only the administrator sees the card. */
export function HiddenCardBar({ kind, id }: { kind: "incantesimo" | "mostro"; id: string }) {
  return (
    <form action={showCardAction} className="flex items-center gap-2">
      <HiddenTag />
      <span className="text-[13px] text-muted">Il pubblico non vede questa scheda.</span>
      <input type="hidden" name="tipo" value={kind} />
      <input type="hidden" name="scheda" value={id} />
      <button type="submit" className="min-h-11 px-1 text-[14px] font-bold text-primary underline underline-offset-4">Mostra</button>
    </form>
  );
}
