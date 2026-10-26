/**
 * How to install the app, browser by browser (the invite at the bottom of the screen and the page /installa).
 * Pure: the user agent in, the advice out. Chromium browsers with «beforeinstallprompt» get the «Installa»
 * button when the event arrives; the others get the steps of their own menu; the browsers inside other apps
 * (WhatsApp, Instagram…) cannot install: open the link in the browser.
 */

export type InstallPlatform = "ios" | "android" | "desktop";
export type InstallBrowser = "safari" | "chrome" | "edge" | "firefox" | "opera" | "samsung" | "huawei" | "mi" | "other";

export interface InstallDevice {
  platform: InstallPlatform;
  browser: InstallBrowser;
  /** The app around the page (WhatsApp, Instagram…): its browser cannot install. */
  inApp: string | null;
  /** iOS only: 16.4 → 16.4. */
  iosVersion: number | null;
  /** Safari for Mac only: «Aggiungi al Dock» from Safari 17. */
  safariVersion: number | null;
}

export type InstallKind =
  /** The «Installa» button, when the browser sends «beforeinstallprompt» (Android and computer Chromium). */
  | "button"
  /** The steps of the browser menu. */
  | "steps"
  /** iPhone before iOS 16.4: only Safari adds to the Home screen. */
  | "open-safari"
  /** A browser inside another app: open the link in the browser. */
  | "inapp"
  /** No installation (Firefox for computer, unknown computer browsers). */
  | "none";

export interface InstallGuide {
  kind: InstallKind;
  /** The name shown: «Safari su iPhone», «Chrome su Android»… */
  label: string;
  steps: readonly string[];
  /** Android: the «Installa» button replaces the steps when «beforeinstallprompt» arrives. */
  promptFirst: boolean;
}

const IN_APP: readonly [RegExp, string][] = [
  [/Instagram/i, "Instagram"],
  [/FBAN\/Messenger|FB_IAB\/Orca|MessengerForiOS|\bMessenger\b/i, "Messenger"],
  [/FBAN|FBAV|FB_IAB|FBIOS|\[FB/i, "Facebook"],
  [/WhatsApp/i, "WhatsApp"],
  [/Telegram/i, "Telegram"],
  [/musical_ly|BytedanceWebview|TikTok|ByteLocale/i, "TikTok"],
];

function version(match: RegExpMatchArray | null): number | null {
  return match ? Number(`${match[1]}.${match[2] ?? 0}`) : null;
}

/** The device from the user agent (maxTouchPoints: an iPad that says it is a Mac has a touch screen). */
export function detectDevice(userAgent: string, maxTouchPoints = 0): InstallDevice {
  const ua = userAgent;
  const inApp = IN_APP.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (ios) {
    const browser: InstallBrowser = /CriOS/.test(ua) ? "chrome" : /EdgiOS/.test(ua) ? "edge" : /FxiOS/.test(ua) ? "firefox"
      : /OPiOS|OPT\//.test(ua) ? "opera" : /Version\/[\d.]+.*Safari/.test(ua) && !/GSA\/|Ddg\/|YaBrowser/.test(ua) ? "safari" : "other";
    // iPadOS asking for the desktop site says «Mac OS X 10_15_7»: the Safari version tells the system then.
    const os = /iPhone|iPad|iPod/.test(ua) ? version(ua.match(/OS (\d+)_(\d+)/)) : null;
    const iosVersion = os ?? version(ua.match(/Version\/(\d+)\.?(\d+)?/));
    return { platform: "ios", browser, inApp, iosVersion, safariVersion: null };
  }
  if (/Android/.test(ua)) {
    const browser: InstallBrowser = /SamsungBrowser/.test(ua) ? "samsung" : /HuaweiBrowser|HBPC\/|PetalBrowser/.test(ua) ? "huawei"
      : /MiuiBrowser|XiaoMi/.test(ua) ? "mi" : /Firefox\//.test(ua) ? "firefox" : /EdgA\//.test(ua) ? "edge"
      : /OPR\/|OPX\/|Opera/.test(ua) ? "opera" : /Chrome\//.test(ua) && !/; wv\)/.test(ua) ? "chrome" : "other";
    return { platform: "android", browser, inApp, iosVersion: null, safariVersion: null };
  }
  const browser: InstallBrowser = /Edg\//.test(ua) ? "edge" : /OPR\//.test(ua) ? "opera" : /Firefox\//.test(ua) ? "firefox"
    : /Chrome\//.test(ua) ? "chrome" : /Macintosh/.test(ua) && /Version\/[\d.]+.*Safari/.test(ua) ? "safari" : "other";
  const safariVersion = browser === "safari" ? version(ua.match(/Version\/(\d+)\.?(\d+)?/)) : null;
  return { platform: "desktop", browser, inApp, iosVersion: null, safariVersion };
}

const NAME: Record<InstallBrowser, string> = {
  safari: "Safari", chrome: "Chrome", edge: "Edge", firefox: "Firefox", opera: "Opera",
  samsung: "Samsung Internet", huawei: "Huawei Browser", mi: "Mi Browser", other: "il tuo browser",
};

const HOME_IOS = ["Scegli «Aggiungi alla schermata Home» (scorri l’elenco se non la vedi).", "Tocca «Aggiungi»: l’icona compare sulla schermata Home."];

/** The steps for each browser, also listed on /installa. */
export const STEPS = {
  ios: {
    safari: ["Tocca Condividi (il quadrato con la freccia in su): sull’iPhone è nella barra in basso, sull’iPad in alto. Se non lo vedi, tocca prima ⋯.", ...HOME_IOS],
    chrome: ["Tocca Condividi (il quadrato con la freccia in su) in alto a destra, accanto all’indirizzo.", ...HOME_IOS],
    edge: ["Tocca ⋯ nella barra in basso, poi Condividi.", ...HOME_IOS],
    firefox: ["Tocca il menu ☰ in basso a destra, poi Condividi.", ...HOME_IOS],
    opera: ["Apri il menu di Opera e tocca Condividi.", ...HOME_IOS],
    other: ["Apri il menu del browser e tocca Condividi.", ...HOME_IOS],
  },
  android: {
    chrome: ["Tocca ⋮ in alto a destra.", "Scegli «Installa app» oppure «Aggiungi a schermata Home».", "Conferma con «Installa»."],
    edge: ["Tocca ≡ in basso.", "Scegli «Aggiungi al telefono».", "Conferma con «Installa»."],
    samsung: ["Tocca ≡ in basso a destra.", "Scegli «Aggiungi pagina a», poi «Schermata Home».", "Conferma con «Aggiungi»."],
    firefox: ["Tocca ⋮ (in alto o in basso, dove si trova la barra dell’indirizzo).", "Scegli «Aggiungi alla schermata Home» oppure «Installa».", "Conferma con «Aggiungi»."],
    huawei: ["Tocca ≡ in basso a destra.", "Scegli «Aggiungi a», poi «Schermata Home».", "Conferma con «Aggiungi»."],
    mi: ["Tocca ≡ in basso a destra.", "Scegli «Aggiungi a schermata Home» (a volte dentro «Strumenti»).", "Conferma con «Aggiungi»."],
    opera: ["Tocca ⋮ in alto a destra.", "Scegli «Aggiungi a…», poi «Schermata Home».", "Conferma con «Aggiungi»."],
    other: ["Apri il menu del browser (⋮ oppure ≡).", "Cerca «Aggiungi a schermata Home» oppure «Installa app».", "Conferma: l’icona compare tra le app."],
  },
  desktop: {
    chrome: ["Clicca l’icona Installa a destra nella barra dell’indirizzo.", "Oppure apri il menu ⋮ e scegli «Trasmetti, salva e condividi» → «Installa pagina come app»."],
    edge: ["Clicca l’icona Installa a destra nella barra dell’indirizzo.", "Oppure apri il menu ⋯ e scegli «App» → «Installa questo sito come app»."],
    safari: ["Nel menu in alto scegli Archivio → «Aggiungi al Dock».", "Conferma con «Aggiungi»: l’app si apre dal Dock e dal Launchpad."],
  },
} as const;

export const OPEN_SAFARI = ["Copia il link con il pulsante qui sotto.", "Apri Safari e incolla il link nella barra dell’indirizzo.", "Poi segui i passi per Safari: Condividi → «Aggiungi alla schermata Home»."];
export const OPEN_BROWSER = ["Tocca ⋯ (o i tre puntini) in alto e scegli «Apri nel browser» o «Apri in Safari».", "Oppure copia il link e incollalo nel browser.", "Dal browser segui i passi per installare l’app."];

function where(device: InstallDevice): string {
  return device.platform === "ios" ? "iPhone e iPad" : device.platform === "android" ? "Android" : "computer";
}

/** What the invite and /installa say on this device. */
export function installGuide(device: InstallDevice): InstallGuide {
  const label = `${NAME[device.browser]} su ${where(device)}`;
  if (device.inApp) return { kind: "inapp", label: `Browser di ${device.inApp}`, steps: OPEN_BROWSER, promptFirst: false };
  if (device.platform === "ios") {
    // Since iOS 16.4 every browser can add to the Home screen; before, only Safari.
    if (device.browser !== "safari" && (device.iosVersion ?? 0) < 16.4) return { kind: "open-safari", label, steps: OPEN_SAFARI, promptFirst: false };
    return { kind: "steps", label, steps: STEPS.ios[device.browser as keyof typeof STEPS.ios] ?? STEPS.ios.other, promptFirst: false };
  }
  if (device.platform === "android") {
    const chromium = ["chrome", "edge", "samsung", "opera"].includes(device.browser);
    return { kind: "steps", label, steps: STEPS.android[device.browser as keyof typeof STEPS.android] ?? STEPS.android.other, promptFirst: chromium };
  }
  if (device.browser === "chrome" || device.browser === "edge") return { kind: "button", label, steps: STEPS.desktop[device.browser], promptFirst: true };
  if (device.browser === "safari" && (device.safariVersion ?? 0) >= 17) return { kind: "steps", label: "Safari su Mac", steps: STEPS.desktop.safari, promptFirst: false };
  return { kind: "none", label, steps: [], promptFirst: false };
}
