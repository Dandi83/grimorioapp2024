"use client";
import type { AnalyticsEvent } from "./analytics-events";
export function trackAnalytics(event:AnalyticsEvent) {
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("grimorio:analytics-event",{detail:{event}}));
}
export function openAnalyticsPreferences() {
  if(typeof window!=="undefined")window.dispatchEvent(new Event("grimorio:analytics-preferences"));
}
