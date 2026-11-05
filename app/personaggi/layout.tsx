import type { ReactNode } from "react";
import { SectionGate } from "@/components/sections/section-gate";

/** Section «personaggi» (PROMPT 62): «Nascosta» from the start, the beta page of the administrator; the public gets 404. */
export default function Layout({ children }: { children: ReactNode }) {
  return <SectionGate section="personaggi">{children}</SectionGate>;
}
