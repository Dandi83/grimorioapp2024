import Link from "next/link";

import { InstallHere } from "@/components/install/install-here";
import { OPEN_BROWSER, STEPS } from "@/lib/install-guide";

export const metadata = { title: "Installa l’app — Il Grimorio.App" };

const GROUPS: { title: string; note?: string; items: { name: string; steps: readonly string[] }[] }[] = [
  {
    title: "iPhone e iPad",
    note: "Da iOS 16.4 si installa da Safari, Chrome, Edge, Firefox e Opera; prima solo da Safari.",
    items: [
      { name: "Safari", steps: STEPS.ios.safari },
      { name: "Chrome", steps: STEPS.ios.chrome },
      { name: "Edge", steps: STEPS.ios.edge },
      { name: "Firefox", steps: STEPS.ios.firefox },
      { name: "Opera e altri browser", steps: STEPS.ios.other },
    ],
  },
  {
    title: "Android",
    note: "Chrome, Edge, Samsung Internet e Opera spesso mostrano direttamente il pulsante «Installa».",
    items: [
      { name: "Chrome", steps: STEPS.android.chrome },
      { name: "Samsung Internet", steps: STEPS.android.samsung },
      { name: "Edge", steps: STEPS.android.edge },
      { name: "Firefox", steps: STEPS.android.firefox },
      { name: "Huawei Browser", steps: STEPS.android.huawei },
      { name: "Mi Browser (Xiaomi)", steps: STEPS.android.mi },
      { name: "Opera", steps: STEPS.android.opera },
    ],
  },
  {
    title: "Computer",
    note: "Firefox per computer non installa i siti come app: usa Chrome, Edge o Safari.",
    items: [
      { name: "Chrome", steps: STEPS.desktop.chrome },
      { name: "Edge", steps: STEPS.desktop.edge },
      { name: "Safari su Mac (macOS Sonoma o successivo)", steps: STEPS.desktop.safari },
    ],
  },
  {
    title: "Dentro WhatsApp, Telegram, Instagram, Facebook, Messenger e TikTok",
    note: "Il browser interno di queste app non installa le app: apri il link nel browser del telefono.",
    items: [{ name: "Apri nel browser", steps: OPEN_BROWSER }],
  },
];

/** How to install the app, every browser; the one in use first (components/install/install-here.tsx). From /info. */
export default function InstallPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 pb-8 pt-4 sm:px-6">
      <Link href="/info" className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary">‹ Info e note legali</Link>
      <h1 className="mt-1 font-serif text-[34px] font-bold leading-tight text-primary">Installa l’app</h1>
      <p className="mt-2 text-[16px] leading-snug text-muted">
        Il Grimorio.App si aggiunge alla schermata Home come un’app: si apre a schermo intero e le pagine già aperte restano leggibili anche senza rete. Non serve nessuno store.
      </p>
      <InstallHere />
      {GROUPS.map(group => (
        <section key={group.title} className="mt-7">
          <h2 className="font-serif text-[24px] font-bold leading-tight text-foreground">{group.title}</h2>
          {group.note && <p className="mt-1 text-[14px] leading-snug text-muted">{group.note}</p>}
          <div className="mt-3 flex flex-col gap-2">
            {group.items.map(item => (
              <details key={item.name} className="rounded-[14px] border border-border bg-card px-4 py-1 [&[open]]:pb-3">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-foreground">{item.name}</summary>
                <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-snug text-card-foreground">
                  {item.steps.map(step => <li key={step}>{step}</li>)}
                </ol>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-7 border-t border-divider pt-4 text-[14px] leading-6 text-muted">
        I preferiti salvati nel browser restano in quel browser: l’app installata da un altro browser parte con i suoi.
      </p>
    </article>
  );
}
