import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AdminLogin } from "@/components/admin-login";
import { SearchEnglishRow } from "@/components/admin-content/search-english-row";
import { isAdmin } from "@/lib/admin-auth";
import { isNoSrdSource } from "@/lib/card-display";
import { getAllMonsters } from "@/lib/monsters";
import { allProposals, readSearchEnglish } from "@/lib/search-english-server";
import { getAdminSpells } from "@/lib/spells";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nomi inglesi da verificare — Il Grimorio.App", robots: { index: false, follow: false } };

/**
 * «Nomi inglesi da verificare» (PROMPT 37): the English names «solo ricerca» of the NO SRD cards. The proposals of the
 * project wait for «Approva», «Modifica» or «Scarta»; the approved ones (also typed in the editor) are listed apart and
 * can be changed or discarded. Only the approved names reach the search, as keys, and are never shown to the public.
 */
export default async function SearchEnglishPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [spells, monsters, decisions] = await Promise.all([getAdminSpells(), getAllMonsters(), readSearchEnglish()]);
  const cards = new Map<string, { nome: string; href: string }>();
  for (const spell of spells) if (isNoSrdSource(spell.origine ?? spell.fonte_scheda)) cards.set(`incantesimo:${spell.id}`, { nome: spell.nome_mostrato ?? spell.nome_italiano, href: `/admin/incantesimi/${encodeURIComponent(spell.id)}` });
  for (const monster of monsters) if (isNoSrdSource(monster.fonte_scheda)) cards.set(`mostro:${monster.id}`, { nome: monster.nome, href: `/admin/mostri/${encodeURIComponent(monster.id)}` });
  const decided = new Set(decisions.map(row => `${row.kind}:${row.id}`));
  const pending = allProposals().filter(row => cards.has(`${row.kind}:${row.id}`) && !decided.has(`${row.kind}:${row.id}`));
  const approved = decisions.filter(row => row.state === "approvata" && cards.has(`${row.kind}:${row.id}`));
  const byName = (a: { kind: string; id: string }, b: { kind: string; id: string }) => cards.get(`${a.kind}:${a.id}`)!.nome.localeCompare(cards.get(`${b.kind}:${b.id}`)!.nome, "it");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-10 pt-3 lg:max-w-[960px]">
      <Link href="/admin/contenuti" className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-[15px] font-bold text-[#7A1F2B]"><ChevronLeft size={18} aria-hidden="true" /> Contenuti</Link>
      <h1 className="font-serif text-[32px] font-bold leading-tight text-[#7A1F2B]">Nomi inglesi da verificare</h1>
      <p className="text-[15px] leading-6 text-[#5E4E3E]">
        Il nome inglese ufficiale delle schede NO SRD serve solo a trovarle cercando in inglese: non compare mai nell’app. Entra nella ricerca solo
        dopo «Approva». I nomi propri e i marchi protetti (Tasha, Mordenkainen, Beholder…) non si possono usare.
      </p>
      <section aria-labelledby="da-verificare">
        <h2 id="da-verificare" className="px-1 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5E4E3E]">Da verificare ({pending.length})</h2>
        {pending.length ? (
          <ul data-search-english-pending="" className="divide-y divide-[#DDCFAE]/70 overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
            {pending.sort(byName).map(row => <SearchEnglishRow key={`${row.kind}:${row.id}`} kind={row.kind} id={row.id} inglese={row.name} approved={false} {...cards.get(`${row.kind}:${row.id}`)!} />)}
          </ul>
        ) : <p className="rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 py-4 text-[15px]">Nessun nome da verificare.</p>}
      </section>
      <section aria-labelledby="approvati">
        <h2 id="approvati" className="px-1 pb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5E4E3E]">Approvati ({approved.length})</h2>
        {approved.length ? (
          <ul data-search-english-approved="" className="divide-y divide-[#DDCFAE]/70 overflow-hidden rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0]">
            {approved.sort(byName).map(row => <SearchEnglishRow key={`${row.kind}:${row.id}`} kind={row.kind} id={row.id} inglese={row.name} approved {...cards.get(`${row.kind}:${row.id}`)!} />)}
          </ul>
        ) : <p className="rounded-[16px] border-[1.5px] border-[#DDCFAE] bg-[#FFFBF0] px-4 py-4 text-[15px]">Nessun nome approvato.</p>}
      </section>
    </main>
  );
}
