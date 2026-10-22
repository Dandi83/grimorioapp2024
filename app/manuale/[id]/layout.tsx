import type { ReactNode } from "react";
import { SectionGate } from "@/components/sections/section-gate";

/** The conditions open here (/manuale/condizioni-…): they belong to the «condizioni» section (lib/public-sections.ts). */
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return id.startsWith("condizioni-") ? <SectionGate section="condizioni">{children}</SectionGate> : children;
}
