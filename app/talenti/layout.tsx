import type { ReactNode } from "react";
import { SectionGate } from "@/components/sections/section-gate";

/** Section «talenti» (PROMPT 49): «In arrivo» until the administrator shows it from /admin/sezioni. */
export default function Layout({ children }: { children: ReactNode }) {
  return <SectionGate section="talenti">{children}</SectionGate>;
}
