"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Eraser, Italic } from "lucide-react";
import { sanitizeEditorHtml } from "@/lib/monster-editor-content";

/** A small visual editor: pasted content is plain text, formatting is explicit. */
export function AdminVisualText({
  id,
  label,
  initialHtml,
  onChange,
}: {
  id: string;
  label: string;
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const initial = useRef(initialHtml);
  const [notice, setNotice] = useState("");
  function protectTables() {
    area.current
      ?.querySelectorAll("pre")
      .forEach((table) => table.setAttribute("contenteditable", "false"));
  }
  useEffect(() => {
    if (area.current) {
      area.current.innerHTML = sanitizeEditorHtml(initial.current);
      protectTables();
    }
  }, []);
  const emit = () => onChange(sanitizeEditorHtml(area.current?.innerHTML ?? ""));

  function selectionRange() {
    const selection = window.getSelection();
    if (
      !selection?.rangeCount ||
      !area.current?.contains(selection.getRangeAt(0).commonAncestorContainer)
    )
      return;
    return { selection, range: selection.getRangeAt(0) };
  }

  function format(tag: "strong" | "em" | "plain") {
    if (tag === "plain") {
      if (area.current)
        area.current.innerHTML = sanitizeEditorHtml(area.current.innerHTML).replace(
          /<\/?(?:strong|em)>/g,
          "",
        );
      protectTables();
      emit();
      return;
    }
    const current = selectionRange();
    if (!current || current.range.collapsed) return;
    if (intersectsTable(current.range)) {
      setNotice(
        "Le tabelle mantengono il formato originale. Seleziona il testo esterno alla tabella.",
      );
      return;
    }
    const element = document.createElement(tag);
    element.append(current.range.extractContents());
    current.range.insertNode(element);
    current.range.selectNodeContents(element);
    current.selection.removeAllRanges();
    current.selection.addRange(current.range);
    emit();
  }

  function intersectsTable(range: Range) {
    return [...(area.current?.querySelectorAll("pre") ?? [])].some((table) =>
      range.intersectsNode(table),
    );
  }

  return (
    <div>
      <label id={`${id}-label`} htmlFor={id} className="mb-1.5 block text-sm text-muted-foreground">
        {label}
      </label>
      <div className="overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary">
        <div
          role="toolbar"
          aria-label={`Formattazione ${label.toLowerCase()}`}
          className="flex flex-wrap items-center gap-1 border-b border-border p-1"
        >
          {(
            [
              { tag: "strong", label: "Grassetto", Icon: Bold },
              { tag: "em", label: "Corsivo", Icon: Italic },
              { tag: "plain", label: "Testo normale", Icon: Eraser },
            ] as const
          ).map(({ tag, label: buttonLabel, Icon }) => (
            <button
              key={tag}
              type="button"
              title={
                tag === "plain"
                  ? "Rimuovi grassetto e corsivo da tutta questa descrizione"
                  : `${buttonLabel}: seleziona prima il testo`
              }
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => format(tag)}
              className="flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {buttonLabel}
            </button>
          ))}
        </div>
        <div
          ref={area}
          id={id}
          role="textbox"
          aria-labelledby={`${id}-label`}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          className="min-h-28 whitespace-pre-wrap break-words px-3 py-3 text-base leading-7 text-foreground outline-none [&_strong]:font-semibold [&_em]:italic [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre"
          onInput={emit}
          onKeyDown={(event) => {
            const current = selectionRange();
            const editingKey =
              event.key.length === 1 || ["Backspace", "Delete", "Enter"].includes(event.key);
            if (
              current &&
              intersectsTable(current.range) &&
              editingKey &&
              ((!event.metaKey && !event.ctrlKey) || /^[biu]$/i.test(event.key))
            ) {
              event.preventDefault();
              setNotice(
                "Le tabelle mantengono il formato originale. Modifica il testo esterno alla tabella.",
              );
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const current = selectionRange();
            if (!current) return;
            if (intersectsTable(current.range)) {
              setNotice(
                "Le tabelle mantengono il formato originale. Incolla il testo fuori dalla tabella.",
              );
              return;
            }
            const fragment = document.createDocumentFragment();
            event.clipboardData
              .getData("text/plain")
              .split(/\r?\n/)
              .forEach((line, index) => {
                if (index) fragment.append(document.createElement("br"));
                fragment.append(document.createTextNode(line));
              });
            const last = fragment.lastChild;
            current.range.deleteContents();
            current.range.insertNode(fragment);
            if (last) {
              current.range.setStartAfter(last);
              current.range.collapse(true);
              current.selection.removeAllRanges();
              current.selection.addRange(current.range);
            }
            emit();
          }}
        />
      </div>
      {initialHtml.includes("<pre>") && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Le tabelle esistenti mantengono il proprio formato e non si modificano in questo campo.
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs leading-5 text-primary">
          {notice}
        </p>
      )}
    </div>
  );
}
