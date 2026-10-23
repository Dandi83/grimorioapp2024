"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Pencil } from "lucide-react";

import { EyeButton } from "./admin-card-eye";
import { SourceLabel } from "./admin-source-label";
import { HiddenTag } from "./sections/hidden-tag";

/**
 * A row of /admin/incantesimi and /admin/mostri, the same in both editions. The name and the second line
 * (level and school, or challenge rating and type) are never cut: they wrap. The source is a small pill that
 * goes to the next line by itself. On a phone the buttons (open, edit, eye, delete: 44 px each) sit below the
 * text, on wider screens at the right. A card hidden from the site is dimmed, with the dark «Nascosta» pill.
 */
export function AdminCardRow({ badge, name, meta, origine, href, hidden, onToggleHidden, onEdit, remove }: {
  badge: ReactNode;
  name: string;
  meta: string;
  origine?: string;
  href: string;
  hidden: boolean;
  onToggleHidden: () => void;
  onEdit: () => void;
  /** The delete button, only where a card can be deleted. */
  remove?: ReactNode;
}) {
  return (
    <li data-card-row="" data-hidden={hidden ? "" : undefined} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-3 py-2 sm:flex-nowrap sm:px-4">
      <div className={`flex min-w-0 flex-1 basis-[calc(100%-1px)] items-start gap-3 sm:basis-auto ${hidden ? "opacity-60" : ""}`}>
        {badge}
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-foreground">
            {name}{hidden && <> <HiddenTag /></>}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            <span>{meta}</span>
            {origine && <SourceLabel origine={origine} />}
          </p>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        <Link href={href} className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground" title="Vedi">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button type="button" onClick={onEdit} className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary" title="Modifica">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <EyeButton hidden={hidden} nome={name} onToggle={onToggleHidden} />
        {remove ?? <span className="w-11 shrink-0" aria-hidden="true" />}
      </div>
    </li>
  );
}
