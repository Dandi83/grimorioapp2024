import type { ReactNode } from "react";
import { SectionGate } from "@/components/sections/section-gate";

/** The weapon masteries (PROMPT 47) belong to the section «armi»: hidden from /admin/sezioni with it. */
export default function Layout({ children }: { children: ReactNode }) {
  return <SectionGate section="armi">{children}</SectionGate>;
}
