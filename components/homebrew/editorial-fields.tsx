"use client";

import { useState } from "react";
import { Eye, EyeOff, ImageUp, Trash2 } from "lucide-react";

import { EDITORIAL_LABEL, EDITORIAL_LIMITS, SECTION_LABEL } from "@/lib/editorial-draft";
import { EDITORIAL_SECTIONS, type HideableSection, type HomebrewDraft } from "@/lib/homebrew-types";
import { pictureSrc } from "@/components/monster-picture";

/**
 * Reserved area only (PROMPT 44): what the creatures «Dalla redazione» have more than the community's. Never imported by
 * a public page, so none of it is in the public bundle.
 */

const inputClass = "w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none focus:border-primary";
const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";

/** The eye of one section: «Visibile» or «Nascosta» to the public, saved with the rest of the card. */
export function SectionEye({ section, value, onChange }: { section: HideableSection; value: HomebrewDraft; onChange: (draft: HomebrewDraft) => void }) {
  const hidden = !!value.sezioni_nascoste?.includes(section);
  const toggle = () => {
    const next = hidden ? (value.sezioni_nascoste ?? []).filter(key => key !== section) : [...(value.sezioni_nascoste ?? []), section];
    const { sezioni_nascoste: _drop, ...rest } = value;
    void _drop;
    onChange(next.length ? { ...rest, sezioni_nascoste: next } : rest);
  };
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {hidden && <span className="rounded-full bg-[#2B2118] px-2.5 py-0.5 text-[12px] font-bold text-[#FFFBF0]" data-hidden-label={section}>Nascosta al pubblico</span>}
      <button type="button" onClick={toggle} aria-pressed={hidden} data-section-eye={section}
        aria-label={hidden ? `Mostra «${SECTION_LABEL[section]}» al pubblico` : `Nascondi «${SECTION_LABEL[section]}» al pubblico`}
        title={hidden ? "Nascosta: tocca per mostrarla" : "Visibile: tocca per nasconderla"}
        className={`flex min-h-11 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold ${hidden ? "text-primary" : "text-muted"}`}>
        {hidden ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        <span>{hidden ? "Nascosta" : "Visibile"}</span>
      </button>
    </span>
  );
}

/** Photos are made smaller in the browser first (at most 2400 px, under 4 MB), the server makes the three WebP sizes. */
async function smaller(file: File): Promise<Blob> {
  if (file.size <= 3_500_000 && typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 3_500_000) { bitmap.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#F6EFDF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/jpeg", 0.9));
  } catch {
    return file;
  }
}

type Sizes = Record<"s" | "m" | "l", { w: number; h: number; bytes: number }>;

/** The five sections under the legendary actions, then the picture with its alternative text and credits. */
export function EditorialFields({ value, onChange, idPrefix }: { value: HomebrewDraft; onChange: (draft: HomebrewDraft) => void; idPrefix: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sizes, setSizes] = useState<Sizes | null>(null);
  const id = (name: string) => `${idPrefix}-${name}`;
  const set = (key: keyof HomebrewDraft, next: string) => {
    const copy = { ...value } as Record<string, unknown>;
    if (next) copy[key] = next; else delete copy[key];
    onChange(copy as unknown as HomebrewDraft);
  };
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/^image\/(jpeg|png)$/.test(file.type)) { setError("Usa un’immagine JPG o PNG."); return; }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("immagine", await smaller(file), file.name);
      const response = await fetch("/api/admin/immagine-mostro", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => ({ error: "Caricamento non riuscito." }));
      if (!response.ok) throw new Error(result.error || "Caricamento non riuscito.");
      onChange({ ...value, immagine: { v: result.v, w: result.w, h: result.h } });
      setSizes(result.sizes);
    } catch (problem) {
      setError((problem as Error).message || "Caricamento non riuscito. Riprova.");
    } finally {
      setUploading(false);
    }
  }
  const removePicture = () => {
    const { immagine: _drop, ...rest } = value;
    void _drop;
    onChange(rest);
    setSizes(null);
  };
  return (
    <>
      {EDITORIAL_SECTIONS.map(section => (
        <section key={section} className="rounded-[14px] border-[1.5px] border-border bg-card p-4" data-editorial-field={section}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-bold text-primary"><label htmlFor={id(section)}>{EDITORIAL_LABEL[section]}</label></h2>
            <SectionEye section={section} value={value} onChange={onChange} />
          </div>
          <p className="mt-0.5 text-[13px] leading-5 text-muted">Facoltativa. Paragrafi separati da una riga vuota; **grassetto**, *corsivo*.</p>
          <textarea id={id(section)} value={value[section] ?? ""} rows={4} maxLength={EDITORIAL_LIMITS.section}
            onChange={event => set(section, event.target.value)} className={`${inputClass} mt-3 min-h-28`} />
        </section>
      ))}
      <section className="rounded-[14px] border-[1.5px] border-border bg-card p-4" data-editorial-picture="">
        <h2 className="font-serif text-xl font-bold text-primary">Immagine</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">Facoltativa. JPG o PNG: diventa WebP sotto i 150 KB, in tre misure (telefono, tablet, computer). Compare sotto l’intestazione della scheda.</p>
        {value.immagine && (
          <figure className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- the saved WebP, from the reserved area */}
            <img src={pictureSrc(value.immagine.v, "m")} alt={value.immagine_alt ?? ""} width={value.immagine.w} height={value.immagine.h} className="block h-auto w-full rounded-[12px] border border-border" data-picture-preview="" />
            {sizes && <figcaption className="mt-1 text-[12px] text-muted" data-picture-sizes="">
              {(["s", "m", "l"] as const).map(size => `${sizes[size].w}×${sizes[size].h} · ${Math.round(sizes[size].bytes / 1024)} KB`).join(" — ")}
            </figcaption>}
          </figure>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-primary/40 px-4 text-[15px] font-semibold text-primary ${uploading ? "opacity-60" : ""}`}>
            <ImageUp size={18} aria-hidden="true" />{uploading ? "Conversione…" : value.immagine ? "Cambia immagine" : "Carica immagine"}
            <input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={uploading} data-picture-input=""
              onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
          {value.immagine && (
            <button type="button" onClick={removePicture} className="flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-[15px] font-semibold text-muted">
              <Trash2 size={16} aria-hidden="true" />Togli immagine
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-primary">{error}</p>}
        <div className="mt-3">
          <label htmlFor={id("immagine-alt")} className={labelClass}>Testo alternativo{value.immagine ? " *" : ""}</label>
          <input id={id("immagine-alt")} value={value.immagine_alt ?? ""} maxLength={EDITORIAL_LIMITS.alt} onChange={event => set("immagine_alt", event.target.value)}
            placeholder="Cosa si vede, per chi non può vedere l’immagine" className={inputClass} />
        </div>
        <div className="mt-3">
          <label htmlFor={id("immagine-crediti")} className={labelClass}>Crediti</label>
          <input id={id("immagine-crediti")} value={value.immagine_crediti ?? ""} maxLength={EDITORIAL_LIMITS.crediti} onChange={event => set("immagine_crediti", event.target.value)}
            placeholder="Es. Illustrazione di …" className={inputClass} />
        </div>
      </section>
    </>
  );
}

/** The fields of «Dalla redazione» of a draft, sent with the checked draft (parseDraft keeps only the shared ones). */
export function editorialPart(draft: HomebrewDraft): Partial<HomebrewDraft> {
  const keys = [...EDITORIAL_SECTIONS, "sezioni_nascoste", "immagine", "immagine_alt", "immagine_crediti", "testo_ricco"] as const;
  return Object.fromEntries(keys.filter(key => draft[key] !== undefined && draft[key] !== "").map(key => [key, draft[key]])) as Partial<HomebrewDraft>;
}
