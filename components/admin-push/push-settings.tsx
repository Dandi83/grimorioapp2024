"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Send, Share, SquarePlus } from "lucide-react";

import {
  pushPublicKeyAction, removeDeviceAction, setNotificationTypeAction, subscribeDeviceAction, testPushAction,
} from "@/app/actions/admin-push";

interface Device { id: string; endpoint: string; name: string; since: string }
interface Kind { key: string; title: string; hint: string; on: boolean }

type Support = "checking" | "ok" | "ios-browser" | "unsupported" | "worker-off";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

/** «iPhone · Safari», «Mac · Chrome»: a name for the list, from the browser's own description. */
export function deviceName(ua: string, touch = 0): string {
  const system = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Dispositivo";
  const browser = /Edg\//.test(ua) ? "Edge" : /(?:CriOS|Chrome)\//.test(ua) ? "Chrome" : /(?:FxiOS|Firefox)\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${system} · ${browser}`;
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

/**
 * «Notifiche» in the admin area: this device on or off, a test, the list of the devices and a switch
 * for each kind of notification. On iPhone, Web Push works only from the icon on the Home screen.
 */
export function PushSettings({ workerEnabled, devices, types }: { workerEnabled: boolean; devices: Device[]; types: Kind[] }) {
  const router = useRouter();
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [kinds, setKinds] = useState(types);
  const [message, setMessage] = useState<{ text: string; error?: boolean; at: number } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!workerEnabled) { setSupport("worker-off"); return; }
    const pushReady = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (isIos() && !isStandalone()) { setSupport("ios-browser"); return; }
    if (!pushReady) { setSupport("unsupported"); return; }
    setSupport("ok");
    setPermission(Notification.permission);
    void navigator.serviceWorker.getRegistration().then(registration => registration?.pushManager.getSubscription())
      .then(subscription => setEndpoint(subscription?.endpoint ?? null)).catch(() => setEndpoint(null));
  }, [workerEnabled]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const active = endpoint !== null && devices.some(device => device.endpoint === endpoint);
  const said = useRef(0);
  const say = (text: string, error = false) => setMessage({ text, error, at: ++said.current });

  const activate = () => start(async () => {
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") { say("Permesso non concesso: le notifiche restano spente.", true); return; }
      const registration = await navigator.serviceWorker.ready;
      const key = await pushPublicKeyAction();
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) as BufferSource });
      const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const result = await subscribeDeviceAction({ endpoint: json.endpoint, keys: json.keys }, deviceName(navigator.userAgent, navigator.maxTouchPoints));
      if (!result.ok) { say(result.error, true); return; }
      setEndpoint(subscription.endpoint);
      say("Notifiche attive su questo dispositivo.");
      router.refresh();
    } catch {
      say("Attivazione non riuscita. Riprova tra poco.", true);
    }
  });

  const deactivate = () => start(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const current = subscription?.endpoint ?? endpoint;
      await subscription?.unsubscribe();
      if (current) await removeDeviceAction({ endpoint: current });
      setEndpoint(null);
      say("Notifiche disattivate su questo dispositivo.");
      router.refresh();
    } catch {
      say("Disattivazione non riuscita. Riprova tra poco.", true);
    }
  });

  const test = () => start(async () => {
    const result = endpoint ? await testPushAction(endpoint).catch(() => ({ ok: false as const, error: "Invio non riuscito." })) : { ok: false as const, error: "Questo dispositivo non è iscritto." };
    say(result.ok ? "Notifica di prova inviata: arriva tra pochi secondi." : result.error, !result.ok);
  });

  const remove = (device: Device) => start(async () => {
    const result = await removeDeviceAction({ id: device.id }).catch(() => ({ ok: false as const, error: "Rimozione non riuscita." }));
    if (!result.ok) { say(result.error, true); return; }
    if (device.endpoint === endpoint) setEndpoint(null);
    say(`${device.name} rimosso.`);
    router.refresh();
  });

  const toggleKind = (kind: Kind) => start(async () => {
    const on = !kind.on;
    setKinds(list => list.map(item => (item.key === kind.key ? { ...item, on } : item)));
    const result = await setNotificationTypeAction(kind.key, on).catch(() => ({ ok: false as const, error: "Salvataggio non riuscito." }));
    if (!result.ok) {
      setKinds(list => list.map(item => (item.key === kind.key ? { ...item, on: !on } : item)));
      say(result.error, true);
    } else say(`${kind.title}: notifiche ${on ? "attive" : "spente"}.`);
  });

  const button = "flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-[16px] font-bold disabled:opacity-60";

  return (
    <>
      <h1 className="flex items-center gap-2 font-serif text-[30px] font-bold leading-tight text-primary">
        <Bell size={28} strokeWidth={1.8} aria-hidden="true" /> Notifiche
      </h1>
      <p className="text-[15px] leading-6 text-muted">Avvisi sul telefono per l’amministratore. I visitatori del sito non ricevono mai notifiche.</p>

      <section aria-label="Questo dispositivo" className="space-y-3 rounded-[14px] border-[1.5px] border-border bg-card p-4">
        <p className="flex items-center gap-2 text-[16px] font-bold" role="status" aria-live="polite">
          {active ? <Bell size={20} className="text-[#2E6B3F]" aria-hidden="true" /> : <BellOff size={20} className="text-muted" aria-hidden="true" />}
          {support === "checking" ? "Controllo in corso…" : active ? "Attive su questo dispositivo" : "Non attive su questo dispositivo"}
        </p>

        {support === "ios-browser" && (
          <div className="space-y-2 text-[15px] leading-6">
            <p>Su iPhone le notifiche arrivano solo dall’icona del Grimorio nella schermata Home:</p>
            <ol className="space-y-2">
              <li className="flex gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">1</span><span>Tocca <b>Condividi</b> <Share size={16} className="inline align-[-2px]" aria-label="(icona quadrato con freccia)" /> in basso in Safari.</span></li>
              <li className="flex gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">2</span><span>Scegli <b>«Aggiungi alla schermata Home»</b> <SquarePlus size={16} className="inline align-[-2px]" aria-hidden="true" />.</span></li>
              <li className="flex gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">3</span><span>Apri il Grimorio dall’icona, entra nell’area riservata e torna qui in <b>Notifiche</b>.</span></li>
            </ol>
          </div>
        )}
        {support === "unsupported" && <p className="text-[15px] leading-6">Questo browser non supporta le notifiche push. Prova con Safari su iPhone (dall’icona nella schermata Home), Chrome, Edge o Firefox.</p>}
        {support === "worker-off" && <p className="text-[15px] leading-6">Le notifiche usano il service worker del sito, che ora è spento con l’interruttore di emergenza. Riaccendilo per attivarle.</p>}
        {support === "ok" && permission === "denied" && (
          <div className="space-y-1 text-[15px] leading-6">
            <p className="font-semibold text-[#A2462E]">Le notifiche per il Grimorio sono bloccate su questo dispositivo.</p>
            <p>Su iPhone: apri <b>Impostazioni</b> → <b>Notifiche</b> → <b>Grimorio</b> e attiva <b>«Consenti notifiche»</b>, poi torna qui. Su computer: consenti le notifiche dal lucchetto accanto all’indirizzo.</p>
          </div>
        )}

        {support === "ok" && permission !== "denied" && !active && (
          <button type="button" onClick={activate} disabled={pending} className={`${button} bg-primary text-primary-foreground`}>
            <Bell size={20} aria-hidden="true" /> Attiva notifiche su questo dispositivo
          </button>
        )}
        {support === "ok" && active && (
          <div className="grid gap-2">
            <button type="button" onClick={test} disabled={pending} className={`${button} bg-primary text-primary-foreground`}>
              <Send size={20} aria-hidden="true" /> Invia notifica di prova
            </button>
            <button type="button" onClick={deactivate} disabled={pending} className={`${button} border-2 border-primary bg-card text-primary`}>
              <BellOff size={20} aria-hidden="true" /> Disattiva su questo dispositivo
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="tipi" className="space-y-2">
        <h2 id="tipi" className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Cosa ti avvisa</h2>
        <ul className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
          {kinds.map(kind => (
            <li key={kind.key} className="flex items-center gap-3 border-t border-elevated px-3.5 py-2.5 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[19px] font-bold leading-tight">{kind.title}</p>
                <p className="text-[13px] leading-5 text-muted">{kind.hint}</p>
              </div>
              <button type="button" role="switch" aria-checked={kind.on} aria-label={`Notifiche: ${kind.title}`} onClick={() => toggleKind(kind)} disabled={pending}
                className={`relative h-11 w-[60px] shrink-0 rounded-full border-2 transition-colors ${kind.on ? "border-primary bg-primary" : "border-border bg-elevated"}`}>
                <span className={`absolute top-1/2 size-7 -translate-y-1/2 rounded-full bg-card shadow transition-all ${kind.on ? "left-[26px]" : "left-1"}`} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dispositivi" className="space-y-2">
        <h2 id="dispositivi" className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">Dispositivi attivi</h2>
        {devices.length === 0 ? (
          <p className="rounded-[14px] border-[1.5px] border-border bg-card px-4 py-4 text-[15px] text-muted">Nessun dispositivo: le notifiche non arrivano da nessuna parte.</p>
        ) : (
          <ul aria-label="Dispositivi attivi" className="overflow-hidden rounded-[14px] border-[1.5px] border-border bg-card">
            {devices.map(device => (
              <li key={device.id} className="flex items-center gap-3 border-t border-elevated px-3.5 py-2.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold">{device.name}{device.endpoint === endpoint && <span className="ml-1.5 text-[13px] font-semibold text-[#2E6B3F]">· questo</span>}</p>
                  <p className="text-[13px] text-muted">Attivo dal {dateFormat.format(new Date(device.since))}</p>
                </div>
                <button type="button" onClick={() => remove(device)} disabled={pending} aria-label={`Rimuovi ${device.name}`}
                  className="min-h-11 shrink-0 rounded-[10px] border-[1.5px] border-primary px-3 text-[14px] font-bold text-primary">Rimuovi</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && (
        <div role="status" key={message.at} className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-50 mx-auto w-[calc(100%-32px)] max-w-md rounded-[12px] bg-[#2B2118] px-4 py-3 text-center text-[15px] font-semibold text-[#FFFBF0] shadow-lg">
          {message.text}
        </div>
      )}
    </>
  );
}
