#!/usr/bin/env python3
"""Classi 2014 (SRD 5.1 italiano, pp. 8-59): dati strutturati per le pagine /classi, edizione 2014.

Legge il PDF ufficiale riga per riga nell'ordine del documento (due colonne): nome della classe (26 pt),
sezioni (18 pt), privilegi (14 pt), titoletti e privilegi della sottoclasse (12 pt), tabelle (titolo in
grassetto 12 pt, celle 9 pt). Un paragrafo nuovo comincia con una riga rientrata. Le tabelle sono
ricostruite dalle posizioni delle celle sotto le intestazioni; la tabella di classe, spezzata tra due
colonne, ripete l'intestazione e viene riunita.

Livelli: i privilegi di classe prendono il livello dalla colonna «Privilegi» della tabella della classe;
i privilegi della sottoclasse dalla frase stampata all'inizio del testo («Al 3° livello», «A partire dal
6° livello»). Nulla è dedotto oltre a questo: un privilegio senza livello stampato resta un titoletto
della descrizione.

Ogni blocco porta pagina e impronta (sha256 dei caratteri del PDF, come srd-manual-5.2.1-it.json):
tests/classes-2014.cjs verifica che il testo mostrato abbia esattamente quei caratteri.
Riparazioni (solo sillabazioni a fine riga) in lib/data/classes-repairs-2014.json, con il motivo.

Uso: python3 scripts/transcribe-srd51-classes.py /percorso/SRD_CC_v5.1_IT.pdf
"""
import collections, hashlib, json, re, sys, unicodedata
from pathlib import Path

import pymupdf

R = Path(__file__).resolve().parents[1]
OUT = R / "lib/data/srd-classes-5.1-it.json"
REPAIRS = R / "lib/data/classes-repairs-2014.json"
SHA = "2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7"
SOURCE_URL = "https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf"
FIRST, LAST = 8, 59

CLASSES = ["barbaro", "bardo", "chierico", "druido", "guerriero", "ladro", "mago", "monaco", "paladino", "ranger", "stregone", "warlock"]
# The one subclass of each class in the SRD, as printed, and the class feature that grants it.
SUBCLASSES = {
    "barbaro": ("Cammino del Berserker", "Cammino Primordiale"), "bardo": ("Collegio della Sapienza", "Collegio Bardico"),
    "chierico": ("Dominio della Vita", "Dominio Divino"), "druido": ("Circolo della Terra", "Circolo Druidico"),
    "guerriero": ("Campione", "Archetipo Marziale"), "ladro": ("Furfante", "Archetipo Ladresco"),
    "mago": ("Scuola di invocazione", "Tradizione Arcana"), "monaco": ("Via della Mano Aperta", "Tradizione Monastica"),
    "paladino": ("Giuramento di Devozione", "Giuramento Sacro"), "ranger": ("Cacciatore", "Archetipo Ranger"),
    "stregone": ("Discendenza draconica", "Origine Stregonesca"), "warlock": ("L'Immondo", "Patrono Ultraterreno"),
}
TRAIT_GROUPS = {"punti ferita", "competenze", "equipaggiamento"}
LEVEL = re.compile(r"\b(?:[Aa]l|[Dd]al|[Aa]ll'|[Dd]all')\s?(\d{1,2})° livello")

repairs = {"sillabazioni": []}


def chars(text):
    return collections.Counter(c.casefold() for c in unicodedata.normalize("NFKC", text.replace("\xad", "")) if not c.isspace())


def proof(text):
    return hashlib.sha256("".join(sorted(chars(text).elements())).encode()).hexdigest()


def ws(text):
    return re.sub(r"\s+", " ", text).strip()


class Line:
    def __init__(self, page, spans):
        self.page = page
        self.spans = spans
        first = next(s for s in spans if s["text"].strip())
        self.size = round(first["size"], 1)
        self.font = first["font"]
        self.x = first["bbox"][0]
        self.y = first["origin"][1]
        self.text = "".join(s["text"] for s in spans)
        self.used = False

    @property
    def kind(self):
        if self.size >= 25:
            return "class"
        if 17 <= self.size <= 19:
            return "section"
        if 13.5 <= self.size <= 14.5:
            return "feature"
        if 11.5 <= self.size <= 12.5:
            return "tabletitle" if "Bold" in self.font else "sub"
        if 10.6 <= self.size <= 11.4 and self.font.startswith("Calibri"):
            return "sidebartitle"
        if self.size < 9.6 and self.font.startswith("Calibri"):
            return "cell"
        return "text"


def read_lines(doc):
    lines = []
    for number in range(FIRST, LAST + 1):
        for block in doc[number - 1].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                spans = [s for s in line["spans"] if s["text"]]
                if not spans or not "".join(s["text"] for s in spans).strip():
                    continue
                if spans[0]["origin"][1] > 740:  # footer: page number and notice
                    continue
                lines.append(Line(number, spans))
    return lines


def join_text(cls, before, after, page, where):
    """Two printed lines of the same paragraph or cell."""
    if before.endswith("-") and after[:1].islower():
        repairs["sillabazioni"].append({"classe": cls, "pagina": page, "dove": where, "da": f"{before.split()[-1]} {after.split()[0]}",
                                        "a": before.split()[-1][:-1] + after.split()[0], "motivo": "Parola sillabata a fine riga nel PDF: ricomposta senza il trattino della riga."})
        return before[:-1] + after
    return before + " " + after


# ——— Paragraphs ———

def bold_label(line):
    label = ""
    for span in line.spans:
        if not label and not span["text"].strip():
            continue
        if "Bold" in span["font"]:
            label += span["text"]
        else:
            break
    return ws(label) or None


def paragraphs(cls, lines):
    """Text lines → paragraphs: an indented line (leading space) or a bullet starts a new one."""
    out = []
    for n, line in enumerate(lines):
        line.used = True
        text = line.text.rstrip()
        bullet = line.font.startswith("Symbol") or text.lstrip().startswith("•")
        formula = line.font == "Calibri-Bold"
        new = not out or text.startswith(" ") or bullet or formula or bold_label(line) and out[-1].get("closed")
        if bullet:
            text = "• " + text.lstrip().lstrip("•").lstrip()
        if new:
            item = {"testo": ws(text), "pagina": line.page, "raw": [line.text], "x": line.x, "bullet": bullet, "formula": formula, "righe": [n]}
            label = bold_label(line)
            if label and not bullet:
                item["etichetta"] = label
            out.append(item)
        else:
            out[-1]["testo"] = join_text(cls, out[-1]["testo"], ws(text), line.page, "testo")
            out[-1]["raw"].append(line.text)
            out[-1]["righe"].append(n)
        out[-1]["closed"] = bool(re.search(r"[.:;!?]$", out[-1]["testo"]))
    # Consecutive bullets are one list, as in the 2024 data («• a • b»).
    merged = []
    for item in out:
        if item["bullet"] and merged and merged[-1]["bullet"]:
            merged[-1]["testo"] += " " + item["testo"]
            merged[-1]["raw"] += item["raw"]
            merged[-1]["righe"] += item["righe"]
        else:
            merged.append(item)
    return [{"tipo": "p", "testo": p["testo"], "pagina": p["pagina"], "fonte": proof("".join(p["raw"])), "_righe": p["righe"],
             **({"etichetta": p["etichetta"]} if p.get("etichetta") else {})} for p in merged]


def clean(blocks):
    for block in blocks:
        block.pop("_righe", None)
    return blocks


# ——— Tables ———

def table(cls, title_line, cell_lines):
    """Cells under bold headers; a second header (the table continues in the other column) starts a part."""
    for line in [title_line, *cell_lines]:
        if line:
            line.used = True
    spans = [dict(s, page=line.page) for line in cell_lines for s in line.spans if s["text"].strip()]
    parts, current = [], None
    for span in spans:
        bold = "Bold" in span["font"]
        if bold and (current is None or current["data"]):
            current = {"head": [], "data": []}
            parts.append(current)
        (current["head"] if bold else current["data"]).append(span)
    labels = None
    rows = []
    group = None
    for part in parts:
        head = part["head"]
        bottom = max(s["origin"][1] for s in head)
        columns = [{"x0": s["bbox"][0], "x1": s["bbox"][2], "text": [s["text"].strip()]} for s in sorted((s for s in head if abs(s["origin"][1] - bottom) < 2), key=lambda s: s["bbox"][0])]
        groups = []
        for span in sorted((s for s in head if abs(s["origin"][1] - bottom) >= 2), key=lambda s: (-s["origin"][1], s["bbox"][0])):
            over = [c for c in columns if span["bbox"][0] < c["x1"] - 1 and span["bbox"][2] > c["x0"] + 1]
            if len(over) == 1:
                over[0]["text"].insert(0, span["text"].strip())
                over[0]["x0"], over[0]["x1"] = min(over[0]["x0"], span["bbox"][0]), max(over[0]["x1"], span["bbox"][2])
            else:
                assert len(over) > 1, (cls, "intestazione senza colonna", span["text"])
                groups.insert(0, (span, over))
        names = [ws(" ".join(c["text"])) for c in columns]
        if groups:
            text = ws(" ".join(g[0]["text"] for g in groups))
            # The group label is narrower than its columns: it covers the slot columns «1°» … «9°».
            slots = [i for i, name in enumerate(names) if re.fullmatch(r"\d°", name)]
            assert slots == list(range(slots[0], slots[-1] + 1)) and all(columns.index(c) in slots for g in groups for c in g[1]), (cls, "gruppo", names)
            part_group = {"testo": text, "da": slots[0], "a": slots[-1]}
            assert group in (None, part_group), (cls, "gruppo diverso", group, part_group)
            group = part_group
        assert labels in (None, names), (cls, "colonne diverse", labels, names)
        labels = names

        def column_of(span):
            x0, x1 = span["bbox"][0], span["bbox"][2]
            for i, c in enumerate(columns):
                if abs(c["x0"] - x0) < 2.5:
                    return i
            center = (x0 + x1) / 2
            inside = [i for i, c in enumerate(columns) if c["x0"] - 4 <= center <= c["x1"] + 4]
            if len(inside) == 1:
                return inside[0]
            return min(range(len(columns)), key=lambda i: abs((columns[i]["x0"] + columns[i]["x1"]) / 2 - center))

        lines_by_y = []
        for span in sorted(part["data"], key=lambda s: (s["page"], s["origin"][1], s["bbox"][0])):
            if lines_by_y and lines_by_y[-1][0] == span["page"] and abs(lines_by_y[-1][1] - span["origin"][1]) < 2:
                lines_by_y[-1][2].append(span)
            else:
                lines_by_y.append([span["page"], span["origin"][1], [span]])
        for page, _, line_spans in lines_by_y:
            cells = {}
            for span in line_spans:
                i = column_of(span)
                cells[i] = (cells[i] + " " + span["text"].strip()) if i in cells else span["text"].strip()
            if 0 in cells:
                rows.append([cells.get(i, "") for i in range(len(columns))])
            else:
                assert rows, (cls, "riga senza inizio", cells)
                for i, text in cells.items():
                    rows[-1][i] = join_text(cls, rows[-1][i], text, page, "tabella") if rows[-1][i] else text
    rows = [[ws(cell) for cell in row] for row in rows]
    # The header repeated where the table continues (checked equal above) is counted once.
    raw = (title_line.text if title_line else "") + "".join(s["text"] for s in parts[0]["head"]) + "".join(s["text"] for part in parts for s in part["data"])
    out = {"tipo": "tabella", "titolo": ws(title_line.text) if title_line else "", "colonne": labels, "righe": rows,
           "pagina": (title_line or cell_lines[0]).page, "fonte": proof(raw)}
    if group:
        out["gruppo"] = group
    return out


# ——— Contents of a feature: paragraphs, sub-headings, tables ———

def content(cls, lines):
    """Paragraphs, sub-headings, tables and sidebars. A table or a sidebar printed in the middle of a
    paragraph (at a column or page break) goes after that paragraph; a sub-heading ends it."""
    out, text, objects = [], [], []

    def flush():
        paras = paragraphs(cls, text) if text else []
        placed = list(paras)
        for anchor, obj in reversed(objects):
            at = next((i + 1 for i, p in enumerate(paras) if anchor - 1 in p["_righe"]), 0)
            placed.insert(placed.index(paras[at - 1]) + 1 if at else 0, obj)
        out.extend(clean(placed))
        text.clear()
        objects.clear()

    i = 0
    while i < len(lines):
        line = lines[i]
        kind = line.kind
        if kind == "sub":
            flush()
            line.used = True
            out.append({"tipo": "h", "testo": ws(line.text), "pagina": line.page, "fonte": proof(line.text)})
        elif kind in ("tabletitle", "cell", "sidebartitle"):
            title = line if kind != "cell" else None
            j = i + 1 if title else i
            cells = []
            while j < len(lines) and lines[j].kind == "cell":
                cells.append(lines[j])
                j += 1
            if kind == "sidebartitle":
                title.used = True
                body = clean(paragraphs(cls, cells))
                obj = {"tipo": "riquadro", "titolo": ws(title.text), "paragrafi": [{k: v for k, v in p.items() if k in ("testo", "etichetta")} for p in body],
                       "pagina": title.page, "fonte": proof(title.text + "".join(c.text for c in cells))}
            else:
                obj = table(cls, title, cells)
            objects.append((len(text), obj))
            i = j
            continue
        else:
            assert kind == "text", (cls, kind, line.text)
            text.append(line)
        i += 1
    flush()
    return out


def merge_headings(lines):
    """«Incantesimi conosciuti di 1° livello e di livello» + «superiore»: one heading."""
    out = []
    for line in lines:
        if out and line.kind in ("sub", "feature") and out[-1].kind == line.kind and line.text.strip()[:1].islower():
            out[-1].text = out[-1].text.rstrip() + " " + line.text.strip()
            continue
        out.append(line)
    return out


def split(lines, kinds):
    """Lines → [(heading line or None, lines below it)] at the given heading kinds."""
    out = [(None, [])]
    for line in lines:
        if line.kind in kinds:
            out.append((line, []))
        else:
            out[-1][1].append(line)
    return out


def level_of(cls, texts):
    for block in texts:
        if block["tipo"] == "p":
            match = LEVEL.search(block["testo"])
            return int(match.group(1)) if match else None
    return None


def build_class(cls, lines):
    name_line = lines[0]
    for line in lines:
        if line.kind in ("class", "section", "feature"):
            line.used = True
    name = ws(name_line.text)
    pages = sorted({line.page for line in lines})
    sections = split(lines[1:], {"section"})
    assert sections[0] == (None, []) and ws(sections[1][0].text) == "Privilegi di classe", (cls, "sezioni")
    sub_name, grant = SUBCLASSES[cls]
    data = {"id": cls, "nome": name, "pagina": name_line.page, "pagine": pages}

    # «Privilegi di classe»: introduction, traits (Punti ferita, Competenze, Equipaggiamento), table, features.
    body = sections[1][1]
    features_raw = split(body, {"feature"})
    head = features_raw[0][1]
    intro_lines, traits_lines, table_lines = [], collections.OrderedDict(), []
    current = None
    for line in head:
        if line.kind == "sub" and ws(line.text).lower() in TRAIT_GROUPS:
            current = ws(line.text)
            traits_lines[current] = [line]
        elif line.kind in ("tabletitle", "cell"):
            table_lines.append(line)
        elif current:
            traits_lines[current].append(line)
        else:
            intro_lines.append(line)
    data["introPrivilegi"] = {"titolo": "Privilegi di classe", "contenuto": clean(paragraphs(cls, intro_lines))}
    voci, raw = [], ""
    for group, group_lines in traits_lines.items():
        raw += "".join(line.text for line in group_lines)
        for line in group_lines:
            line.used = True
        if group.lower() == "equipaggiamento":
            text = " ".join(p["testo"] for p in paragraphs(cls, group_lines[1:]))
            voci.append({"etichetta": "Equipaggiamento", "valore": text})
            continue
        # «Dadi Vita: 1d10 per ogni livello…»: a line starting with a bold label is a new trait.
        for line in group_lines[1:]:
            label = bold_label(line)
            if label:
                assert label.endswith(":"), (cls, "tratto", line.text)
                voci.append({"etichetta": label[:-1], "valore": ws(line.text)[len(label):].strip()})
            else:
                voci[-1]["valore"] = join_text(cls, voci[-1]["valore"], ws(line.text), line.page, "tratti")
    data["tratti"] = {"titolo": " · ".join(traits_lines.keys()), "voci": voci, "pagina": name_line.page, "fonte": proof(raw), "gruppi": list(traits_lines.keys())}
    main = table(cls, table_lines[0], table_lines[1:])
    assert main["titolo"] == name, (cls, main["titolo"])
    assert [int(re.match(r"\d+", row[0]).group()) for row in main["righe"]] == list(range(1, 21)), (cls, "livelli", [r[0] for r in main["righe"]])
    data["tabella"] = main

    column = next(i for i, name in enumerate(main["colonne"]) if name.startswith("Privilegi"))
    names_by_level = [(int(re.match(r"\d+", row[0]).group()), ws(re.sub(r"\([^)]*\)", "", row[column])).lower()) for row in main["righe"]]
    feature_list, sub_heading = [], None
    for heading, feature_lines in features_raw[1:]:
        title = ws(heading.text)
        if title == sub_name:
            sub_heading = (heading, feature_lines)
            continue
        level = next((lvl for lvl, names in names_by_level if title.lower() in names), None)
        assert level, (cls, "privilegio non in tabella", title)
        feature_list.append({"livello": level, "titolo": title, "pagina": heading.page, "fonte": proof(heading.text), "contenuto": content(cls, merge_headings(feature_lines))})
    data["privilegi"] = feature_list
    grants = [f for f in feature_list if f["titolo"] == grant]
    assert len(grants) == 1, (cls, "privilegio della sottoclasse", grant)
    data["livelloSottoclasse"] = grants[0]["livello"]

    # Other sections: the group of subclasses («Archetipi Marziali») or the options («Suppliche Occulte»).
    data["opzioni"] = []
    group_intro = []
    for heading, section_lines in sections[2:]:
        title = ws(heading.text)
        parts = split(merge_headings(section_lines), {"feature"})
        if title == "Suppliche Occulte":
            subs = split(parts[0][1], {"sub"})
            for h, _ in subs[1:]:
                h.used = True
            data["opzioni"].append({"titolo": title, "fonte": proof(heading.text), "intro": content(cls, subs[0][1]), "voci": [
                {"titolo": ws(h.text), "pagina": h.page, "fonte": proof(h.text), "contenuto": content(cls, ls)} for h, ls in subs[1:]]})
            assert len(parts) == 1, (cls, "suppliche")
            continue
        group_intro = [{"tipo": "h", "testo": title, "pagina": heading.page, "fonte": proof(heading.text)}] + content(cls, parts[0][1])
        for feature_heading, feature_lines in parts[1:]:
            assert ws(feature_heading.text) == sub_name, (cls, "sezione sconosciuta", feature_heading.text)
            sub_heading = (feature_heading, feature_lines)
    assert sub_heading, (cls, "sottoclasse")

    heading, sub_lines = sub_heading
    sub_parts = split(merge_headings(sub_lines), {"sub"})
    descrizione = group_intro + content(cls, sub_parts[0][1])
    sub_features = []
    for h, ls in sub_parts[1:]:
        h.used = True
        blocks = content(cls, ls)
        level = level_of(cls, blocks)
        title = ws(h.text)
        heading_block = {"tipo": "h", "testo": title, "pagina": h.page, "fonte": proof(h.text)}
        if level is None:
            # Printed without a level («Dettami di devozione»): part of the description, or of the feature above.
            (sub_features[-1]["contenuto"] if sub_features else descrizione).extend([heading_block] + blocks)
            continue
        sub_features.append({"livello": level, "titolo": title, "pagina": h.page, "fonte": proof(h.text), "contenuto": blocks})
    data["sottoclasse"] = {"nome": sub_name, "titolo": sub_name, "pagina": heading.page, "fonte": proof(heading.text), "descrizione": descrizione, "privilegi": sub_features}
    data["livelliSottoclasse"] = sorted({f["livello"] for f in sub_features})
    return data


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    data = Path(sys.argv[1]).read_bytes()
    assert hashlib.sha256(data).hexdigest() == SHA, "PDF diverso da SRD 5.1 IT"
    doc = pymupdf.open(stream=data)
    lines = merge_headings(read_lines(doc))
    starts = [i for i, line in enumerate(lines) if line.kind == "class"]
    assert len(starts) == 12, [lines[i].text for i in starts]
    classes = []
    for n, start in enumerate(starts):
        chunk = lines[start:starts[n + 1] if n + 1 < len(starts) else len(lines)]
        cls = CLASSES[n]
        assert ws(chunk[0].text).lower() == cls, (cls, chunk[0].text)
        classes.append(build_class(cls, chunk))
    # Nothing printed is left out: every line of pp. 8-59 (footers aside) is in the data.
    unused = [(line.page, line.text) for line in lines if not line.used]
    assert not unused, unused[:5]
    OUT.write_text(json.dumps({
        "fonte": "SRD 5.1 IT", "sourceUrl": SOURCE_URL, "sourceSha256": SHA,
        "nota": "Generato da scripts/transcribe-srd51-classes.py dal PDF SRD 5.1 IT (pp. 8-59): non modificare a mano.",
        "classi": classes,
    }, ensure_ascii=False, indent=1) + "\n")
    REPAIRS.write_text(json.dumps({
        "_nota": "Riparazioni di sola visualizzazione delle Classi 2014 (lib/data/srd-classes-5.1-it.json), trovate da scripts/transcribe-srd51-classes.py. Il PDF non cambia.",
        **repairs,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(classes)} classi, {len(repairs['sillabazioni'])} sillabazioni ricomposte")


if __name__ == "__main__":
    main()
