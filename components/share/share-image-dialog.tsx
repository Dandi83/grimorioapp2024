"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { friendLink, type ShareCard, type ShareFormat } from "@/lib/share-card";
import { cardFile, fontsReady, type CardFile } from "@/lib/share-card-draw";

/**
 * «Condividi come immagine» (PROMPT 50): the preview of the card and three buttons. Loaded only when the menu item
 * is tapped (components/share-button.tsx imports it on demand): the initial bundle does not carry it.
 * Both formats are made when the window opens, so the phone's share menu opens at once on the tap.
 */

type ImageEvent = "share_image_open" | "share_image_sent" | "share_image_saved";
/** Told to the statistics (components/analytics-provider.tsx), which send it only for a counted browser. */
function track(event: ImageEvent, format: ShareFormat, kind: ShareCard["kind"]) {
  window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event, format, kind } }));
}

/** The English name of a sheet in the public search index (/ricerca-indice.json), if the administrator approved one. */
async function englishFromSearch(path: string): Promise<string | undefined> {
  try {
    const index = (await (await fetch("/ricerca-indice.json")).json()) as { rows?: unknown[][]; en?: [string, number][] };
    // [section, name, label, address, address of the 2014 edition, …] (lib/search.ts SearchIndex).
    const at = (index.rows ?? []).findIndex(row => row[3] === path || row[4] === path);
    const names = (index.en ?? []).filter(([, row]) => row === at).map(([name]) => name);
    // Both editions on one row: the 2024 name first, the 2014 one after when it differs.
    return at < 0 ? undefined : index.rows![at][4] === path ? names.at(-1) : names[0];
  } catch {
    return undefined;
  }
}

const LABEL: Record<ShareFormat, string> = { storia: "Storia Instagram", quadrato: "Quadrato" };

/** The alternative text of the preview: what the card says, in the order it is drawn. */
const describe = (card: ShareCard) => [
  `Card di «${card.title}»${card.en ? ` (${card.en})` : ""}`, card.kicker, ...card.boxes.map(box => `${box.label}: ${box.value}`), card.excerpt, card.attribution, "Il Grimorio.App, ilgrimorio.app",
].filter(Boolean).join(". ").replace(/\.\./g, ".");

export default function ShareImageDialog({ card, path, onClose }: { card: ShareCard; path: string; onClose: () => void }) {
  // The name of the file: «grimorio-<last part of the address>-<format>».
  const slug = path.split("?")[0].split("/").filter(Boolean).pop() || "scheda";
  const [shown, setShown] = useState<ShareFormat>("storia");
  const [files, setFiles] = useState<Partial<Record<ShareFormat, CardFile>>>({});
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const making = useRef<Partial<Record<ShareFormat, Promise<CardFile>>>>({});
  const close = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // A NO SRD sheet: its approved English name from the search index (never in the page), read once.
  const named = useRef<Promise<ShareCard>>(undefined);
  const make = useCallback((format: ShareFormat) => {
    named.current ??= card.enFromSearch ? englishFromSearch(path).then(en => (en ? { ...card, en } : card)) : Promise.resolve(card);
    making.current[format] ??= Promise.all([fontsReady(), named.current]).then(([, drawn]) => cardFile(drawn, format, slug)).then(made => {
      setFiles(current => ({ ...current, [format]: made }));
      return made;
    });
    return making.current[format]!;
  }, [card, path, slug]);

  useEffect(() => {
    close.current?.focus();
    track("share_image_open", "storia", card.kind);
    // The story first (the preview), then the square.
    make("storia").then(() => make("quadrato")).catch(() => setFailed(true));
  }, [card.kind, make]);

  useEffect(() => () => {
    for (const promise of Object.values(making.current)) void promise?.then(made => URL.revokeObjectURL(made.url), () => undefined);
  }, []);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      // The focus stays in the window (Tab and Shift+Tab go round).
      if (event.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  function save(made: CardFile, format: ShareFormat) {
    const link = document.createElement("a");
    link.href = made.url;
    link.download = made.file.name;
    document.body.append(link);
    link.click();
    link.remove();
    track("share_image_saved", format, card.kind);
    setMessage("Immagine salvata.");
  }

  async function share(format: ShareFormat) {
    setShown(format);
    setMessage("");
    // Ready since the window opened; otherwise it is awaited (the phone may then ask for another tap).
    const made = files[format] ?? await make(format).catch(() => undefined);
    if (!made) { setFailed(true); return; }
    const data: ShareData = { files: [made.file] };
    // Square: also the name and the link of the sheet with the friend's mark (WhatsApp and Telegram show it as a caption).
    if (format === "quadrato") data.text = `${card.title} — Il Grimorio.App\n${friendLink(path)}`;
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [made.file] })) {
      try {
        await navigator.share(data);
        track("share_image_sent", format, card.kind);
        setMessage("Immagine condivisa.");
        return;
      } catch (error) {
        // The phone's menu closed: not an error, nothing to say.
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }
    // No sharing of files here (many computers): the file is downloaded.
    save(made, format);
  }

  const current = files[shown];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#2B2118]/60 sm:items-center" data-share-dialog=""
      onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="share-image-title"
        className="max-h-[100dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[20px] border border-border bg-card p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-[20px]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="share-image-title" className="font-serif text-[22px] font-bold leading-tight">Condividi come immagine</h2>
          <button ref={close} type="button" onClick={onClose} aria-label="Chiudi" className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex h-[min(46dvh,420px)] items-center justify-center rounded-[14px] bg-elevated p-2">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob made by the phone, not an asset of the site
            <img src={current.url} alt={describe(card)} className="max-h-full max-w-full rounded-[8px] object-contain shadow"
              data-share-preview={shown} data-theme={card.theme} data-kind={card.kind} data-excerpt={card.excerpt} data-attribution={card.attribution ?? ""} data-ms={current.ms} data-bytes={current.file.size} data-type={current.file.type} data-width={current.width} data-height={current.height} />
          ) : failed ? <p className="px-4 text-center text-[15px] text-muted" role="alert">Non è stato possibile creare l’immagine su questo dispositivo.</p>
            : <p className="text-[15px] text-muted" aria-live="polite">Preparo la card…</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["storia", "quadrato"] as const).map(format => (
            <button key={format} type="button" onClick={() => void share(format)} disabled={failed} data-share-format={format} aria-pressed={shown === format}
              className={`min-h-12 rounded-[12px] border px-3 text-[16px] font-bold disabled:opacity-50 ${shown === format ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>
              {LABEL[format]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-muted">Su Instagram aggiungi lo sticker Link per far aprire la scheda</p>
        <button type="button" onClick={() => current && save(current, shown)} disabled={!current} data-share-save=""
          className="mt-3 min-h-12 w-full rounded-[12px] border border-primary/40 bg-background px-3 text-[16px] font-bold text-primary disabled:opacity-50">
          Salva immagine
        </button>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-center text-[14px] text-primary">{message}</p>
      </div>
    </div>
  );
}
