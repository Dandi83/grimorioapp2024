import type { ReactNode } from "react";
import { SectionGate } from "@/components/sections/section-gate";

/** Section «incantesimi» (lib/public-sections.ts): hidden from /admin/sezioni, these pages are not shown to the public. */
export default function Layout({ children }: { children: ReactNode }) {
  return <SectionGate section="incantesimi">{children}</SectionGate>;
}
