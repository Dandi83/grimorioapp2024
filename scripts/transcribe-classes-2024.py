#!/usr/bin/env python3
"""Classi 2024 (SRD 5.2.1 IT): dati strutturati per le pagine /classi.

Il testo viene dalle 12 voci «Classi» già trascritte in lib/data/srd-manual-5.2.1-it.json (ogni blocco
con la sua impronta sourceHash): questo script le divide in tratti, tabella dei privilegi, privilegi per
livello, opzioni (metamagia, suppliche), lista degli incantesimi e sottoclasse, senza riscrivere nulla.

Il PDF ufficiale serve solo per due prove che il testo trascritto non porta con sé:
  - i trattini morbidi (\\xad): una parola spezzata tra due blocchi o a fine riga di una tabella si
    ricompone solo se il PDF la sillaba lì;
  - il corsivo del motto della sottoclasse e le etichette in grassetto corsivo a inizio paragrafo.
Ogni ricomposizione finisce in lib/data/classes-repairs-2024.json con il motivo.

Uso: python3 scripts/transcribe-classes-2024.py /percorso/IT_SRD_CC_v5.2.1.pdf
Il risultato è lib/data/srd-classes-5.2.1-it.json; tests/classes-2024.cjs ne verifica ogni testo
contro le impronte del manuale.
"""
import collections, hashlib, json, re, sys, unicodedata
from pathlib import Path

import pymupdf

R = Path(__file__).resolve().parents[1]
MANUAL = R / "lib/data/srd-manual-5.2.1-it.json"
OUT = R / "lib/data/srd-classes-5.2.1-it.json"
REPAIRS = R / "lib/data/classes-repairs-2024.json"
SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718"

CLASSES = ["barbaro", "bardo", "chierico", "druido", "guerriero", "ladro", "mago", "monaco", "paladino", "ranger", "stregone", "warlock"]

BASE = ["Livello", "Bonus di competenza", "Privilegi di classe"]
SLOTS9 = [str(n) for n in range(1, 10)]
SLOTS5 = [str(n) for n in range(1, 6)]
SLOT_GROUP = "—Slot incantesimo per livello di incantesimo—"
# Column labels of each «Privilegi del …» table as printed (the multi-line headers, read once by hand);
# the test checks that their characters are exactly those of the printed header.
FEATURE_COLUMNS = {
    "barbaro": (BASE + ["Ire", "Danni dell'ira", "Padronanza d'armi"], None),
    "bardo": (BASE + ["Dado bardico", "Trucchetti", "Incantesimi preparati"] + SLOTS9, SLOT_GROUP),
    "chierico": (BASE + ["Incanalare divinità", "Trucchetti", "Incantesimi preparati"] + SLOTS9, SLOT_GROUP),
    "druido": (BASE + ["Forma selvatica", "Trucchetti", "Incantesimi preparati"] + SLOTS9, SLOT_GROUP),
    "guerriero": (BASE + ["Recuperare energie", "Padronanza d'armi"], None),
    "ladro": (BASE + ["Attacco furtivo"], None),
    "mago": (BASE + ["Trucchetti", "Incantesimi preparati"] + SLOTS9, SLOT_GROUP),
    "monaco": (BASE + ["Arti marziali", "Punti concentrazione", "Movimento senza armatura"], None),
    "paladino": (BASE + ["Incanalare divinità", "Incantesimi preparati"] + SLOTS5, SLOT_GROUP),
    "ranger": (BASE + ["Nemico prescelto", "Incantesimi preparati"] + SLOTS5, SLOT_GROUP),
    "stregone": (BASE + ["Punti stregoneria", "Trucchetti", "Incantesimi preparati"] + SLOTS9, SLOT_GROUP),
    "warlock": (BASE + ["Suppliche occulte", "Trucchetti", "Incantesimi preparati", "Slot incantesimo", "Livello di slot"], None),
}
# Smaller tables inside a feature: printed title -> column labels.
INNER_COLUMNS = {
    "Forme bestiali": ["Livello da druido", "Forme conosciute", "GS max", "Velocità di volo"],
    "Terra arida": ["Livello da druido", "Incantesimi del Circolo"],
    "Terra polare": ["Livello da druido", "Incantesimi del Circolo"],
    "Terra temperata": ["Livello da druido", "Incantesimi del Circolo"],
    "Terra tropicale": ["Livello da druido", "Incantesimi del Circolo"],
    "Interdizione della Natura": ["Tipo di terra", "Resistenza", "Tipo di terra", "Resistenza"],
    "Incantesimi del Giuramento di devozione": ["Livello da paladino", "Incantesimi"],
    "Creazione degli slot incantesimo": ["Livello slot incantesimo", "Costo punti stregoneria", "Liv. stregone minimo"],
    "Incantesimi draconici": ["Livello da stregone", "Incantesimi"],
    "Incantesimi del Dominio della Vita": ["Livello da chierico", "Incantesimi preparati"],
    "Incantesimi immondi": ["Livello da warlock", "Incantesimi"],
}
# Boxed sidebars printed as a table frame: a title and paragraphs.
SIDEBARS = ["Giuramenti infranti", "Ampliare e sostituire un libro degli incantesimi"]
SCHOOLS = {"Abiurazione", "Ammaliamento", "Divinazione", "Evocazione", "Illusione", "Invocazione", "Necromanzia", "Trasmutazione"}
TERMINAL = re.compile(r"[.!?:…][\"»”’)]*$")

repairs = {"sillabazioni": []}


def chars(text):
    return collections.Counter(c.casefold() for c in unicodedata.normalize("NFKC", text.replace("\xad", "")) if not c.isspace())


def ws(text):
    return re.sub(r"\s+", " ", text).strip()


class Pdf:
    """Soft hyphens, bold-italic run-in labels and italic lines, page by page."""

    def __init__(self, path):
        data = Path(path).read_bytes()
        assert hashlib.sha256(data).hexdigest() == SHA, "PDF diverso da SRD 5.2.1 IT"
        self.doc = pymupdf.open(stream=data)
        self.cache = {}

    def page(self, number):
        if number in self.cache:
            return self.cache[number]
        soft, labels, italics = set(), set(), set()
        for block in self.doc[number - 1].get_text("dict")["blocks"]:
            bold_run, italic_run = [], []
            for line in block.get("lines", []):
                text = "".join(span["text"] for span in line["spans"]).rstrip()
                match = re.search(r"([^\s\xad]+)\xad$", text)
                if match:
                    soft.add(match.group(1))
                for span in line["spans"]:
                    font = span["font"]
                    if font in ("Cambria-BoldItalic", "GillSans-BoldItalic"):
                        bold_run.append(span["text"])
                    elif bold_run and span["text"].strip():
                        labels.add(ws("".join(bold_run).replace("\xad", "")))
                        bold_run = []
                    if font == "Cambria-Italic":
                        italic_run.append(span["text"])
            if bold_run:
                labels.add(ws("".join(bold_run).replace("\xad", "")))
            if italic_run:
                italics.add(ws("".join(italic_run).replace("\xad", "")))
        self.cache[number] = (soft, labels, italics)
        return self.cache[number]

    def soft(self, fragment, pages):
        return any(fragment in self.page(p)[0] for p in pages)

    def label(self, text, pages):
        found = [label for p in pages for label in self.page(p)[1] if label and text.startswith(label) and len(label) < len(text)]
        return max(found, key=len) if found else None

    def italic(self, text, pages):
        return any(text == line for p in pages for line in self.page(p)[2])


def word_join(pdf, cls, before, after, pages, where):
    """`before` ends a block (or a table line) and `after` follows: one word when the PDF hyphenates there."""
    hyphen = before.endswith("-")
    tail = re.search(r"([^\s\-]+)-?$", before)
    if tail and pdf.soft(tail.group(1), pages):
        head = after.split(" ", 1)[0]
        joined = before[:-1] + after if hyphen else before + after
        repairs["sillabazioni"].append({
            "classe": cls, "pagina": pages[0], "dove": where,
            "da": f"{tail.group(1)}{'-' if hyphen else ''} {head}", "a": tail.group(1) + head,
            "motivo": "Parola sillabata a fine riga nel PDF (trattino morbido): ricomposta" + (", senza il trattino della riga." if hyphen else ", i due pezzi erano in blocchi trascritti separati."),
        })
        return joined
    return before + " " + after


# ——— Blocks of an entry ———

def is_feature_table(block):
    text = block["text"]
    return block["kind"] == "table" and (text.strip().startswith(("Privilegi del ", "Privilegi dello ")) or ("Bonus di" in text and re.search(r"^\s*1\s+\+2\s", text, re.M)))


def sections(blocks):
    out, current = [], {"titolo": None, "idx": None, "items": []}
    for i, block in enumerate(blocks):
        if block["kind"] == "heading" and block["size"] >= 13.5:
            out.append(current)
            current = {"titolo": block["text"], "idx": i, "items": []}
        else:
            current["items"].append((i, block))
    out.append(current)
    return out


def subsections(items):
    intro, subs = [], []
    for i, block in items:
        if block["kind"] == "heading":
            subs.append({"titolo": block["text"], "idx": i, "page": block["page"], "items": []})
        else:
            (subs[-1]["items"] if subs else intro).append((i, block))
    return intro, subs


def content(pdf, cls, items):
    """Paragraphs and tables of a section, with paragraphs cut by a column or page break joined."""
    out, pending = [], []
    for i, block in items:
        if block["kind"] == "table":
            parsed = table_items(pdf, cls, i, block)
            (pending if out and out[-1]["tipo"] == "p" and not TERMINAL.search(out[-1]["testo"]) else out).extend(parsed)
            continue
        last = out[-1] if out and out[-1]["tipo"] == "p" else None
        if last and not TERMINAL.search(last["testo"]):
            pages = sorted({last["pagina"], block["page"]})
            last["testo"] = word_join(pdf, cls, last["testo"], block["text"], pages, "testo")
            last["blocchi"].append(i)
        else:
            out.extend(pending)
            pending = []
            out.append({"tipo": "p", "testo": block["text"], "blocchi": [i], "pagina": block["page"]})
    out.extend(pending)
    for item in out:
        if item["tipo"] == "p":
            label = pdf.label(item["testo"], [item["pagina"], item["pagina"] + 1])
            if label:
                item["etichetta"] = label
    return out


def cell_lines(pdf, cls, lines, page):
    text = ""
    for line in lines:
        line = line.strip()
        if not line:
            continue
        text = word_join(pdf, cls, text, line, [page], "tabella") if text else line
    return text


def table_items(pdf, cls, idx, block):
    text, page = block["text"], block["page"]
    first = text.split("\n", 1)[0].strip()
    sidebar = next((title for title in SIDEBARS if ws(text).startswith(title)), None)
    if sidebar:
        return [sidebar_item(pdf, cls, idx, block, sidebar)]
    tables = []
    for part in re.split(r"\n\s*\n", text):
        title = part.split("\n", 1)[0].strip()
        assert title in INNER_COLUMNS, (cls, "tabella sconosciuta", first)
        tables.append(inner_table(pdf, cls, idx, page, part, title))
    return tables


def sidebar_item(pdf, cls, idx, block, title):
    lines = block["text"].split("\n")
    taken, consumed = "", 0
    while ws(taken) != title:
        taken += " " + lines[consumed]
        consumed += 1
    paragraphs = []
    for line in lines[consumed:]:
        if not paragraphs or (line.startswith(" ") and line.strip()):
            paragraphs.append([line])
        else:
            paragraphs[-1].append(line)
    out = []
    for lines_of in paragraphs:
        testo = cell_lines(pdf, cls, lines_of, block["page"])
        item = {"testo": testo}
        label = pdf.label(testo, [block["page"]])
        if label:
            item["etichetta"] = label
        out.append(item)
    return {"tipo": "riquadro", "titolo": title, "paragrafi": out, "blocco": idx, "pagina": block["page"]}


def check_header(cls, header_text, labels):
    got, want = chars(header_text), chars("".join(labels))
    assert got == want, (cls, "intestazione diversa", got - want, want - got)


def inner_table(pdf, cls, idx, page, text, title):
    columns = INNER_COLUMNS[title]
    lines = text.split("\n")[1:]
    header, rows = [], []
    for line in lines:
        if not line.strip():
            continue
        if title == "Interdizione della Natura":
            if not rows and len(header) < 2:
                header.append(line)
            else:
                rows.append(line.split())
            continue
        if re.match(r"^\s*\d", line):
            rows.append([[part] for part in re.split(r"\s{2,}", line.strip())])
        elif not rows:
            header.append(line)
        else:
            rows[-1][-1].append(line)
    check_header(cls, "\n".join(header), columns)
    if title != "Interdizione della Natura":
        rows = [[cell_lines(pdf, cls, cell, page) for cell in row] for row in rows]
    for row in rows:
        assert len(row) == len(columns), (cls, title, row)
    return {"tipo": "tabella", "titolo": title, "colonne": columns, "righe": rows, "blocco": idx, "pagina": page}


VALUE = re.compile(r"(?:^|\s)(\+\d+(?:,\d+)? m|\d+d\d+|D\d+|\+\d+|\d+|—)\s*$")


def feature_table(pdf, cls, blocks_idx, blocks, entry, title_in_traits=None):
    columns, group = FEATURE_COLUMNS[cls]
    text = "\n".join(blocks[i]["text"] for i in blocks_idx)
    page = blocks[blocks_idx[-1]]["page"]
    lines = text.split("\n")
    title = None
    if lines[0].strip().startswith("Privilegi del"):
        title = lines.pop(0).strip()
    if title is None:
        # Transcribed at the end of the «Tratti» block, just before the table.
        assert title_in_traits, (cls, "titolo della tabella")
        title = title_in_traits
    header, rows = [], []
    for line in lines:
        match = re.match(r"^\s*(\d{1,2})\s+(\+\d)\s+(.*)$", line)
        if match:
            rows.append({"cells": [match.group(1), match.group(2)], "rest": match.group(3).rstrip(), "more": []})
        elif not rows:
            header.append(line)
        else:
            rows[-1]["more"].append(line)
    check_header(cls, "\n".join(header), columns + ([group] if group else []))
    values = len(columns) - 3
    out = []
    for row in rows:
        rest, tail = row["rest"], []
        for _ in range(values):
            match = VALUE.search(rest)
            assert match, (cls, "valori mancanti", row)
            tail.insert(0, match.group(1))
            rest = rest[:match.start(1)].rstrip()
        features = cell_lines(pdf, cls, [rest] + row["more"], page)
        out.append(row["cells"] + [features] + tail)
    assert [int(row[0]) for row in out] == list(range(1, 21)), (cls, "livelli", [row[0] for row in out])
    table = {"titolo": title, "colonne": columns, "righe": out, "blocchi": blocks_idx, "pagina": page}
    if group:
        table["gruppo"] = {"testo": group, "da": columns.index("1"), "a": len(columns) - 1}
    if title_in_traits and title == title_in_traits:
        table["titoloBlocco"] = 0
    return table


def traits(pdf, cls, block):
    lines = block["text"].rstrip("\n").split("\n")
    # For four classes the title of the next table («Privilegi del mago») closes this block.
    next_title = lines.pop().strip() if lines[-1].strip().startswith("Privilegi del") else None
    lines = [line for line in lines if line.strip()]
    title = lines[0].strip()
    col = re.match(r"^(\S.*?\S)\s{2,}\S", lines[1]).end() - 1
    items = []
    for line in lines[1:]:
        label, value = line[:col].strip(), line[col:].strip()
        assert not (len(line) > col and line[col - 1] != " " and line[:col].rstrip() == line[:col] and label and value), (cls, "colonna", line)
        if label and label[0].isupper():
            items.append({"etichetta": label, "righe": [value] if value else []})
        else:
            if label:
                items[-1]["etichetta"] += " " + label
            if value:
                items[-1]["righe"].append(value)
    voci = [{"etichetta": item["etichetta"], "valore": cell_lines(pdf, cls, item["righe"], block["page"])} for item in items]
    return {"titolo": title, "voci": voci, "blocco": 0, "pagina": block["page"]}, next_title


def spell_list(pdf, cls, items, title_idx, title):
    intro = content(pdf, cls, [(i, b) for i, b in items if b["kind"] != "table"])
    levels = []
    for i, block in items:
        if block["kind"] != "table":
            continue
        for line in block["text"].split("\n"):
            line = line.strip()
            if not line or re.match(r"^Incantesimo\s+Scuola\s+Speciale$", line):
                continue
            match = re.match(r"^(?:Trucchetti \(incantesimi da .+ di livello 0\)|Incantesimi da .+ di (\d)º livello)$", line)
            if match:
                levels.append({"livello": int(match.group(1) or 0), "titolo": line, "voci": [], "blocchi": [i]})
                continue
            if i not in levels[-1]["blocchi"]:
                levels[-1]["blocchi"].append(i)
            # The school column is one of eight words; a long name can touch it or wrap to the next line.
            row = re.match(r"^(.+?)\s+(" + "|".join(SCHOOLS) + r")\s{2,}(\S.*)$", line)
            if row:
                levels[-1]["voci"].append({"nome": row.group(1), "scuola": row.group(2), "speciale": row.group(3), "blocco": i})
            else:
                assert not re.search(r"\s{2,}", line), (cls, "riga incantesimo", line)
                last = levels[-1]["voci"][-1]
                last["nome"] = word_join(pdf, cls, last["nome"], line, [block["page"]], "lista incantesimi")
    return {"titolo": title, "blocco": title_idx, "intro": intro, "livelli": levels}


def features(pdf, cls, subs):
    out = []
    for sub in subs:
        match = re.match(r"^Livello (\d+): (.+)$", sub["titolo"])
        assert match, (cls, sub["titolo"])
        out.append({"livello": int(match.group(1)), "titolo": match.group(2), "blocco": sub["idx"], "pagina": sub["page"], "contenuto": content(pdf, cls, sub["items"])})
    return out


def build_class(pdf, entry):
    cls = entry["id"].removeprefix("personaggi-")
    blocks = entry["blocks"]
    secs = sections(blocks)
    data = {"id": cls, "nome": entry["title"], "pagina": entry["page"], "pagine": entry["pages"], "voce": entry["id"]}
    assert blocks[0]["kind"] == "table" and blocks[0]["text"].startswith("Tratti")
    data["tratti"], next_title = traits(pdf, cls, blocks[0])
    table_idx = [i for i, b in enumerate(blocks) if is_feature_table(b)]
    data["tabella"] = feature_table(pdf, cls, table_idx, blocks, entry, next_title)
    data["opzioni"] = []
    for sec in secs[1:]:
        title = sec["titolo"]
        items = [(i, b) for i, b in sec["items"] if i not in table_idx]
        intro, subs = subsections(items)
        if title.startswith("Diventare "):
            data["diventare"] = {"titolo": title, "blocco": sec["idx"], "parti": [
                {"titolo": sub["titolo"], "blocco": sub["idx"], "contenuto": content(pdf, cls, sub["items"])} for sub in subs]}
        elif title.startswith("Privilegi di classe"):
            data["introPrivilegi"] = {"titolo": title, "blocco": sec["idx"], "contenuto": content(pdf, cls, intro)}
            data["privilegi"] = features(pdf, cls, subs)
        elif title.startswith("Opzioni di"):
            data["opzioni"].append({"titolo": title, "blocco": sec["idx"], "intro": content(pdf, cls, intro), "voci": [
                {"titolo": sub["titolo"], "blocco": sub["idx"], "pagina": sub["page"], "contenuto": content(pdf, cls, sub["items"])} for sub in subs]})
        elif title.startswith("Lista degli incantesimi"):
            assert not subs
            data["incantesimi"] = spell_list(pdf, cls, items, sec["idx"], title)
        elif title.startswith("Sottoclasse "):
            match = re.match(r"^Sottoclasse (?:del|dello|della) [^:]+: (.+)$", title)
            assert match, title
            # The motto is one italic line without a full stop: kept apart from the description.
            motto_idx, motto = intro[0]
            assert motto["kind"] == "prose" and pdf.italic(motto["text"], [motto["page"]]), (cls, "motto", motto)
            data["sottoclasse"] = {
                "nome": match.group(1), "titolo": title, "blocco": sec["idx"], "pagina": blocks[sec["idx"]]["page"],
                "motto": {"testo": motto["text"], "blocchi": [motto_idx]},
                "descrizione": content(pdf, cls, intro[1:]),
                "privilegi": features(pdf, cls, subs),
            }
        else:
            raise AssertionError((cls, "sezione sconosciuta", title))
    class_levels = [f["livello"] for f in data["privilegi"] if f["titolo"].lower().startswith("sottoclasse ")]
    assert len(class_levels) == 1, (cls, class_levels)
    data["livelloSottoclasse"] = class_levels[0]
    data["livelliSottoclasse"] = sorted({f["livello"] for f in data["sottoclasse"]["privilegi"]})
    return data


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pdf = Pdf(sys.argv[1])
    manual = json.loads(MANUAL.read_text())
    assert manual["sourceSha256"] == SHA
    entries = {entry["id"]: entry for entry in manual["entries"]}
    classes = [build_class(pdf, entries["personaggi-" + cls]) for cls in CLASSES]
    OUT.write_text(json.dumps({
        "fonte": "SRD 5.2.1 IT", "sourceUrl": manual["sourceUrl"], "sourceSha256": SHA,
        "nota": "Generato da scripts/transcribe-classes-2024.py dalle voci «Classi» di srd-manual-5.2.1-it.json: non modificare a mano.",
        "classi": classes,
    }, ensure_ascii=False, indent=1) + "\n")
    REPAIRS.write_text(json.dumps({
        "_nota": "Riparazioni di sola visualizzazione delle Classi 2024 (lib/data/srd-classes-5.2.1-it.json), trovate da scripts/transcribe-classes-2024.py con il PDF SRD 5.2.1 IT. Il manuale trascritto (srd-manual-5.2.1-it.json) non cambia.",
        **repairs,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(classes)} classi, {len(repairs['sillabazioni'])} sillabazioni ricomposte")


if __name__ == "__main__":
    main()
