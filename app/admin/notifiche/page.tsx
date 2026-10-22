import Link from "next/link";

import { AdminLogin } from "@/components/admin-login";
import { PushSettings } from "@/components/admin-push/push-settings";
import { isAdmin } from "@/lib/admin-auth";
import { NOTIFICATION_TYPES, listDevices, notificationTypes } from "@/lib/push";
import { serviceWorkerEnabled } from "@/lib/service-worker-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifiche — Il Grimorio.App", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [devices, types] = await Promise.all([listDevices(), notificationTypes()]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-28 pt-4">
      <Link href="/admin" className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-primary">‹ Amministrazione</Link>
      <PushSettings
        workerEnabled={serviceWorkerEnabled()}
        devices={devices.map(device => ({ id: device.id, endpoint: device.endpoint, name: device.dispositivo, since: new Date(device.creata_il).toISOString() }))}
        types={NOTIFICATION_TYPES.map(type => ({ key: type.key, title: type.title, hint: type.hint, on: types[type.key] }))}
      />
    </div>
  );
}
