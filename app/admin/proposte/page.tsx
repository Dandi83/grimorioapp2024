import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { HomebrewSectionEye, ProposalCard, ProposalsNotice, type ProposalCardData } from "@/components/homebrew/admin-proposals";
import { isAdmin } from "@/lib/admin-auth";
import reference from "@/lib/data/gs-riferimento.json";
import { formatWhen } from "@/lib/feedback-input";
import { listProposals, proposalCounts, publishedHomebrew, type ProposalState } from "@/lib/homebrew";
import { estimateChallenge, statsOf, VERDICT_LABEL, type CrReference } from "@/lib/homebrew-cr";
import { HOMEBREW_EDITION_LABEL, draftActionText, draftToMonster, mismatchedFormat, similarName } from "@/lib/homebrew-types";
import { getMonsterListIndex } from "@/lib/monster-index";
import { hiddenPartIds } from "@/lib/section-visibility";
import { publicLinksOut } from "@/lib/section-view";
import { CardDisplayProvider } from "@/components/card-display-context";
import { getSpellReferenceCatalog } from "@/lib/spell-reference-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proposte homebrew — Il Grimorio.App", robots: { index: false, follow: false } };

const TABS: [ProposalState, string][] = [["da-vedere", "Da vedere"], ["approvata", "Approvate"], ["rifiutata", "Rifiutate"]];

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const query = await searchParams;
  const stato = TABS.find(([key]) => key === query.stato)?.[0] ?? "da-vedere";
  const [proposals, counts, parts, catalog, published] = await Promise.all([
    listProposals(stato), proposalCounts(), hiddenPartIds().catch(() => [] as string[]),
    getMonsterListIndex().catch(() => []), publishedHomebrew().catch(() => []),
  ]);
  // Names already in the Bestiario (SRD and homebrew): a proposal with a similar name gets its pill.
  const names = [...new Set([...catalog.map(monster => monster.nome), ...published.map(row => row.scheda.nome)])];
  const now = new Date();
  const cards: ProposalCardData[] = proposals.map(proposal => {
    const draft = proposal.scheda;
    const check = estimateChallenge(statsOf(draftToMonster(draft, "proposta")), reference as CrReference);
    return {
      id: proposal.id, nome: draft.nome, nickname: proposal.nickname, quando: formatWhen(new Date(proposal.creata_il), now),
      edizione: HOMEBREW_EDITION_LABEL[draft.edizione], gs: draft.grado_sfida,
      esito: { label: VERDICT_LABEL[check.esito], tone: check.esito === "in-linea" ? "ok" : "warn" },
      formato: mismatchedFormat({ edizione: draft.edizione, text: draftActionText(draft) }),
      simile: similarName(draft.nome, names.filter(name => name !== draft.nome || stato === "da-vedere")),
      email: !!proposal.email, stato: proposal.stato, motivo: proposal.motivo, homebrewId: proposal.homebrew_id, draft,
    };
  });
  const tab = (on: boolean) => `inline-flex min-h-11 shrink-0 items-center rounded-[22px] border-[1.5px] px-3.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-chip-border bg-card text-primary"}`;
  // «Correggi» shows the preview of the sheet: the same links as the published sheet.
  const display = { catalog: await getSpellReferenceCatalog(), hidden: await publicLinksOut() };
  return (
    <CardDisplayProvider value={display}>
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-8 pt-4 lg:max-w-[1200px]">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <h1 className="font-serif text-[30px] font-bold text-primary">Proposte homebrew</h1>
      <HomebrewSectionEye hidden={parts.includes("bestiario:homebrew")} />
      <nav aria-label="Stato delle proposte" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([key, label]) => (
          <Link key={key} href={key === "da-vedere" ? "/admin/proposte" : `/admin/proposte?stato=${key}`} aria-current={stato === key ? "page" : undefined} className={tab(stato === key)}>
            {label}{key === "da-vedere" ? ` · ${counts["da-vedere"]}` : ""}
          </Link>
        ))}
      </nav>
      <ProposalsNotice />
      {cards.length === 0 ? (
        <p className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-6 text-center text-[15px] text-muted">
          {stato === "da-vedere" ? "Nessuna proposta da vedere." : stato === "approvata" ? "Nessuna proposta approvata." : "Nessuna proposta rifiutata."}
        </p>
      ) : (
        <ul className="grid gap-2.5 lg:grid-cols-2" aria-label="Proposte">
          {cards.map(card => <ProposalCard key={card.id} data={card} />)}
        </ul>
      )}
    </div>
    </CardDisplayProvider>
  );
}
