import Link from "next/link";
import { notFound } from "next/navigation";
import { getManualEntry, manualAvailable } from "@/lib/manual";
import { MANUAL_CATEGORIES } from "@/lib/manual-types";
import { ManualContent } from "@/components/manual-content";
export const dynamic = "force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}) { const {id}=await params; return {title:`${getManualEntry(id)?.title || "Voce non trovata"} — Manuale GrimorioApp`}; }
export default async function ManualEntryPage({ params }: { params: Promise<{id:string}> }) {
  if (!manualAvailable(process.env.VERCEL_ENV)) notFound();
  const {id}=await params;const entry=getManualEntry(id);if(!entry)notFound();
  return <article className="min-w-0 px-6 py-7"><Link href={`/manuale?sezione=${entry.category}`} className="text-sm font-semibold text-primary">← {MANUAL_CATEGORIES[entry.category]}</Link><header className="mb-6 mt-6"><p className="mb-2 text-xs uppercase tracking-widest text-primary">{entry.subgroup}</p><h1 className="font-serif text-4xl font-bold leading-tight text-foreground">{entry.title}</h1></header>{entry.subgroup === "Classi" && ["Bardo","Chierico","Druido","Mago","Paladino","Ranger","Stregone","Warlock"].includes(entry.title) && <Link href={`/grimorio?classe=${entry.title.toLowerCase()}`} className="mb-6 inline-block rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary">Consulta gli incantesimi della classe →</Link>}<ManualContent entry={entry}/></article>;
}
