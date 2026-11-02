import { Breadcrumbs } from "@/components/seo/json-ld";
import { FeatsBrowser, type FeatGroups } from "@/components/feats/feats-browser";
import { CATEGORY_TITLES, FEAT_CATEGORIES, feats } from "@/lib/feats";
import { sectionPage } from "@/lib/section-view";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ name: "Talenti", section: "Compendio", path: "/talenti",
  description: "I talenti di D&D 5e in italiano dall’SRD: Origini, Generali, Stile di combattimento e Doni epici del 2024, e Lottatore del 2014." });

/** The rows of the list: names, English names, categories and prerequisites only. */
function groups(): FeatGroups {
  const rows = (edition: "2024" | "2014") => feats.flatMap(feat => {
    const view = feat.editions[edition];
    return view ? [{ id: feat.id, nome: view.nome, ...(view.en ? { en: view.en } : {}), ...(view.categoria ? { categoria: view.categoria } : {}), ...(view.prerequisito ? { prerequisito: view.prerequisito } : {}) }] : [];
  });
  return { categories: FEAT_CATEGORIES.map(key => ({ key, title: CATEGORY_TITLES[key] })), rows: { "2024": rows("2024"), "2014": rows("2014") } };
}

export default async function FeatsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("talenti");
  return (
    <>
      <Breadcrumbs crumbs={[{ name: "Compendio", path: "/compendio" }, { name: "Talenti", path: "/talenti" }]} />
      <FeatsBrowser groups={groups()} />
    </>
  );
}
