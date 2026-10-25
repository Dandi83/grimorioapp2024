"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { hasInAppHistory, listInsteadOfAdmin, previousPath } from "@/components/navigation-memory";

/**
 * Goes back within the site; a card opened from a shared link goes to its list instead, and so does a card
 * whose previous page is the admin area (an editor opened from an address): never back into /admin.
 */
/** With a label it sits in the page header ("‹ Bestiario"), otherwise it floats over the hero. */
export function BackButton({ fallback = "/", label }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (previousPath()?.startsWith("/admin")) router.push(listInsteadOfAdmin(fallback));
        else if (hasInAppHistory()) router.back();
        else router.push(fallback);
      }}
      aria-label="Torna indietro"
      className={label
        ? "-ml-2 flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary"
        : "absolute left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-elevated text-foreground transition-opacity hover:opacity-80"}
    >
      <ChevronLeft size={22} aria-hidden={label ? true : undefined} />
      {label && <span aria-hidden="true">{label}</span>}
    </button>
  );
}
