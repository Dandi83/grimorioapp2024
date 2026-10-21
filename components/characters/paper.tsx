"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, Printer } from "lucide-react";
import template from "@/lib/data/character-paper-fields.json";
import { getPaperValue, setPaperValue } from "@/lib/paper-sheet";
import type { Character } from "@/lib/characters";
import { button } from "./fields";
type PaperField = (typeof template.fields)[number];
const pageTitles = ["Combattimento", "Personaggio e storia", "Equipaggiamento", "Incantesimi"];
const perPage = Array.from({ length: 4 }, (_, i) =>
  template.fields.filter((f) => f.page === i + 1),
);
function PaperInput({
  field,
  c,
  update,
}: {
  field: PaperField;
  c: Character;
  update: (p: Partial<Character>) => void;
}) {
  const value = getPaperValue(c, field.name);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const [x1, y1, x2, y2] = field.rect;
  const style: CSSProperties = {
    left: `${(x1 / template.width) * 100}%`,
    top: `${(y1 / template.height) * 100}%`,
    width: `${((x2 - x1) / template.width) * 100}%`,
    height: `${((y2 - y1) / template.height) * 100}%`,
    fontSize: `${(Math.min(field.font, Math.max(7, (y2 - y1) * 0.72)) / template.width) * 100}cqw`,
  };
  const commit = () => {
    const next = setPaperValue(c, field.name, draft);
    update(next);
    setDraft(String(getPaperValue(next, field.name)));
  };
  if (field.type === "checkbox")
    return (
      <input
        className="paper-field paper-checkbox"
        style={style}
        aria-label={field.name}
        title={field.name}
        type="checkbox"
        checked={value === true || value === "Yes"}
        onChange={(e) => update(setPaperValue(c, field.name, e.target.checked))}
      />
    );
  const props = {
    className: "paper-field paper-text",
    style,
    "aria-label": field.name,
    title: field.name,
    value: draft,
    maxLength: field.multiline ? 4000 : Math.max(40, Math.floor((x2 - x1) / 2)),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
  };
  return field.multiline ? (
    <textarea {...props} spellCheck={false} />
  ) : (
    <input
      {...props}
      autoComplete="off"
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
export function PaperSheet({
  c,
  update,
}: {
  c: Character;
  update: (p: Partial<Character>) => void;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [highlight, setHighlight] = useState(false);
  return (
    <section className="paper-view mt-5">
      <div className="paper-toolbar sticky top-0 z-20 rounded-t-2xl border border-border bg-card p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className={`${button} px-2`}
              disabled={page === 1}
              aria-label="Pagina precedente"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <label className="min-w-0 text-xs">
              <span className="sr-only">Pagina della scheda</span>
              <select
                aria-label="Pagina della scheda"
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-xs"
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
              >
                {pageTitles.map((title, i) => (
                  <option key={title} value={i + 1}>
                    {i + 1}. {title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`${button} px-2`}
              disabled={page === 4}
              aria-label="Pagina successiva"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <ZoomIn size={15} />
            <select
              aria-label="Zoom scheda"
              className="min-h-11 rounded-lg border border-border bg-background px-2"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={100}>Adatta</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
              <option value={250}>250%</option>
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
            />
            Evidenzia campi editabili
          </label>
          <button className={`${button} text-xs`} onClick={() => window.print()}>
            <Printer size={14} />
            Stampa
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          Scrivi direttamente nei riquadri. Su telefono usa lo zoom e scorri la pagina. I campi
          principali sono collegati alla gestione rapida; gli altri sono liberi. La stampa produce
          una copia statica.
        </p>
      </div>
      <div
        className="paper-scroll overflow-x-auto rounded-b-xl border-x border-b border-border bg-neutral-700/30 p-1 sm:p-3"
        tabIndex={0}
        aria-label="Scheda personaggio, area scorrevole"
      >
        <div className="paper-stack" style={{ width: `${zoom}%` }}>
          {perPage.map((fields, i) => (
            <div
              key={i}
              className={`paper-page relative bg-white text-black shadow-xl ${page === i + 1 ? "block" : "hidden"}`}
              data-page={i + 1}
              data-highlight={highlight}
              style={{
                aspectRatio: `${template.width} / ${template.height}`,
                containerType: "inline-size",
              }}
            >
              {/* The original user-supplied page is the visual template; inputs preserve its exact field coordinates. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/character-sheet/page-${i + 1}.webp`}
                width={1191}
                height={1684}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              {fields.map((field) => (
                <PaperInput key={field.name} field={field} c={c} update={update} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="paper-credit mt-3 text-[10px] leading-5 text-muted">
        Modello fornito dall’utente: scheda Dragons’ Lair, v.1.2 (2017). Grafica e attribuzione
        originali conservate. Le etichette del modello restano quelle originali; la base dati
        dell’app continua a usare Specie e SRD 2024.
      </p>
    </section>
  );
}
