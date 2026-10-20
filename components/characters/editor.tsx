"use client";
import { useState } from "react";
import { Plus, Trash2, Shield, Heart, Sparkles, Swords, Minus } from "lucide-react";
import {
  ABILITIES,
  SKILLS,
  modifier,
  proficiency,
  checkBonus,
  signed,
  applyDamage,
  type Character,
  type Ability,
} from "@/lib/characters";
import type { ManualEntry } from "@/lib/manual-types";
import { conditions } from "@/lib/conditions";
import { ConditionReferences } from "@/components/condition-references";
import {
  Field,
  NameField,
  TextField,
  NumberField,
  TextArea,
  Section,
  control,
  button,
  primary,
} from "./fields";
export type SpellChoice = { id: string; name: string; level: number };
export type Choices = {
  classes: Pick<ManualEntry, "id" | "title">[];
  species: Pick<ManualEntry, "id" | "title">[];
  backgrounds: Pick<ManualEntry, "id" | "title">[];
  spells: SpellChoice[];
};
export function IdentityFields({
  c,
  update,
  choices,
}: {
  c: Character;
  update: (v: Partial<Character>) => void;
  choices: Choices;
}) {
  function selection(
    label: string,
    key: "className" | "species" | "background",
    entries: Choices["classes"],
  ) {
    const selected = entries.find((e) => e.title === c[key]);
    return (
      <div className="min-w-0">
        <Field label={label}>
          <input
            list={`options-${key}`}
            className={control}
            value={c[key]}
            maxLength={100}
            placeholder="Scegli o scrivi…"
            onChange={(e) => update({ [key]: e.target.value })}
          />
          <datalist id={`options-${key}`}>
            {entries.map((e) => (
              <option key={e.id} value={e.title} />
            ))}
          </datalist>
        </Field>
        {selected && (
          <a
            className="mt-2 inline-block text-xs text-primary underline"
            href={`/manuale/${selected.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Consulta nel Manuale ↗
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NameField value={c.name} onChange={(name) => update({ name })} />
      <NumberField
        label="Livello"
        min={1}
        max={20}
        value={c.level}
        onChange={(level) => update({ level })}
      />
      {selection("Classe", "className", choices.classes)}
      <TextField
        label="Sottoclasse (facoltativa)"
        value={c.subclass}
        onChange={(subclass) => update({ subclass })}
      />
      {selection("Specie", "species", choices.species)}
      {selection("Background", "background", choices.backgrounds)}
    </div>
  );
}
export function CharacterEditor({
  c,
  update,
  choices,
}: {
  c: Character;
  update: (v: Partial<Character>) => void;
  choices: Choices;
}) {
  const tabs = ["In gioco", "Caratteristiche", "Capacità", "Incantesimi", "Inventario", "Note"];
  const [tab, setTab] = useState("In gioco");
  const [damage, setDamage] = useState(1);
  const [spellSearch, setSpellSearch] = useState("");
  const prof = proficiency(c.level);
  const initiative =
    c.initiativeOverride.trim() === ""
      ? modifier(c.scores.Destrezza) + c.initiativeBonus
      : Number(c.initiativeOverride);
  const spellModifier = modifier(c.scores[c.casting]);
  return (
    <>
      <div className="sticky top-0 z-20 -mx-5 mt-6 border-y border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div
          role="tablist"
          aria-label="Sezioni della scheda"
          className="no-scrollbar flex gap-2 overflow-x-auto"
        >
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="character-panel"
              id={`tab-${tabs.indexOf(t)}`}
              className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted hover:text-foreground"}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div
        className="mt-5 space-y-5"
        role="tabpanel"
        id="character-panel"
        aria-labelledby={`tab-${tabs.indexOf(tab)}`}
      >
        {tab === "In gioco" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                [Shield, "Classe armatura", c.ac],
                [Swords, "Iniziativa", signed(initiative)],
                [Sparkles, "Competenza", signed(prof)],
              ].map(([Icon, label, value]) => {
                const I = Icon as typeof Shield;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-border bg-card p-3 text-center"
                  >
                    <I size={17} className="mx-auto mb-2 text-primary" />
                    <p className="font-serif text-3xl font-bold">{String(value)}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                      {String(label)}
                    </p>
                  </div>
                );
              })}
            </div>
            <Section
              title="Punti ferita"
              detail="I danni consumano prima i PF temporanei. La guarigione non supera il massimo."
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted">
                    Attuali / Massimi
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <Heart className="text-red-300" size={25} />
                    <span className="font-serif text-5xl font-semibold">
                      {c.hp}
                      <span className="text-2xl text-muted"> / {c.hpMax}</span>
                    </span>
                  </div>
                </div>
                <span className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
                  +{c.tempHp} temporanei
                </span>
              </div>
              <div className="my-5 h-2 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-400 to-amber-200 transition-all"
                  style={{ width: `${Math.min(100, (c.hp / c.hpMax) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  label="PF attuali"
                  value={c.hp}
                  max={c.hpMax}
                  onChange={(hp) => update({ hp })}
                />
                <NumberField
                  label="PF massimi"
                  min={1}
                  value={c.hpMax}
                  onChange={(hpMax) => update({ hpMax })}
                />
                <NumberField
                  label="PF temporanei"
                  value={c.tempHp}
                  onChange={(tempHp) => update({ tempHp })}
                />
              </div>
              <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
                <NumberField label="Quantità" value={damage} min={1} onChange={setDamage} />
                <button
                  className={`${button} text-red-200`}
                  onClick={() => update(applyDamage(c, damage))}
                >
                  <Minus size={14} />
                  Danni
                </button>
                <button
                  className={`${button} text-emerald-200`}
                  onClick={() => update({ hp: Math.min(c.hpMax, c.hp + damage) })}
                >
                  <Plus size={14} />
                  Cura
                </button>
              </div>
            </Section>
            <Section
              title="Condizioni"
              detail="Seleziona gli effetti attivi. Apri il riferimento per leggere la regola ufficiale."
            >
              <div className="flex flex-wrap gap-2">
                {conditions.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={c.conditions.includes(item.title)}
                    className={`min-h-11 rounded-full border px-3 py-2 text-xs ${c.conditions.includes(item.title) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted"}`}
                    onClick={() =>
                      update({
                        conditions: c.conditions.includes(item.title)
                          ? c.conditions.filter((v) => v !== item.title)
                          : [...c.conditions, item.title],
                      })
                    }
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              {c.conditions.length > 0 && <ConditionReferences text={c.conditions.join(", ")} />}
            </Section>
            <Section
              title="Attacchi"
              detail="Bonus e danni sono configurabili: non vengono dedotti automaticamente dall’equipaggiamento."
            >
              {!c.attacks.length && (
                <p className="text-sm text-muted">Aggiungi la tua arma o un attacco speciale.</p>
              )}
              {c.attacks.map((a) => (
                <div key={a.id} className="mb-4 grid gap-3 border-b border-border pb-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextField
                        label="Nome attacco"
                        value={a.name}
                        onChange={(name) =>
                          update({
                            attacks: c.attacks.map((x) => (x.id === a.id ? { ...x, name } : x)),
                          })
                        }
                      />
                    </div>
                    <button
                      className={button}
                      aria-label={`Rimuovi attacco ${a.name}`}
                      onClick={() => update({ attacks: c.attacks.filter((x) => x.id !== a.id) })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Tiro per colpire"
                      value={a.bonus}
                      placeholder="+5"
                      onChange={(bonus) =>
                        update({
                          attacks: c.attacks.map((x) => (x.id === a.id ? { ...x, bonus } : x)),
                        })
                      }
                    />
                    <TextField
                      label="Danni e tipo"
                      value={a.damage}
                      placeholder="1d8 + 3 taglienti"
                      onChange={(damage) =>
                        update({
                          attacks: c.attacks.map((x) => (x.id === a.id ? { ...x, damage } : x)),
                        })
                      }
                    />
                  </div>
                  <TextField
                    label="Note attacco"
                    value={a.notes}
                    onChange={(notes) =>
                      update({
                        attacks: c.attacks.map((x) => (x.id === a.id ? { ...x, notes } : x)),
                      })
                    }
                  />
                </div>
              ))}
              <button
                className={button}
                onClick={() =>
                  update({
                    attacks: [
                      ...c.attacks,
                      {
                        id: crypto.randomUUID(),
                        name: "Nuovo attacco",
                        bonus: "",
                        damage: "",
                        notes: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Aggiungi attacco
              </button>
            </Section>
            <Section
              title="Risorse"
              detail="Usi e recupero manuali, inclusa l’eventuale Magia del Patto."
            >
              {c.resources.map((r) => (
                <div key={r.id} className="mb-4 border-b border-border pb-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextField
                        label="Risorsa"
                        value={r.name}
                        onChange={(name) =>
                          update({
                            resources: c.resources.map((x) => (x.id === r.id ? { ...x, name } : x)),
                          })
                        }
                      />
                    </div>
                    <button
                      className={button}
                      aria-label={`Rimuovi risorsa ${r.name}`}
                      onClick={() =>
                        update({ resources: c.resources.filter((x) => x.id !== r.id) })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <NumberField
                      label="Usi rimasti"
                      value={r.current}
                      max={r.max}
                      onChange={(current) =>
                        update({
                          resources: c.resources.map((x) =>
                            x.id === r.id ? { ...x, current } : x,
                          ),
                        })
                      }
                    />
                    <NumberField
                      label="Usi massimi"
                      value={r.max}
                      onChange={(max) =>
                        update({
                          resources: c.resources.map((x) => (x.id === r.id ? { ...x, max } : x)),
                        })
                      }
                    />
                  </div>
                  <div className="mt-3">
                    <TextField
                      label="Si recupera con"
                      value={r.recovery}
                      placeholder="Es. riposo lungo"
                      onChange={(recovery) =>
                        update({
                          resources: c.resources.map((x) =>
                            x.id === r.id ? { ...x, recovery } : x,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                className={button}
                onClick={() =>
                  update({
                    resources: [
                      ...c.resources,
                      {
                        id: crypto.randomUUID(),
                        name: "Nuova risorsa",
                        current: 0,
                        max: 1,
                        recovery: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Aggiungi risorsa
              </button>
            </Section>
            <Section title="Dadi vita e salvezza contro morte">
              <TextField
                label="Dadi vita disponibili"
                value={c.hitDice}
                placeholder="3d8"
                onChange={(hitDice) => update({ hitDice })}
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField
                  label="Successi"
                  value={c.deathSuccess}
                  max={3}
                  onChange={(deathSuccess) => update({ deathSuccess })}
                />
                <NumberField
                  label="Fallimenti"
                  value={c.deathFailure}
                  max={3}
                  onChange={(deathFailure) => update({ deathFailure })}
                />
              </div>
            </Section>
          </>
        )}
        {tab === "Caratteristiche" && (
          <>
            <Section
              title="Identità"
              detail="Scegli una voce SRD o scrivi un contenuto personalizzato. La scheda non verifica la legalità della creazione."
            >
              <IdentityFields c={c} update={update} choices={choices} />
              <div className="mt-4">
                <TextArea
                  label="Descrizione"
                  value={c.description}
                  onChange={(description) => update({ description })}
                />
              </div>
            </Section>
            <Section
              title="Le sei caratteristiche"
              detail="Modificatore = ⌊(punteggio − 10) / 2⌋. I tiri salvezza competenti aggiungono il bonus di competenza."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ABILITIES.map((a) => (
                  <div key={a} className="rounded-xl border border-border p-3">
                    <NumberField
                      label={a}
                      value={c.scores[a]}
                      min={1}
                      max={30}
                      onChange={(v) => update({ scores: { ...c.scores, [a]: v } })}
                    />
                    <p className="my-3 text-center font-serif text-3xl text-primary">
                      {signed(modifier(c.scores[a]))}
                    </p>
                    <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={!!c.saves[a]}
                        onChange={(e) => update({ saves: { ...c.saves, [a]: e.target.checked } })}
                        className="accent-[#7A1F2B]"
                      />
                      TS competente
                    </label>
                    <p className="mt-1 text-xs">
                      TS {signed(checkBonus(c.scores[a], c.level, c.saves[a] ? 1 : 0))}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
            <Section
              title="Difesa e movimento"
              detail="CA e velocità sono manuali. Iniziativa = Destrezza + bonus; la correzione sostituisce il risultato ed è cancellabile."
            >
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Classe armatura"
                  value={c.ac}
                  max={99}
                  onChange={(ac) => update({ ac })}
                />
                <NumberField
                  label="Velocità (metri)"
                  value={c.speed}
                  onChange={(speed) => update({ speed })}
                />
                <NumberField
                  label="Bonus iniziativa"
                  min={-30}
                  max={30}
                  value={c.initiativeBonus}
                  onChange={(initiativeBonus) => update({ initiativeBonus })}
                />
                <Field label="Correzione iniziativa">
                  <input
                    className={control}
                    type="number"
                    min={-99}
                    max={99}
                    value={c.initiativeOverride}
                    placeholder={`Auto: ${signed(initiative)}`}
                    onChange={(e) => update({ initiativeOverride: e.target.value })}
                  />
                </Field>
              </div>
              <p className="mt-3 text-xs text-primary">
                Iniziativa {signed(initiative)} · Competenza {signed(prof)} (livello {c.level})
              </p>
            </Section>
            <Section
              title="Abilità"
              detail="0 = nessuna competenza · 1 = competenza · 2 = maestria. Bonus finale = modificatore + competenza × grado + bonus manuale."
            >
              <div className="space-y-4">
                {SKILLS.map(([name, a]) => {
                  const s = c.skills[name] || { rank: 0, bonus: 0 };
                  return (
                    <div
                      key={name}
                      className="grid grid-cols-[1fr_72px_65px] items-center gap-2 border-b border-border pb-3"
                    >
                      <div>
                        <p className="text-sm">
                          {name}{" "}
                          <strong className="text-primary">
                            {signed(checkBonus(c.scores[a], c.level, s.rank, s.bonus))}
                          </strong>
                        </p>
                        <p className="text-[10px] text-muted">{a}</p>
                      </div>
                      <Field label="Grado">
                        <select
                          className={`${control} px-2`}
                          value={s.rank}
                          onChange={(e) =>
                            update({
                              skills: {
                                ...c.skills,
                                [name]: { ...s, rank: Number(e.target.value) },
                              },
                            })
                          }
                        >
                          {[0, 1, 2].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                      <NumberField
                        label="Bonus"
                        min={-30}
                        max={30}
                        value={s.bonus}
                        onChange={(bonus) =>
                          update({ skills: { ...c.skills, [name]: { ...s, bonus } } })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}
        {tab === "Capacità" && (
          <Section
            title="Capacità e talenti"
            detail="Spazio personale per privilegi di classe, talenti, lingue e personalizzazioni. Le risorse con usi si gestiscono in “In gioco”."
          >
            <TextArea
              label="Le tue capacità"
              value={c.features}
              placeholder="Nome della capacità, effetto e regola di recupero…"
              onChange={(features) => update({ features })}
            />
            <a
              className="mt-4 inline-block text-sm text-primary underline"
              href="/manuale?sezione=creazione"
              target="_blank"
              rel="noopener noreferrer"
            >
              Consulta creazione e talenti ↗
            </a>
          </Section>
        )}
        {tab === "Incantesimi" && (
          <>
            <Section
              title="Incantatore"
              detail="CD = 8 + competenza + modificatore. Attacco = competenza + modificatore. Le correzioni manuali si cancellano per tornare al calcolo."
            >
              <Field label="Caratteristica da incantatore">
                <select
                  className={control}
                  value={c.casting}
                  onChange={(e) => update({ casting: e.target.value as Ability })}
                >
                  {ABILITIES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <div className="my-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background p-4 text-center">
                  <p className="text-xs text-muted">CD incantesimi</p>
                  <p className="font-serif text-3xl text-primary">
                    {c.spellDcOverride.trim() !== "" ? c.spellDcOverride : 8 + prof + spellModifier}
                  </p>
                </div>
                <div className="rounded-xl bg-background p-4 text-center">
                  <p className="text-xs text-muted">Attacco magico</p>
                  <p className="font-serif text-3xl text-primary">
                    {signed(
                      c.spellAttackOverride.trim() !== ""
                        ? Number(c.spellAttackOverride)
                        : prof + spellModifier,
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["spellDcOverride", "spellAttackOverride"] as const).map((key, i) => (
                  <Field key={key} label={i === 0 ? "Correzione CD" : "Correzione attacco"}>
                    <input
                      type="number"
                      className={control}
                      value={c[key]}
                      placeholder="Automatico"
                      onChange={(e) => update({ [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            </Section>
            <Section
              title="Slot incantesimo"
              detail="Imposta i massimi della tua classe. Tocca − per usare uno slot, + per recuperarlo. Aprire un incantesimo non consuma slot."
            >
              <div className="space-y-3">
                {c.slots.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_60px_38px_34px_38px] items-center gap-2 border-b border-border pb-3"
                  >
                    <span className="text-sm">Livello {i + 1}</span>
                    <NumberField
                      label="Max"
                      value={s.max}
                      max={99}
                      onChange={(max) =>
                        update({ slots: c.slots.map((x, j) => (j === i ? { ...x, max } : x)) })
                      }
                    />
                    <button
                      className={`${button} px-0`}
                      disabled={s.current === 0}
                      aria-label={`Usa slot livello ${i + 1}`}
                      onClick={() =>
                        update({
                          slots: c.slots.map((x, j) =>
                            j === i ? { ...x, current: x.current - 1 } : x,
                          ),
                        })
                      }
                    >
                      −
                    </button>
                    <span className="text-center text-sm text-primary">{s.current}</span>
                    <button
                      className={`${button} px-0`}
                      disabled={s.current >= s.max}
                      aria-label={`Recupera slot livello ${i + 1}`}
                      onClick={() =>
                        update({
                          slots: c.slots.map((x, j) =>
                            j === i ? { ...x, current: x.current + 1 } : x,
                          ),
                        })
                      }
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </Section>
            <Section
              title="Il tuo grimorio"
              detail="Aggiungi gli incantesimi conosciuti, poi seleziona quelli preparati. I riferimenti si aprono in una nuova scheda."
            >
              {c.spells.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 border-b border-border py-3"
                >
                  <div className="min-w-0">
                    <a
                      href={`/spell/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words text-sm text-primary underline"
                    >
                      {s.name} ↗
                    </a>
                    <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={s.prepared}
                        onChange={(e) =>
                          update({
                            spells: c.spells.map((x) =>
                              x.id === s.id ? { ...x, prepared: e.target.checked } : x,
                            ),
                          })
                        }
                      />
                      Preparato
                    </label>
                  </div>
                  <button
                    className={button}
                    aria-label={`Rimuovi ${s.name}`}
                    onClick={() => update({ spells: c.spells.filter((x) => x.id !== s.id) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="mt-4">
                <TextField
                  label="Cerca nel catalogo"
                  value={spellSearch}
                  onChange={setSpellSearch}
                  placeholder="Es. Dardo incantato"
                />
              </div>
              {spellSearch.length >= 2 && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border">
                  {choices.spells
                    .filter(
                      (s) =>
                        s.name
                          .toLocaleLowerCase("it")
                          .includes(spellSearch.toLocaleLowerCase("it")) &&
                        !c.spells.some((x) => x.id === s.id),
                    )
                    .slice(0, 20)
                    .map((s) => (
                      <button
                        key={s.id}
                        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm hover:bg-elevated"
                        onClick={() => {
                          update({
                            spells: [...c.spells, { id: s.id, name: s.name, prepared: false }],
                          });
                          setSpellSearch("");
                        }}
                      >
                        <span>
                          {s.name}
                          <small className="ml-2 text-muted">
                            {s.level === 0 ? "Trucchetto" : `Liv. ${s.level}`}
                          </small>
                        </span>
                        <Plus size={16} className="shrink-0 text-primary" />
                      </button>
                    ))}
                </div>
              )}
            </Section>
          </>
        )}
        {tab === "Inventario" && (
          <>
            <Section title="Monete">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {(["mc", "ma", "me", "mo", "mp"] as const).map((k) => (
                  <NumberField
                    key={k}
                    label={k.toUpperCase()}
                    value={c.coins[k]}
                    max={999999}
                    onChange={(v) => update({ coins: { ...c.coins, [k]: v } })}
                  />
                ))}
              </div>
            </Section>
            <Section
              title="Equipaggiamento"
              detail="Oggetti personali, quantità e peso libero. Gli oggetti equipaggiati non modificano automaticamente la CA."
            >
              {c.inventory.map((item) => (
                <div key={item.id} className="mb-4 space-y-3 border-b border-border pb-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextField
                        label="Oggetto"
                        value={item.name}
                        onChange={(name) =>
                          update({
                            inventory: c.inventory.map((x) =>
                              x.id === item.id ? { ...x, name } : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      className={button}
                      aria-label={`Rimuovi oggetto ${item.name}`}
                      onClick={() =>
                        update({ inventory: c.inventory.filter((x) => x.id !== item.id) })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Quantità"
                      value={item.quantity}
                      onChange={(quantity) =>
                        update({
                          inventory: c.inventory.map((x) =>
                            x.id === item.id ? { ...x, quantity } : x,
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Peso (facoltativo)"
                      value={item.weight}
                      placeholder="Es. 1,5 kg"
                      onChange={(weight) =>
                        update({
                          inventory: c.inventory.map((x) =>
                            x.id === item.id ? { ...x, weight } : x,
                          ),
                        })
                      }
                    />
                  </div>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={item.equipped}
                      onChange={(e) =>
                        update({
                          inventory: c.inventory.map((x) =>
                            x.id === item.id ? { ...x, equipped: e.target.checked } : x,
                          ),
                        })
                      }
                    />
                    Equipaggiato
                  </label>
                </div>
              ))}
              <button
                className={button}
                onClick={() =>
                  update({
                    inventory: [
                      ...c.inventory,
                      {
                        id: crypto.randomUUID(),
                        name: "Nuovo oggetto",
                        quantity: 1,
                        weight: "",
                        equipped: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Aggiungi oggetto
              </button>
              <a
                href="/manuale?sezione=equipaggiamento"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-sm text-primary underline"
              >
                Consulta equipaggiamento nel Manuale ↗
              </a>
            </Section>
          </>
        )}
        {tab === "Note" && (
          <Section
            title="Il diario dell’avventura"
            detail="Appunti di sessione, legami, obiettivi e storie. Testo personale, distinto dai contenuti ufficiali SRD."
          >
            <TextArea
              label="Note personali"
              value={c.notes}
              placeholder="La tua prossima avventura comincia qui…"
              onChange={(notes) => update({ notes })}
            />
          </Section>
        )}
      </div>
    </>
  );
}
