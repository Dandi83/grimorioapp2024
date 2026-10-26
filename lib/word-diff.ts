/** A piece of a word diff: unchanged, only in the SRD text (removed), only in the current text (added). */
export interface DiffPart { kind: "same" | "srd" | "attuale"; text: string }

const tokens = (text: string) => text.match(/\s+|[^\s]+/g) ?? [];

function push(parts: DiffPart[], kind: DiffPart["kind"], text: string) {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last?.kind === kind) last.text += text;
  else parts.push({ kind, text });
}

/**
 * Word by word, the SRD text against the current one (spaces count as words: a changed line break shows too).
 * Longest common subsequence after the common start and end are set aside. Pure.
 */
export function wordDiff(srd: string, current: string): DiffPart[] {
  const a = tokens(srd), b = tokens(current);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const parts: DiffPart[] = [];
  push(parts, "same", a.slice(0, start).join(""));
  const x = a.slice(start, endA), y = b.slice(start, endB);
  // lengths[i][j]: the longest common run of x[i..] and y[j..].
  const width = y.length + 1;
  const lengths = new Uint32Array((x.length + 1) * width);
  for (let i = x.length - 1; i >= 0; i--) {
    for (let j = y.length - 1; j >= 0; j--) {
      lengths[i * width + j] = x[i] === y[j] ? lengths[(i + 1) * width + j + 1] + 1 : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { push(parts, "same", x[i]); i++; j++; }
    else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) push(parts, "srd", x[i++]);
    else push(parts, "attuale", y[j++]);
  }
  push(parts, "srd", x.slice(i).join(""));
  push(parts, "attuale", y.slice(j).join(""));
  push(parts, "same", a.slice(endA).join(""));
  return parts;
}
