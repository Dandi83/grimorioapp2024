"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { hasInAppHistory } from "@/components/navigation-memory";

/** Goes back within the site; a card opened from a shared link goes to its list instead. */
/** With a label it sits in the page header ("‹ Bestiario"), otherwise it floats over the hero. */
export function BackButton({ fallback = "/", label }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (hasInAppHistory() ? router.back() : router.push(fallback))}
      aria-label="Torna indietro"
      className={label
        ? "-ml-2 flex min-h-11 items-center gap-1 px-2 text-base font-bold text-primary"
        : "absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-foreground transition-opacity hover:opacity-80"}
    >
      <ChevronLeft size={22} aria-hidden={label ? true : undefined} />
      {label && <span aria-hidden="true">{label}</span>}
    </button>
  );
}
