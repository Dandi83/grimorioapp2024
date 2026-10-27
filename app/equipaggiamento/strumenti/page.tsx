import { ToolsBrowser } from "@/components/equipment/tools-browser";
import { toolsSection } from "@/lib/tools";
import { tools2014GroupText, tools2014Intro } from "@/lib/tools-2014";
import { toolListRows } from "@/lib/tools-editions";
import { getCorrectedTools } from "@/lib/corrected-content";
import { sectionPage } from "@/lib/section-view";

export const metadata = { title: "Strumenti — Equipaggiamento — Il Grimorio.App" };

function Folded({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <details className="rounded-[14px] border border-border bg-card px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">{title}</summary>
      <div className="space-y-2 pb-3">{paragraphs.map((text, i) => <p key={i} className="text-[15px] leading-6">{text}</p>)}</div>
    </details>
  );
}

const groupText = (text?: string) => text ? <p className="border-x border-border bg-card px-3.5 py-2.5 text-[15px] leading-6 text-muted">{text}</p> : null;

// Manual corrections from the admin area appear within five minutes (at once after saving).
export const revalidate = 300;

export default async function ToolsPage() {
  // Before anything of the page: the gate of the layout runs in parallel and cannot stop what the page streams.
  await sectionPage("strumenti");
  const rows = toolListRows((await getCorrectedTools()).list);
  return (
    <ToolsBrowser
      rows={rows}
      intro={{
        "2024": <Folded title="Competenza negli strumenti" paragraphs={toolsSection("Competenza negli strumenti")} />,
        "2014": <Folded title="Come funzionano gli strumenti" paragraphs={[tools2014Intro]} />,
      }}
      groupTexts={{
        "2024": { artigiano: groupText(toolsSection("Strumenti da artigiano").join(" ")) },
        "2014": { artigiano: groupText(tools2014GroupText.artigiano), giochi: groupText(tools2014GroupText.giochi), musicali: groupText(tools2014GroupText.musicali) },
      }}
    />
  );
}
