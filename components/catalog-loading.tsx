export function CatalogLoading({ title, detail }: { title: string; detail?: "monster" | "spell" }) {
  if (detail) return (
    <section aria-busy="true" aria-label={title}>
      <div className={detail === "spell" ? "flex h-[360px] flex-col justify-end px-6 pb-5" : "px-6 pb-5 pt-24"}>
        <p role="status" className="mb-4 font-serif text-3xl font-bold">{title}</p>
        <div aria-hidden="true" className="h-5 w-48 rounded bg-card" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 px-6 py-5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border border-border bg-card" />)}
      </div>
    </section>
  );
  return (
    <section aria-busy="true" aria-label={title} className="space-y-5 p-6">
      <h1 className="font-serif text-3xl font-bold">{title}</h1>
      <p role="status" className="text-sm text-muted">Caricamento in corso…</p>
      <div aria-hidden="true" className="space-y-4">
        {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl border border-border bg-card" />)}
      </div>
    </section>
  );
}
