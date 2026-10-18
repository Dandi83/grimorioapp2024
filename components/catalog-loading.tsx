export function CatalogLoading({ title }: { title: string }) {
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
