/** The events of the invite «da TPK» (lib/analytics-events.ts TPK_INVITE_EVENTS): sent at once, never with the next page view. */
export type TpkInviteEvent = "tpk_invite_shown" | "tpk_invite_tapped" | "tpk_invite_guide" | "tpk_invite_installed" | "tpk_invite_closed";
export function sendTpkInviteEvent(event: TpkInviteEvent) {
  window.dispatchEvent(new CustomEvent("grimorio:analytics-event", { detail: { event } }));
}
