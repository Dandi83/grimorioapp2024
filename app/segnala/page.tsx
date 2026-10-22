import { ReportForm } from "@/components/feedback/report-form";
import { turnstileConfigured } from "@/lib/feedback";

export const metadata = {
  title: "Segnala — Il Grimorio.App",
  robots: { index: false, follow: true },
};

/** Static page (also saved offline); sending needs the network. */
export default function ReportPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-6">
      <ReportForm turnstileSiteKey={turnstileConfigured() ? process.env.TURNSTILE_SITE_KEY : undefined} />
    </div>
  );
}
