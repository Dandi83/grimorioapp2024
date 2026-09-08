"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Torna indietro"
      className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated/75 text-foreground backdrop-blur transition-opacity hover:opacity-80"
    >
      <ChevronLeft size={22} />
    </button>
  );
}
