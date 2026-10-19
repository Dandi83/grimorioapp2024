"use client";
import type { ReactNode } from "react";
import { digitalGroup, digitalGroups, abilityNames, type DigitalGroup } from "@/lib/digital-sheet";
import { getPaperValue } from "@/lib/paper-sheet";
import type { Character } from "@/lib/characters";
import { CharacterDashboard } from "./dashboard";
function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6 pb-5">
      <h2 className="mb-3 border-b border-primary/25 pb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Line({ label, value }: { label: string; value: string }) {
  return value.trim() ? (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
      <strong className="font-bold text-primary">{label}.</strong> {value}
    </p>
  ) : null;
}
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="break-words font-serif text-xl leading-6 text-foreground">{value || "—"}</p>
    </div>
  );
}
export function GeneratedCharacterSheet({
  c,
  onChange,
  onPortrait,
}: {
  c: Character;
  onChange?: (next: Character) => void;
  onPortrait?: (portrait: string) => void;
}) {
  const value = (name: string) => String(getPaperValue(c, name));
  const checked = (name: string) =>
    getPaperValue(c, name) === true || getPaperValue(c, name) === "Yes";
  const used = (group: DigitalGroup) =>
    group.fields.filter((f) => f.type === "checkbox" && checked(f.name)).length;
  const populated = (g: DigitalGroup) =>
    g.fields.some((f) => (f.type === "checkbox" ? checked(f.name) : value(f.name).trim() !== ""));
  const lines = (group: DigitalGroup) =>
    group.fields
      .filter((f) => f.type === "text")
      .map((f) => <Line key={f.name} label={f.label} value={value(f.name)} />);
  const identity = digitalGroup("identity");
  const attacks = digitalGroups.filter((g) => g.id.startsWith("attack-") && populated(g));
  const ammo = digitalGroups.filter((g) => g.id.startsWith("ammo-") && populated(g));
  const features = digitalGroups.filter((g) => g.id.startsWith("feature-") && populated(g));
  const subtitle = [value("Razza"), value("Background"), value("Allineamento")]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      className="generated-character -mx-5 mt-4 overflow-hidden rounded-t-2xl border-t border-primary/20 bg-background"
      aria-label="Scheda personaggio generata"
    >
      <CharacterDashboard c={c} onChange={onChange} onPortrait={onPortrait} />
      <details className="pg-full-sheet">
        <summary>Tutti i parametri della scheda · dettagli completi</summary>
        <header className="relative flex min-h-[300px] items-end overflow-hidden">
          {/* The exact same atmospheric backdrop and visual hierarchy used by monster details. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-bestiario.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/65 to-background" />
          <div className="relative w-full p-6">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-elevated/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {value("Classe e livello") || `Livello ${c.level}`}
            </span>
            <p className="mb-2 text-[10px] uppercase tracking-[.2em] text-primary">
              Scheda personaggio
            </p>
            <h1 className="break-words font-serif text-4xl font-bold leading-tight tracking-tight text-foreground">
              {value("Nome")}
            </h1>
            {subtitle && <p className="mt-2 break-words text-sm italic text-muted">{subtitle}</p>}
            {c.subclass && <p className="mt-1 text-xs text-muted">{c.subclass}</p>}
          </div>
        </header>
        <div className="grid grid-cols-2 gap-3 p-6">
          <Cell label="Classe armatura" value={value("Classe armatura")} />
          <Cell
            label="Punti ferita"
            value={`${value("Ferite")} / ${value("PUNTI FERITA TOTALI")}`}
          />
          <Cell label="Velocità" value={`${value("Movimento base")} m`} />
          <Cell label="Iniziativa" value={value("Iniziativa")} />
          <Cell label="Bonus di competenza" value={value("Bonus competenza")} />
          <Cell label="PF temporanei" value={value("PF temp")} />
        </div>
        <ContentSection title="Caratteristiche">
          <div className="grid grid-cols-3 gap-3">
            {abilityNames.map((a, i) => {
              const fields = digitalGroup(`ability-${a}`).fields;
              return (
                <div
                  key={a}
                  className="flex min-w-0 flex-col items-center rounded-xl border border-border bg-card px-2 py-3"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {["FOR", "DES", "COS", "INT", "SAG", "CAR"][i]}
                  </span>
                  <span className="break-all text-center font-serif text-xl font-bold leading-7">
                    {value(fields[0].name)}
                  </span>
                  <span className="break-all text-center text-xs font-semibold text-primary">
                    {value(fields[1].name)}
                  </span>
                </div>
              );
            })}
          </div>
        </ContentSection>
        <section
          className="mx-6 mb-5 space-y-1 rounded-xl border border-border bg-card p-4"
          aria-label="Statistiche e difese"
        >
          <Line
            label="Tiri salvezza"
            value={abilityNames
              .map((a) => {
                const g = digitalGroup(`ability-${a}`);
                const f = g.fields.find(
                  (f) => f.type === "text" && f.label === "Bonus tiro salvezza",
                )!;
                const proficient = g.fields.find((f) => f.type === "checkbox")!;
                return `${a} ${value(f.name)}${checked(proficient.name) ? " (competente)" : ""}`;
              })
              .join(", ")}
          />
          {lines(digitalGroup("armor"))}
          {lines(digitalGroup("resistances"))}
          <Line label="Ispirazione" value={value("VRI1.5")} />
          <Line label="Condizioni attive" value={c.conditions.join(", ")} />
        </section>
        <ContentSection title="Abilità">
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {digitalGroups
              .filter((g) => g.id.startsWith("skill-"))
              .map((g) => {
                const f = g.fields.find((f) => f.type === "text")!;
                const check = g.fields.filter((f) => f.type === "checkbox");
                const rank = checked(check[1].name)
                  ? "Maestria"
                  : checked(check[0].name)
                    ? "Competenza"
                    : "";
                return (
                  <div
                    key={g.id}
                    className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 pb-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span>{g.title}</span>
                      {rank && <span className="mt-0.5 block text-[10px] text-muted">{rank}</span>}
                      {g.title === "Furtività" &&
                        c.paperFields?.["digital-armor-penalty"] === true && (
                          <span className="block text-[10px] text-muted">
                            Svantaggio per armatura
                          </span>
                        )}
                    </div>
                    <strong className="max-w-[50%] break-words text-right text-primary">
                      {value(f.name)}
                    </strong>
                  </div>
                );
              })}
          </div>
        </ContentSection>
        <ContentSection title="Sensi e movimento">
          <div className="space-y-1">
            {digitalGroup("senses")
              .fields.filter((f) => f.name !== "Movimento base")
              .map((f) => (
                <Line key={f.name} label={f.label} value={value(f.name)} />
              ))}
          </div>
        </ContentSection>
        <ContentSection title="Dadi vita e tiri contro morte">
          <Line
            label="Dadi vita"
            value={`${value("DADI VITA TOTALI")} · ${used(digitalGroup("hitdice"))} usati`}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Cell
              label="Successi contro morte"
              value={`${used(digitalGroup("death-success"))} / 3`}
            />
            <Cell
              label="Fallimenti contro morte"
              value={`${used(digitalGroup("death-failure"))} / 3`}
            />
          </div>
        </ContentSection>
        <ContentSection title="Attacchi">
          {attacks.length ? (
            attacks.map((g) => (
              <div
                key={g.id}
                className="mb-4 border-b border-border/60 pb-4 last:mb-0 last:border-0"
              >
                <h3 className="mb-1 break-words font-serif text-xl font-bold text-primary">
                  {value(g.fields[0].name) || g.title}
                </h3>
                {g.fields.slice(1).map((f) => (
                  <Line key={f.name} label={f.label} value={value(f.name)} />
                ))}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Nessun attacco compilato.</p>
          )}
        </ContentSection>
        {ammo.length > 0 && (
          <ContentSection title="Munizioni">
            {ammo.map((g) => (
              <Line
                key={g.id}
                label={value(g.fields[0].name) || g.title}
                value={`${used(g)} / 20 usi segnati`}
              />
            ))}
          </ContentSection>
        )}
        <ContentSection title="Talenti, privilegi e capacità">
          {features.map((g) => (
            <div key={g.id} className="mb-4 border-b border-border/60 pb-3">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
                {value(g.fields[0].name) || g.title}
              </p>
              <p className="mt-1 text-xs leading-6 text-muted">
                Recupero: {checked(g.fields[1].name) ? "riposo lungo" : "riposo breve o lungo"} ·
                Usi spesi: {used({ ...g, fields: g.fields.slice(2) })} / 5
              </p>
            </div>
          ))}
          {c.resources.map((r) => (
            <Line
              key={r.id}
              label={r.name}
              value={`${r.current} / ${r.max} usi disponibili${r.recovery ? ` · ${r.recovery}` : ""}`}
            />
          ))}
          {c.features && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7">
              {c.features}
            </p>
          )}
          {!features.length && !c.resources.length && !c.features && (
            <p className="text-sm text-muted">Nessuna capacità compilata.</p>
          )}
        </ContentSection>
        <ContentSection title="Identità e progressione">
          <div className="space-y-1">
            {identity.fields
              .filter(
                (f) =>
                  !["Nome", "Classe e livello", "Razza", "Background", "Allineamento"].includes(
                    f.name,
                  ),
              )
              .map((f) => (
                <Line key={f.name} label={f.label} value={value(f.name)} />
              ))}
          </div>
        </ContentSection>
        {c.description && (
          <ContentSection title="Descrizione">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{c.description}</p>
          </ContentSection>
        )}
      </details>
      <aside className="mx-6 mb-6 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted">
        Usa i comandi rapidi per aggiornare la plancia oppure “Modifica scheda” per tutti i campi.
        Le modifiche restano in questa sessione: il salvataggio cloud non è ancora attivo.
      </aside>
    </article>
  );
}
