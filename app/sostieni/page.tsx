import { notFound } from "next/navigation";

import { SupportPage } from "@/components/support/support-page";
import { supportUrl } from "@/lib/support";

export const metadata = {
  title: "Sostieni il Grimorio — Il Grimorio.App",
  description: "Se Il Grimorio.App ti è utile al tavolo, puoi aiutarlo a crescere con un contributo libero su Ko-fi.",
};

/**
 * /sostieni (canvas «Sostieni il Grimorio», ②): a free contribution on Ko-fi, once. Nothing is paid on this site
 * and nothing is unlocked. While the Ko-fi address is empty (lib/support.ts) the page does not exist (404).
 */
export default function SupportRoute() {
  const url = supportUrl();
  if (!url) notFound();
  return <SupportPage url={url} />;
}
