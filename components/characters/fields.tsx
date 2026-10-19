"use client";
import { useEffect, useState, type ReactNode } from "react";
import { commitNumber, commitName } from "@/lib/characters";
export const control =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  placeholder = "",
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <input
        className={control}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <Field label={label}>
      <input
        className={control}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = commitNumber(draft, min, max);
          onChange(n);
          setDraft(String(n));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </Field>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className={`${control} min-h-40 resize-y leading-7`}
        maxLength={40000}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
export function Section({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-serif text-2xl font-semibold">{title}</h3>
      {detail && <p className="mb-4 mt-1 text-xs leading-5 text-muted">{detail}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
export const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";
export const primary = `${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`;

export function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Field label="Nome del personaggio">
      <input
        className={control}
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const name = commitName(draft);
          setDraft(name);
          onChange(name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </Field>
  );
}
