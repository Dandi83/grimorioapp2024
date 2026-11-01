import { breadcrumbLd, type Crumb } from "@/lib/seo";

/**
 * Structured data for Google (PROMPT 45): a <script type="application/ld+json"> in the HTML of the server, no
 * JavaScript sent to the browser. «<» is written as < so a name can never close the script.
 */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Home › Sezione › Scheda. */
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return <JsonLd data={breadcrumbLd(crumbs)} />;
}
