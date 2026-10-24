"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { saveContentAction, type ContentActionResult } from "@/app/actions/admin-content";
import { REASON_MAX, fieldError, normalizeValue, reasonError, type FieldSpec } from "@/lib/content-validate";

interface Field extends FieldSpec { original: string; current: string; motivo?: string }

/**
 * One input per printed value, the original under it with «Ripristina originale»,
 * a mandatory reason, a confirmation and «Salva modifica». Text only, never HTML.
 */
export function AdminContentForm({ section, id, edition, fields, back, returnTo }: {
  section: string; id: string; edition: string; fields: Field[]; back: string;
  /** Opened from a public page («Modifica»): after saving, back to it, reloaded with the correction. */
  returnTo?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(field => [field.name, field.current])));
  const [motivo, setMotivo] = useState("");
  const [local, setLocal] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState<ContentActionResult | null, FormData>(saveContentAction, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (returnTo) { window.location.assign(returnTo); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved reason is cleared once
    setMotivo("");
    router.refresh();
  }, [state, router, returnTo]);

  const changed = fields.filter(field => normalizeValue(field.kind, values[field.name] ?? "") !== field.current);
  const errors = { ...(state && !state.ok ? state.fields : {}), ...local };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    const problems: Record<string, string> = {};
    for (const field of changed) {
      const value = normalizeValue(field.kind, values[field.name] ?? "");
      const error = value === field.original ? null : fieldError(field, value);
      if (error) problems[field.name] = error;
    }
    const reason = reasonError(normalizeValue("longtext", motivo));
    if (reason) problems.motivo = reason;
    setLocal(problems);
    if (!changed.length || Object.keys(problems).length) { event.preventDefault(); return; }
    const summary = changed.map(field => `${field.label}: «${field.current || "—"}» → «${normalizeValue(field.kind, values[field.name] ?? "") || "—"}»`).join("\n");
    if (!window.confirm(`Salvare queste modifiche?\n\n${summary}\n\nLa scheda pubblica mostrerà i nuovi valori con la nota «Corretto rispetto al manuale originale».`)) event.preventDefault();
  };

  return (
    <form ref={form} action={action} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="sezione" value={section} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="edizione" value={edition} />
      {fields.map(field => {
        const value = values[field.name] ?? "";
        const isChanged = normalizeValue(field.kind, value) !== field.original;
        const inputId = `campo-${field.name}`;
        const describedBy = [`${inputId}-originale`, errors[field.name] ? `${inputId}-errore` : ""].filter(Boolean).join(" ");
        const common = {
          id: inputId, name: `campo:${field.name}`, value, maxLength: field.max + 20, "aria-invalid": !!errors[field.name], "aria-describedby": describedBy,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(current => ({ ...current, [field.name]: event.target.value })),
          className: `block w-full rounded-xl border-[1.5px] bg-card px-3.5 text-base outline-none focus:border-primary ${isChanged ? "border-primary" : "border-border"}`,
        };
        return (
          <div key={field.name}>
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">{field.label}</label>
            {field.kind === "list" || field.kind === "longtext"
              ? <textarea {...common} rows={field.kind === "longtext" ? 6 : 2} className={`${common.className} py-2.5 leading-snug`} />
              : <input {...common} type="text" inputMode={field.kind === "number" ? "numeric" : undefined} autoComplete="off" className={`${common.className} min-h-12`} />}
            {errors[field.name] && <p id={`${inputId}-errore`} role="alert" className="mt-1 text-[13px] font-semibold text-primary">{errors[field.name]}</p>}
            <p id={`${inputId}-originale`} className="mt-1 text-[13px] text-muted">
              Testo originale del manuale: <b className="text-foreground">{field.original || "—"}</b>
              {isChanged && (
                <> · <button type="button" onClick={() => setValues(current => ({ ...current, [field.name]: field.original }))} className="min-h-8 font-bold text-primary">Ripristina originale</button></>
              )}
            </p>
            {field.hint && <p className="text-[12px] text-muted">{field.hint}</p>}
            {field.motivo && field.current !== field.original && <p className="text-[12px] text-muted">Corretto ora: «{field.current}» — motivo: {field.motivo}</p>}
          </div>
        );
      })}
      <div>
        <label htmlFor="motivo" className="mb-1.5 block text-sm font-bold">Motivo della modifica (obbligatorio)</label>
        <textarea id="motivo" name="motivo" value={motivo} onChange={event => setMotivo(event.target.value)} rows={3} maxLength={REASON_MAX + 20}
          aria-invalid={!!errors.motivo} aria-describedby={errors.motivo ? "motivo-errore" : undefined}
          placeholder="Es. refuso evidente: il PDF stampa 3 hg invece di 3 kg."
          className="block w-full rounded-xl border-[1.5px] border-border bg-card px-3.5 py-2.5 text-base outline-none focus:border-primary" />
        {errors.motivo && <p id="motivo-errore" role="alert" className="mt-1 text-[13px] font-semibold text-primary">{errors.motivo}</p>}
      </div>
      {state && <p role="status" className={`rounded-xl border px-4 py-3 text-[15px] font-semibold ${state.ok ? "border-border bg-card" : "border-primary/40 bg-card text-primary"}`}>{state.ok ? state.message : state.error}</p>}
      {!changed.length && !state && <p className="text-[13px] text-muted">Modifica un valore per poter salvare.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !changed.length} className="min-h-[50px] flex-1 rounded-[25px] bg-primary font-bold text-primary-foreground disabled:opacity-50">
          {pending ? "Salvataggio…" : "Salva modifica"}
        </button>
        <Link href={back} className="inline-flex min-h-[50px] items-center rounded-[25px] border-[1.5px] border-primary px-5 font-bold text-primary">Annulla</Link>
      </div>
      <p className="text-xs text-muted">La modifica viene registrata (data, valore originale, nuovo valore, motivo) e si può annullare dal Registro. Sul sito compare come correzione, con il valore del manuale in fondo alla scheda.</p>
    </form>
  );
}
