"use client";

import { useSyncExternalStore } from "react";

import { detectDevice, installGuide, type InstallGuide } from "@/lib/install-guide";

/** Chromium's install event, kept for the «Installa» button of the invite and of /installa. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

/** Listens once for the whole app (the event comes only once per page load). */
export function startInstallCapture() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", event => {
    // No mini-infobar of Chrome: the invite of the app takes its place.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    device = undefined;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The install event when the browser has sent it, else null. */
export function useInstallEvent(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(subscribe, () => deferred, () => null);
}

const DISMISS_KEY = "grimorio-install-dismissed";

export interface DeviceAdvice {
  installed: boolean;
  /** «Chiudi» on the invite, less than 7 days ago. */
  dismissed: boolean;
  guide: InstallGuide;
}

let device: DeviceAdvice | undefined;

function readDevice(): DeviceAdvice {
  if (!device) {
    let dismissed = false;
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      dismissed = until > 0 && Date.now() < until;
    } catch {
      // No storage: the invite shows anyway.
    }
    device = { installed: isInstalled(), dismissed, guide: installGuide(detectDevice(navigator.userAgent, navigator.maxTouchPoints || 0)) };
  }
  return device;
}

/** This browser and what it can do (null while the server draws the page). */
export function useDeviceAdvice(): DeviceAdvice | null {
  return useSyncExternalStore(subscribe, readDevice, () => null);
}

/** «Chiudi»: no invite for 7 days. */
export function dismissInvite() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 864e5));
  } catch {
    // ignore
  }
}

/** Opens the browser's install window; true when accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}

/** Opened from the Home screen (or as a computer app): no invite then. */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const display = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"].some(mode => window.matchMedia?.(`(display-mode: ${mode})`).matches);
  return display || (window.navigator as unknown as { standalone?: boolean }).standalone === true || document.referrer.startsWith("android-app://");
}

/** Copies the address of the page: the clipboard, else a hidden field (old WebViews). */
export async function copyLink(url = window.location.href): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    let done = false;
    try { done = document.execCommand("copy"); } catch { /* not allowed */ }
    field.remove();
    return done;
  }
}

// As soon as the code of the page runs: Chromium may send its event before the invite is drawn.
startInstallCapture();
