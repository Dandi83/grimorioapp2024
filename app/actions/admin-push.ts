"use server";

import { requireAdmin } from "@/lib/admin-action-helpers";
import {
  isNotificationType, listDevices, removeSubscription, saveSubscription, sendPush, setNotificationType, vapidKeys,
  type PushSubscriptionInput,
} from "@/lib/push";

/**
 * Admin push notifications (/admin/notifiche). Every action is for the administrator only: no public
 * request can subscribe a device or send a notification.
 */

export type PushResult = { ok: true } | { ok: false; error: string };

/** The public key the browser needs to subscribe (the private one never leaves the server). */
export async function pushPublicKeyAction(): Promise<string> {
  await requireAdmin();
  return (await vapidKeys()).publicKey;
}

export async function subscribeDeviceAction(subscription: PushSubscriptionInput, device: string): Promise<PushResult> {
  await requireAdmin();
  return (await saveSubscription(subscription, typeof device === "string" ? device : "")) ? { ok: true } : { ok: false, error: "Iscrizione non valida." };
}

/** «Disattiva su questo dispositivo» (by its address) or «Rimuovi» in the list (by id). */
export async function removeDeviceAction(where: { endpoint?: string; id?: string }): Promise<PushResult> {
  await requireAdmin();
  const endpoint = typeof where?.endpoint === "string" ? where.endpoint : undefined;
  const id = typeof where?.id === "string" && /^[0-9a-f-]{36}$/.test(where.id) ? where.id : undefined;
  if (!endpoint && !id) return { ok: false, error: "Dispositivo sconosciuto." };
  await removeSubscription({ endpoint, id });
  return { ok: true };
}

/** «Invia notifica di prova» to this device only. */
export async function testPushAction(endpoint: string): Promise<PushResult> {
  await requireAdmin();
  if (typeof endpoint !== "string" || !endpoint) return { ok: false, error: "Questo dispositivo non è iscritto." };
  const result = await sendPush("segnalazioni", { title: "Notifica di prova", body: "Le notifiche del Grimorio arrivano su questo dispositivo.", url: "/admin/notifiche", tag: "prova" }, { endpoint, ignoreSwitch: true });
  if (result.sent) return { ok: true };
  if (result.removed || result.skipped === "no-devices") return { ok: false, error: "Iscrizione scaduta: disattiva e riattiva le notifiche." };
  return { ok: false, error: "Invio non riuscito. Riprova tra poco." };
}

export async function setNotificationTypeAction(type: string, on: boolean): Promise<PushResult> {
  await requireAdmin();
  if (!isNotificationType(type) || typeof on !== "boolean") return { ok: false, error: "Tipo di notifica sconosciuto." };
  await setNotificationType(type, on);
  return { ok: true };
}

