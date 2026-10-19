"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { hasInAppHistory } from "@/components/navigation-memory";

/** Goes back within the site; a card opened from a shared link goes to its list instead. */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (hasInAppHistory() ? router.back() : router.push(fallback))}
      aria-label="Torna indietro"
      className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-foreground transition-opacity hover:opacity-80"
    >
      <ChevronLeft size={22} />
    </button>
  );
}
