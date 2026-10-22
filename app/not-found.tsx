import { NotFoundView } from "@/components/sections/section-unavailable";
import { hiddenSections } from "@/lib/section-visibility";

export const metadata = { title: "Pagina non disponibile — Il Grimorio.App", robots: { index: false, follow: false } };

/** 404 of the whole site: the pages of a hidden section say they will come back (lib/public-sections.ts). */
export default async function NotFound() {
  return <NotFoundView hidden={await hiddenSections()} />;
}
