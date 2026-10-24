/** While the editor of a card loads (a slow phone or network): the cream page with its title, never the list. */
export function AdminCardEditorLoading({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-2 pb-6 sm:px-4" aria-busy="true">
      <p className="inline-flex min-h-11 items-center px-2 text-[15px] font-bold text-primary">‹ Torna alla scheda</p>
      <div className="min-h-[70dvh] rounded-2xl border border-border bg-card px-4 py-4 sm:px-6">
        <h1 className="font-serif text-2xl text-foreground">{title}</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Caricamento della scheda…</p>
      </div>
    </div>
  );
}
