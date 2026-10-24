import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminLogin } from "@/components/admin-login";
import { ChallengeCheck } from "@/components/homebrew/homebrew-editor";
import { HomebrewSheet } from "@/components/homebrew/homebrew-sheet";
import { isAdmin } from "@/lib/admin-auth";
import reference from "@/lib/data/gs-riferimento.json";
import { getProposal } from "@/lib/homebrew";
import { estimateChallenge, statsOf, type CrReference } from "@/lib/homebrew-cr";
import { draftToMonster } from "@/lib/homebrew-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anteprima della proposta — Il Grimorio.App", robots: { index: false, follow: false } };

/** «Anteprima»: the sheet exactly as the public would see it, then the challenge check (never on the public sheet). */
export default async function ProposalPreview({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const proposal = await getProposal((await params).id);
  if (!proposal) notFound();
  const monster = { ...draftToMonster(proposal.scheda, "anteprima"), homebrew_edizione: proposal.scheda.edizione, homebrew_autore: proposal.nickname };
  return (
    <div className="pb-8">
      <div className="px-6 pt-4">
        <Link href="/admin/proposte" className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary">‹ Proposte</Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Anteprima · non ancora pubblicata</p>
      </div>
      <HomebrewSheet monster={monster} />
      <div className="mx-6"><ChallengeCheck check={estimateChallenge(statsOf(monster), reference as CrReference)} declared={proposal.scheda.grado_sfida} /></div>
    </div>
  );
}
