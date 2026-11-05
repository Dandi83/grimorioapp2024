/**
 * «Pergamena illustrata» (PROMPT 64, passo 1): the ornaments shared by the pages, drawn with the classes of
 * app/globals.css (pg-*). They dress titles, frames and buttons; the text of the cards never changes.
 */

/** «Il Grimorio.App» with «I» and «G» as bordeaux capilettera and «.App» in amber; the text read aloud is unchanged. */
export function LogoGrimorio() {
  return <><span className="pg-lettera">I</span>l <span className="pg-lettera">G</span>rimorio<span className="text-amber">.App</span></>;
}

/** The small four-pointed star (✦) of the dividers. */
function Stella() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M6 0C6.5 3.6 8.4 5.5 12 6C8.4 6.5 6.5 8.4 6 12C5.5 8.4 3.6 6.5 0 6C3.6 5.5 5.5 3.6 6 0Z" fill="currentColor" />
    </svg>
  );
}

/** Two crossed swords (⚔), for «I miei personaggi»: blade, cross-guard, grip and pommel. */
function Spade() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false" fill="currentColor" stroke="currentColor" strokeLinecap="round">
      <path d="M2.5 2.5L15 12.8L12.8 15Z" stroke="none" />
      <path d="M11.9 16.3L16.3 11.9M14.6 14.6L17.8 17.8" fill="none" strokeWidth="1.7" />
      <circle cx="18.8" cy="18.8" r="1.3" stroke="none" />
      <path d="M19.5 2.5L7 12.8L9.2 15Z" stroke="none" />
      <path d="M10.1 16.3L5.7 11.9M7.4 14.6L4.2 17.8" fill="none" strokeWidth="1.7" />
      <circle cx="3.2" cy="18.8" r="1.3" stroke="none" />
    </svg>
  );
}

/** The thin line under a title, with ✦ (or ⚔) in the middle; «chiaro» on the dark picture of the Home. */
export function Divisore({ ornamento = "stella", chiaro = false, className = "" }: { ornamento?: "stella" | "spade"; chiaro?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" data-divisore={ornamento} className={`pg-divisore${chiaro ? " pg-divisore-chiaro" : ""} ${className}`}>
      {ornamento === "spade" ? <Spade /> : <Stella />}
    </div>
  );
}

/** The tilted stamp next to a title («BETA»). */
export function Timbro({ children, ...data }: { children: string } & Record<`data-${string}`, string>) {
  return <span className="pg-timbro" {...data}>{children}</span>;
}
