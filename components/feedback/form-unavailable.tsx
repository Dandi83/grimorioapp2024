import Link from "next/link";

/** Same words as the server (lib/feedback.ts, FORM_UNAVAILABLE): the form's secret is not configured. */
export const FORM_UNAVAILABLE_TEXT = "Modulo temporaneamente non disponibile.";

/** In place of a form while the server cannot accept it: nothing can be sent. */
export function FormUnavailable({ back, backLabel }: { back: string; backLabel: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3.5 px-4 text-center" role="status" data-form-unavailable="">
      <p className="font-serif text-2xl font-bold text-primary">{FORM_UNAVAILABLE_TEXT}</p>
      <p className="max-w-[300px] text-[15px] text-muted">Riprova più tardi.</p>
      <Link href={back} className="mt-2 inline-flex min-h-11 items-center rounded-3xl border-[1.5px] border-primary px-6 font-bold text-primary">{backLabel}</Link>
    </div>
  );
}
