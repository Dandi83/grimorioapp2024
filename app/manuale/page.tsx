import { notFound } from "next/navigation";
import { ManualBrowser } from "@/components/manual-browser";
import { manualAvailable, manualEntries } from "@/lib/manual";
import { pageMetadata } from "@/lib/seo";
import { MANUAL_CATEGORIES, type ManualCategory } from "@/lib/manual-types";
export const dynamic = "force-dynamic";
export const metadata = { ...pageMetadata({ name: "Manuale", description: "Il manuale delle regole di D&D 5e in italiano: capitoli, regole e condizioni da consultare durante la partita, edizioni 2014 e 2024.", path: "/manuale" }), robots: { index: false, follow: true } };
export default async function ManualPage({ searchParams }: { searchParams: Promise<{sezione?:string}> }) {
  if (!manualAvailable(process.env.VERCEL_ENV)) notFound();
  const {sezione} = await searchParams;
  const category = sezione === "personaggi" ? "classi" : sezione && Object.hasOwn(MANUAL_CATEGORIES, sezione) ? sezione as ManualCategory : undefined;
  return <ManualBrowser initialCategory={category} entries={manualEntries.map(entry => ({id:entry.id,title:entry.title,category:entry.category,subgroup:entry.subgroup,page:entry.page,search:[entry.title,entry.subgroup,...entry.blocks.map(block=>block.text)].join(" ").toLocaleLowerCase("it")}))}/>;
}
