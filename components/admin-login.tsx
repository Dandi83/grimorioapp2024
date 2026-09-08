"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/admin";
import { KeyRound } from "lucide-react";

const initialState = { ok: false as const, error: "" };

export function AdminLogin() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-5">
      <div className="w-full rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">Area riservata</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Inserisci la passcode per modificare gli incantesimi del grimorio.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="passcode" className="text-sm text-muted-foreground">
              Passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Verifica…" : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}
