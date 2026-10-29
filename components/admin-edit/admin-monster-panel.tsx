"use client";

import { useEffect, useState } from "react";

import { useAdminSession } from "@/components/admin-edit/admin-session";

/**
 * A box of the administrator under a monster sheet, drawn by the server (/api/admin/pannello-mostro) and asked for only
 * after the session check: the public page and the browser code carry none of its content.
 */
export function AdminMonsterPanel({ id }: { id: string }) {
  const admin = useAdminSession();
  const [html, setHtml] = useState("");
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    fetch(`/api/admin/pannello-mostro?id=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then(data => { if (typeof data?.html === "string") setHtml(data.html); })
      .catch(() => {});
    return () => controller.abort();
  }, [admin, id]);
  if (!admin || !html) return null;
  return <div className="px-6" data-admin-monster-panel="" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The same box in the editor: the sheet being written, sent only on «Ricalcola» (never at every key). */
export function EditorMonsterPanel({ sheet, label }: { sheet: () => Record<string, unknown> | null; label: string }) {
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    const body = sheet();
    if (!body) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/pannello-mostro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = response.ok ? await response.json() : null;
      if (typeof data?.html === "string") setHtml(data.html);
    } catch {} finally { setBusy(false); }
  }
  return (
    <div data-editor-monster-panel="">
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
      <button type="button" onClick={() => void run()} disabled={busy} data-editor-panel-refresh=""
        className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-primary disabled:opacity-50">
        {busy ? "Calcolo…" : label}
      </button>
    </div>
  );
}
