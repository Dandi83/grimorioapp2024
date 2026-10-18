import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AdminPublicLink() {
  return <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-primary/30 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Torna al sito
  </Link>;
}
