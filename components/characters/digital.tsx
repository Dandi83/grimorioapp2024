"use client";
import { useEffect, useState } from "react";
import {
  Heart,
  Shield,
  Swords,
  Sparkles,
  Minus,
  Plus,
  RotateCcw,
  ChevronDown,
  Eye,
  UserRound,
  Compass,
  BookOpen,
} from "lucide-react";
import { getPaperValue, setPaperValue } from "@/lib/paper-sheet";
import {
  digitalGroup,
  digitalGroups,
  abilityNames,
  commitDigitalValue,
  type DigitalField,
  type DigitalGroup,
} from "@/lib/digital-sheet";
import { applyDamage, type Character } from "@/lib/characters";
import { button, control, Field, NumberField } from "./fields";
type Props = { c: Character; update: (p: Partial<Character>) => void };
function Entry({ field, c, update }: { field: DigitalField } & Props) {
  const value = getPaperValue(c, field.name);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const overridden =
    (!!c.paperFields && Object.hasOwn(c.paperFields, field.name)) ||
    (field.name === "Iniziativa" && c.initiativeOverride !== "");
  const commit = () => {
    const next = commitDigitalValue(c, field.name, draft);
    if (next !== c) update(next);
    setDraft(String(getPaperValue(next, field.name)));
  };
  if (field.type === "checkbox")
    return (
      <label className="digital-check flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted">
        <input
          className="h-5 w-5 shrink-0 accent-[#7A1F2B]"
          type="checkbox"
          checked={value === true || value === "Yes"}
          onChange={(e) => update(setPaperValue(c, field.name, e.target.checked))}
        />
        {field.label}
      </label>
    );
  return (
    <div className="min-w-0">
      <Field label={field.label}>
        {field.long ? (
          <textarea
            className={`${control} min-h-24 resize-y`}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <input
            className={control}
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        )}
      </Field>
      {field.automatic && (
        <div className="mt-1 flex min-h-6 items-center justify-between gap-1 text-[10px] text-primary/80">
          <span>{overridden ? "Correzione manuale" : "Calcolato · modificabile"}</span>
          {overridden && (
            <button
              type="button"
              className="inline-flex min-h-8 items-center gap-1 underline"
              aria-label={`Ripristina calcolo ${field.label}`}
              onClick={() => {
                const paperFields = { ...c.paperFields };
                delete paperFields[field.name];
                update(
                  field.name === "Iniziativa"
                    ? { paperFields, initiativeOverride: "" }
                    : { paperFields },
                );
              }}
            >
              <RotateCcw size={11} />
              Ripristina
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function Card({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="digital-card min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      {kicker && (
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[.2em] text-primary">{kicker}</p>
      )}
      <h3 className="font-serif text-2xl font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Entries({
  group,
  c,
  update,
  columns = true,
}: { group: DigitalGroup; columns?: boolean } & Props) {
  return (
    <div className={columns ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid gap-4"}>
      {group.fields.map((f) => (
        <Entry key={f.name} field={f} c={c} update={update} />
      ))}
    </div>
  );
}
function Track({ group, c, update, label }: { group: DigitalGroup; label?: string } & Props) {
  const checks = group.fields.filter((f) => f.type === "checkbox");
  const used = checks.filter(
    (f) => getPaperValue(c, f.name) === true || getPaperValue(c, f.name) === "Yes",
  ).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{label || group.title}</span>
        <span className="text-xs font-semibold tabular-nums text-primary">
          {used} / {checks.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {checks.map((f, i) => (
          <button
            key={f.name}
            type="button"
            aria-label={f.label}
            aria-pressed={getPaperValue(c, f.name) === true || getPaperValue(c, f.name) === "Yes"}
            onClick={() =>
              update(
                setPaperValue(
                  c,
                  f.name,
                  !(getPaperValue(c, f.name) === true || getPaperValue(c, f.name) === "Yes"),
                ),
              )
            }
            className={`flex h-11 min-w-11 items-center justify-center rounded-xl border text-xs font-semibold tabular-nums transition-colors ${getPaperValue(c, f.name) === true || getPaperValue(c, f.name) === "Yes" ? "border-primary/60 bg-primary/15 text-primary" : "border-border bg-background text-muted"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
const tabs = [
  ["overview", "Essenziale"],
  ["abilities", "Caratteristiche"],
  ["weapons", "Armi e munizioni"],
  ["features", "Talenti e capacità"],
] as const;
export function DigitalSheet({ c, update }: Props) {
  const [tab, setTab] = useState<string>("overview");
  const [amount, setAmount] = useState(1);
  const props = { c, update };
  const val = (name: string) => String(getPaperValue(c, name));
  return (
    <div className="digital-sheet mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.22em] text-primary">
            Scheda digitale · 01
          </p>
          <h2 className="mt-1 font-serif text-3xl">Il cuore dell’avventura</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary">
          <Swords size={20} strokeWidth={1.4} />
        </div>
      </div>
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <Heart size={14} />
              Punti ferita
            </p>
            <p className="my-2 font-serif text-6xl font-semibold tabular-nums">
              {c.hp}
              <span className="ml-2 text-2xl text-muted">/ {c.hpMax}</span>
            </p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
            +{c.tempHp} temporanei
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Punti ferita rimanenti"
          aria-valuemin={0}
          aria-valuemax={c.hpMax}
          aria-valuenow={c.hp}
          className="my-3 h-1.5 overflow-hidden rounded-full bg-elevated"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(c.hp / c.hpMax) * 100}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-primary/15">
          {[
            [Shield, "Difesa", val("Classe armatura")],
            [Swords, "Iniziativa", val("Iniziativa")],
            [Sparkles, "Competenza", val("Bonus competenza")],
          ].map(([Icon, label, v]) => {
            const I = Icon as typeof Shield;
            return (
              <div key={String(label)} className="text-center">
                <I size={15} strokeWidth={1.5} className="mx-auto mb-1 text-primary" />
                <p className="font-serif text-3xl tabular-nums">{String(v)}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted">{String(label)}</p>
              </div>
            );
          })}
        </div>
      </section>
      <nav
        className="sticky top-0 z-20 -mx-1 my-5 rounded-xl border border-border bg-background/95 p-1 backdrop-blur"
        aria-label="Sezioni prima pagina"
      >
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              className={`min-h-11 rounded-lg px-2 py-2 text-[11px] font-semibold ${tab === id ? "bg-primary text-primary-foreground" : "text-muted hover:bg-card"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      <div className="space-y-4">
        {tab === "overview" && (
          <>
            <Card title="Pronto per il prossimo turno" kicker="Vitalità">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {digitalGroup("hp").fields.map((f) => (
                  <Entry key={f.name} field={f} {...props} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
                <NumberField label="Quantità" value={amount} min={1} onChange={setAmount} />
                <button
                  className={`${button} px-2 text-red-200`}
                  onClick={() => update(applyDamage(c, amount))}
                >
                  <Minus size={13} />
                  Danni
                </button>
                <button
                  className={`${button} px-2 text-emerald-200`}
                  onClick={() => update({ hp: Math.min(c.hpMax, c.hp + amount) })}
                >
                  <Plus size={13} />
                  Cura
                </button>
              </div>
            </Card>
            <details className="digital-card rounded-2xl border border-border bg-card p-4 sm:p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <UserRound size={19} className="text-primary" />
                  <span>
                    <span className="block font-serif text-2xl">Identità e progressione</span>
                    <span className="text-[11px] text-muted">
                      Nome, classe, specie, background e PE
                    </span>
                  </span>
                </span>
                <ChevronDown size={16} />
              </summary>
              <div className="mt-5">
                <Entries group={digitalGroup("identity")} {...props} />
              </div>
            </details>
            <Card title="Difesa e iniziativa" kicker="Combattimento">
              <Entries group={digitalGroup("combat")} {...props} />
              <div className="mt-5 border-t border-border pt-5">
                <Entries group={digitalGroup("armor")} {...props} />
              </div>
            </Card>
            <Card title="Dadi vita e tiri contro morte" kicker="Sopravvivenza">
              <Entry field={digitalGroup("hitdice").fields[0]} {...props} />
              <div className="mt-5">
                <Track group={digitalGroup("hitdice")} label="Dadi vita usati" {...props} />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Track group={digitalGroup("death-success")} {...props} />
                <Track group={digitalGroup("death-failure")} {...props} />
              </div>
            </Card>
            <Card title="Vantaggi, resistenze e immunità" kicker="Effetti e protezioni">
              <Entries group={digitalGroup("resistances")} columns={false} {...props} />
            </Card>
            <Card title="Sensi e movimento" kicker="Esplorazione">
              <div className="mb-4 flex gap-3 text-primary">
                <Eye size={18} />
                <Compass size={18} />
              </div>
              <Entries group={digitalGroup("senses")} {...props} />
            </Card>
          </>
        )}
        {tab === "abilities" && (
          <>
            <p className="px-1 text-xs leading-6 text-muted">
              Punteggi, tiri salvezza e tutte le 18 abilità. Competenza e maestria aggiornano i
              bonus; puoi correggere i risultati manualmente.
            </p>
            {abilityNames.map((a) => {
              const group = digitalGroup(`ability-${a}`);
              return (
                <Card key={a} title={a} kicker="Caratteristica">
                  <div className="grid grid-cols-2 gap-3">
                    {group.fields
                      .filter((f) => f.type !== "checkbox")
                      .map((f) => (
                        <Entry key={f.name} field={f} {...props} />
                      ))}
                  </div>
                  {group.fields
                    .filter((f) => f.type === "checkbox")
                    .map((f) => (
                      <Entry key={f.name} field={f} {...props} />
                    ))}
                  <div className="mt-3 space-y-3">
                    {digitalGroups
                      .filter((g) => g.id.startsWith(`skill-${a} `))
                      .map((skill) => (
                        <div
                          key={skill.id}
                          className="rounded-xl border border-border bg-background/50 p-3"
                        >
                          <p className="mb-2 text-sm font-semibold">{skill.title}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {skill.fields
                              .filter((f) => f.type === "checkbox")
                              .map((f) => (
                                <Entry key={f.name} field={f} {...props} />
                              ))}
                          </div>
                          <div className="mt-2">
                            {skill.fields
                              .filter((f) => f.type !== "checkbox")
                              .map((f) => (
                                <Entry key={f.name} field={f} {...props} />
                              ))}
                          </div>
                          {skill.title === "Furtività" && (
                            <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-muted">
                              <input
                                type="checkbox"
                                className="h-5 w-5 accent-[#7A1F2B]"
                                checked={c.paperFields?.["digital-armor-penalty"] === true}
                                onChange={(e) =>
                                  update({
                                    paperFields: {
                                      ...c.paperFields,
                                      "digital-armor-penalty": e.target.checked,
                                    },
                                  })
                                }
                              />
                              Svantaggio per armatura
                            </label>
                          )}
                        </div>
                      ))}
                  </div>
                </Card>
              );
            })}
          </>
        )}
        {tab === "weapons" && (
          <>
            <p className="px-1 text-xs leading-6 text-muted">
              Sei attacchi completi e tre tipi di munizioni. Ogni contatore rappresenta le munizioni
              usate.
            </p>
            {digitalGroups
              .filter((g) => g.id.startsWith("attack-"))
              .map((g) => (
                <Card key={g.id} title={val(g.fields[0].name) || g.title} kicker={g.title}>
                  <Entries group={g} {...props} />
                </Card>
              ))}
            <Card title="Munizioni" kicker="Scorte al tavolo">
              <div className="space-y-6">
                {digitalGroups
                  .filter((g) => g.id.startsWith("ammo-"))
                  .map((g) => (
                    <div key={g.id} className="border-b border-border pb-5 last:border-0">
                      <Entry field={g.fields[0]} {...props} />
                      <div className="mt-4">
                        <Track group={g} label="Munizioni usate" {...props} />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </>
        )}
        {tab === "features" && (
          <>
            <p className="px-1 text-xs leading-6 text-muted">
              Riferimenti rapidi per talenti, privilegi di classe e capacità. Imposta il riposo di
              recupero e segna gli usi spesi.
            </p>
            {digitalGroups
              .filter((g) => g.id.startsWith("feature-"))
              .map((g, i) => (
                <Card key={g.id} title={`Talento o capacità ${i + 1}`} kicker="Riferimento rapido">
                  <Entry field={g.fields[0]} {...props} />
                  <div className="mt-4">
                    <Entry field={g.fields[1]} {...props} />
                    <p className="mt-1 px-2 text-[11px] leading-5 text-muted">
                      Se non selezionato, recupera con riposo breve o lungo.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Track
                      group={{ ...g, fields: g.fields.slice(2) }}
                      label="Usi spesi"
                      {...props}
                    />
                  </div>
                </Card>
              ))}
            <a
              className="flex min-h-12 items-center gap-2 rounded-xl border border-primary/30 p-4 text-xs text-primary"
              href="/manuale?sezione=creazione"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen size={16} />
              Consulta talenti e capacità nel Manuale ↗
            </a>
          </>
        )}
      </div>
      <p className="mt-5 text-[11px] leading-6 text-muted">
        Prima pagina del modello trasformata in interfaccia digitale. Le altre pagine sono ancora
        consultabili nel modello PDF.
      </p>
    </div>
  );
}
