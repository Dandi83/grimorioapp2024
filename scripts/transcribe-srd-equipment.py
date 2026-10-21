"""Transcribe weapons (and armor) of the Italian SRD 5.1 (pp. 68-74) and SRD 5.2.1 (pp. 101-105).

The PDFs stay in a temporary folder and are never committed. Table cells are kept as printed:
only spaces are normalized and cells broken over two lines are joined. Every row keeps its
printed text and a SHA-256 fingerprint; 2014 rule texts are copied word for word with their own
fingerprint. The 2024 rule texts are not copied: the app reads them from the 2024 manual data.

Usage: python scripts/transcribe-srd-equipment.py SRD_CC_v5.1_IT.pdf IT_SRD_CC_v5.2.1.pdf weapons|armor|gear2014|tools2014 out.json

gear2014: adventuring gear of the SRD 5.1 (pp. 74-78), read column by column in reading order:
descriptions (pp. 74-76), table "Equipaggiamento d'avventura" (pp. 76-77), "Capienza dei contenitori"
(pp. 77-78) and "Dotazioni" (p. 78).
tools2014: tools of the SRD 5.1 (pp. 78-79): table "Strumenti" without the row "Veicoli", which
refers to "Cavalcature e veicoli", the introduction and the descriptions.
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

SHA_51 = '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7'
SHA_521 = 'a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718'
URL_51 = 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf'
URL_521 = 'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf'
WEAPON_GROUPS = ['Armi da mischia semplici', 'Armi a distanza semplici', 'Armi da mischia da guerra', 'Armi a distanza da guerra']


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def slug(text):
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def clean(text):
    return re.sub(r'\s+', ' ', text.replace('­', '')).strip()


def spans(page, fonts):
    """Spans of a page in the given fonts: (y, x, text, font)."""
    out = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                if span['text'].strip() and any(span['font'].startswith(f) for f in fonts):
                    out.append((round(span['bbox'][1]), round(span['bbox'][0]), span['text'], span['font']))
    return sorted(out)


def table(pdf, pages, fonts, header, columns, x_of, stop=None):
    """Rows of a printed table: a row starts at its name cell; lines without a name continue the row above."""
    rows, group = [], None
    for number in pages:
        cells = spans(pdf[number - 1], fonts)
        top = min((y for y, x, t, f in cells if t.strip() == header), default=None)
        if top is None:
            continue
        for y, x, text, font in cells:
            if y <= top or y >= 735 or (stop and y >= stop.get(number, 10**6)):
                continue
            if 'Italic' in font:
                group = clean(text)
                continue
            if 'Bold' in font or 'SemiBold' in font:
                continue
            column = x_of(x)
            if column is None:
                continue
            if column == columns[0]:
                if rows and rows[-1]['page'] == number and abs(rows[-1]['y'] - y) <= 2:
                    rows[-1]['cells'][column] += ' ' + text
                    continue
                rows.append({'page': number, 'y': y, 'group': group, 'cells': {column: text}})
            elif rows:
                row = rows[-1]
                if column in row['cells'] and y != row['y']:
                    row['cells'][column] += ' ' + text
                else:
                    row['cells'][column] = row['cells'].get(column, '') + text
    # A name broken over two lines ("Armatura di cuoio" / "borchiato"): the second line has no other cell.
    merged = []
    for row in rows:
        if merged and list(row['cells']) == [columns[0]] and row['page'] == merged[-1]['page'] and 0 < row['y'] - merged[-1]['y'] < 16:
            merged[-1]['cells'][columns[0]] += ' ' + row['cells'][columns[0]]
        else:
            merged.append(row)
    for row in merged:
        row['cells'] = {k: clean(v) for k, v in row['cells'].items()}
    return merged


def paragraphs(pdf, page, column, start, stop):
    """Body paragraphs of one column between two y positions; a paragraph starts with a leading space
    or with a bold italic label ("Imbottita.")."""
    lines = []
    middle = pdf[page - 1].rect.width / 2
    for block in pdf[page - 1].get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(s['text'] for s in line['spans'])
            x, y = line['bbox'][0], line['bbox'][1]
            if text.strip() and (x >= middle) == (column == 1) and start <= y < stop and line['spans'][0]['font'].startswith('Cambria'):
                lines.append((round(y), text, line['spans'][0]['font'].endswith('BoldItalic')))
    out = []
    for _, text, label in sorted(lines):
        if text.startswith(' ') or label or not out:
            # the first line of a column may continue the column before: kept apart, joined by the caller
            out.append(text)
        else:
            out[-1] += ' ' + text
    return [clean(p) for p in out]


def labelled(paragraph_list, page, max_words=4):
    """{"Accurata": "...", ...}: a paragraph whose first sentence is a short label; others continue the previous one.
    page: one page for all, or a list with the page of each paragraph."""
    out = {}
    last = None
    for index, text in enumerate(paragraph_list):
        where = page[index] if isinstance(page, list) else page
        match = re.match(r'^([A-ZÀ-Ý][^.]{0,40})\. (.*)$', text)
        if match and len(match.group(1).split()) <= max_words:
            last = match.group(1)
            out[last] = {'testo': match.group(2), 'page': where}
        elif last:
            out[last]['testo'] += '\n\n' + text
            if where != out[last]['page']:
                out[last]['pages'] = sorted({out[last]['page'], where, *out[last].get('pages', [])})
    for value in out.values():
        value['sourceSha256'] = sha(value['testo'])
    return out


def weapon_record(row, edition):
    c = row['cells']
    dice, _, kind = c['danni'].partition(' ')
    record = {
        'nome': c['nome'], 'costo': c['costo'], 'danni': dice if dice != '—' else '', 'tipoDanno': kind,
        'peso': c['peso'], 'proprieta': c['proprieta'], 'page': row['page'],
    }
    if edition == '2024':
        record['padronanza'] = c['padronanza']
    record['sourceText'] = ' | '.join(c[k] for k in (['nome', 'danni', 'proprieta', 'padronanza', 'peso', 'costo'] if edition == '2024' else ['nome', 'costo', 'danni', 'peso', 'proprieta']))
    record['sourceSha256'] = sha(record['sourceText'])
    return record


def weapons(pdf51, pdf521):
    def x51(x):
        return 'nome' if x < 150 else 'costo' if x < 210 else 'danni' if x < 285 else 'peso' if x < 320 else 'proprieta'

    def x521(x):
        return 'nome' if x < 135 else 'danni' if x < 205 else 'proprieta' if x < 405 else 'padronanza' if x < 470 else 'peso' if x < 515 else 'costo'
    # SRD 5.1: the table sits in two columns on p. 73 (name to weight left, properties right): join by row height.
    left = table(pdf51, [73], ['Calibri'], 'Nome', ['nome'], lambda x: x51(x) if x < 320 else None)
    right = {y: clean(t) for y, x, t, f in spans(pdf51[72], ['Calibri']) if x >= 320 and f == 'Calibri'}
    rows51 = []
    for row in left:
        row['cells']['proprieta'] = right.get(row['y'], '')
        rows51.append(row)
    rows521 = table(pdf521, [103, 104], ['GillSans'], 'Nome', ['nome'], x521, stop={104: 420})
    # The 5.2.1 PDF prints Stocco and Tridente twice on p. 104: identical rows are kept once.
    seen, unique521, duplicates = set(), [], []
    for row in rows521:
        key = json.dumps(row['cells'], sort_keys=True)
        if key in seen:
            duplicates.append(row['cells']['nome'])
            continue
        seen.add(key)
        unique521.append(row)
    items = {}
    for edition, rows in (('2014', rows51), ('2024', unique521)):
        for row in rows:
            name = row['cells']['nome']
            item = items.setdefault(slug(name), {'id': slug(name), 'gruppo': WEAPON_GROUPS.index(row['group']), '2014': None, '2024': None})
            assert item['gruppo'] == WEAPON_GROUPS.index(row['group']), name
            item[edition] = weapon_record(row, edition)
    # 2014 rule texts, word for word: properties (pp. 71-72) and special weapons (p. 72).
    # The Munizioni text continues at the top of p. 72: a first line without indent joins the paragraph before.
    first, second = paragraphs(pdf51, 71, 1, 180, 700), paragraphs(pdf51, 72, 0, 45, 430)
    first[-1] += ' ' + second.pop(0)
    properties = labelled(first + second, [71] * len(first) + [72] * len(second))
    properties['Munizioni']['pages'] = [71, 72]
    special = labelled(paragraphs(pdf51, 72, 1, 360, 600), 72)
    return {
        '_nota': "Armi dell'SRD 5.1 (2014) e dell'SRD 5.2.1 (2024) in italiano, trascritte da scripts/transcribe-srd-equipment.py. Stesso id per la stessa arma; ogni riga conserva il testo stampato e la sua impronta. I testi delle proprietà 2014 sono copiati parola per parola; quelli 2024 (proprietà e padronanze) si leggono dal manuale 2024 (srd-manual-5.2.1-it.json, voce equipaggiamento-armi).",
        'fonti': {
            '2014': {'document': 'SRD 5.1', 'sourceUrl': URL_51, 'sourceSha256': SHA_51, 'pages': [71, 72, 73]},
            '2024': {'document': 'SRD 5.2.1', 'sourceUrl': URL_521, 'sourceSha256': SHA_521, 'pages': [101, 102, 103, 104], 'manuale': 'equipaggiamento-armi'},
        },
        'gruppi': WEAPON_GROUPS,
        'righeDoppieNelPdf2024': duplicates,
        'armi': sorted(items.values(), key=lambda item: (item['gruppo'], (item['2014'] or item['2024'])['nome'])),
        'regole2014': {'proprieta': properties, 'armiSpeciali': special},
    }


def main():
    pdf51, pdf521, what, out = sys.argv[1:5]
    for path, expected in ((pdf51, SHA_51), (pdf521, SHA_521)):
        if sha_file(path) != expected:
            raise SystemExit(f'unexpected PDF: {path}')
    builders = {'weapons': weapons, 'armor': armor, 'gear2014': gear2014, 'tools2014': tools2014}
    data = builders[what](pymupdf.open(pdf51), pymupdf.open(pdf521))
    Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def column_lines(pdf, page, column, start, stop, fonts):
    """Lines of one column in reading order: (y, x, text, first span font, spans)."""
    middle = pdf[page - 1].rect.width / 2
    out = []
    for block in pdf[page - 1].get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = [span for span in line['spans'] if span['text'].strip()]
            if not spans or not any(spans[0]['font'].startswith(f) for f in fonts):
                continue
            x, y = line['bbox'][0], line['bbox'][1]
            if (x >= middle) == (column == 1) and start <= y < stop:
                out.append((round(y, 1), round(x), ''.join(span['text'] for span in line['spans']), spans[0]['font'], spans))
    return sorted(out, key=lambda line: (line[0], line[1]))


def gear_table(pdf, parts):
    """Rows of the 2014 table: name, cost, weight; italic lines open a group ("Focus arcano"),
    indented names belong to it; a name broken over two lines is joined."""
    rows, group = [], None
    for page, column, start, stop in parts:
        cells = {}
        for y, x, text, font, spans in column_lines(pdf, page, column, start, stop, ['Calibri']):
            for span in spans:
                sx = round(span['bbox'][0]) - (58 if column == 0 else 329)
                kind = 'nome' if sx < 120 else 'costo' if sx < 155 else 'peso'
                cells.setdefault(round(span['bbox'][1]), []).append((kind, span['text'], span['font']))
        for y in sorted(cells):
            row = {}
            italic = all('Italic' in font for _, _, font in cells[y])
            bold = all('Bold' in font for _, _, font in cells[y])
            for kind, text, font in cells[y]:
                row[kind] = row.get(kind, '') + text
            if bold:
                continue
            if italic:
                group = clean(row['nome'])
                continue
            name = row.get('nome', '')
            if 'costo' not in row:
                rows[-1]['nome'] += ' ' + clean(name)
                rows[-1]['righe'] += 1
                continue
            if not name.startswith(' '):
                group = None
            rows.append({'nome': clean(name), 'costo': clean(row['costo']), 'peso': clean(row.get('peso', '')), 'gruppo': group, 'page': page, 'righe': 1})
    for row in rows:
        row['nome'] = re.sub(r'\(\s+', '(', row['nome']).replace(' )', ')')
        row['sourceText'] = ' | '.join(filter(None, [row['gruppo'], row['nome'], row['costo'], row['peso']]))
        row['sourceSha256'] = sha(row['sourceText'])
        del row['righe']
    return rows


def sidebar_entries(pdf, page, column, start, stop):
    """Calibri sidebar paragraphs that open with a bold italic label: {"Dotazione da …": text}."""
    out, current = [], None
    for y, x, text, font, spans in column_lines(pdf, page, column, start, stop, ['Calibri']):
        if 'BoldItalic' in spans[0]['font']:
            label = clean(spans[0]['text'])
            rest = clean(''.join(span['text'] for span in spans[1:]))
            current = {'titolo': label, 'testo': rest}
            out.append(current)
        elif current:
            current['testo'] = clean(current['testo'] + ' ' + text)
    return out


def gear2014(pdf51, pdf521):
    # Descriptions: six columns from p. 74 to p. 76; a column that opens without a label continues
    # the last paragraph of the column before.
    columns = [(74, 0, 75, 740), (74, 1, 40, 740), (75, 0, 40, 740), (75, 1, 40, 740), (76, 0, 40, 740), (76, 1, 40, 515)]
    texts, pages = [], []
    for page, column, start, stop in columns:
        found = paragraphs(pdf51, page, column, start, stop)
        if texts and found and not re.match(r'^[A-ZÀ-Ý][^.]{0,40}\. ', found[0]):
            texts[-1] += ' ' + found.pop(0)
            pages[-1] = sorted({*([pages[-1]] if isinstance(pages[-1], int) else pages[-1]), page})
        texts += found
        pages += [page] * len(found)
    intro = texts.pop(0)
    pages.pop(0)
    # Labels up to six words: "Custodia per quadrelli da balestra".
    descriptions = labelled(texts, [p if isinstance(p, int) else p[0] for p in pages], max_words=6)
    rows = gear_table(pdf51, [(76, 1, 535, 740), (77, 0, 60, 740), (77, 1, 60, 575)])
    # "Capienza dei contenitori": a line without a container continues the capacity above,
    # a line without a capacity continues the container ("o boccale").
    capacity, note = [], ''
    for page, column, start, stop in [(77, 1, 600, 740), (78, 0, 60, 240)]:
        cells = {}
        for y, x, text, font, spans in column_lines(pdf51, page, column, start, stop, ['Calibri']):
            for span in spans:
                if 'Bold' in span['font']:
                    continue
                kind = 'contenitore' if span['bbox'][0] - (58 if column == 0 else 329) < 60 else 'capienza'
                cells.setdefault(round(span['bbox'][1]), []).append((kind, span['text']))
        for y in sorted(cells):
            row = {}
            for kind, text in cells[y]:
                row[kind] = row.get(kind, '') + text
            name, value = clean(row.get('contenitore', '')), clean(row.get('capienza', ''))
            if name.startswith('*') or note:
                note = clean(note + ' ' + name + ' ' + value)
            elif name and value:
                capacity.append({'contenitore': name, 'capienza': value, 'page': page})
            elif name:
                capacity[-1]['contenitore'] += ' ' + name
            elif value:
                capacity[-1]['capienza'] += ' ' + value
    packs = sidebar_entries(pdf51, 78, 0, 345, 700)
    intro_packs = clean(' '.join(text for y, x, text, font, spans in column_lines(pdf51, 78, 0, 270, 345, ['Calibri'])))
    for entry in packs:
        match = re.fullmatch(r'(.*) \((.*)\)\.?', entry['titolo'])
        entry['nome'], entry['prezzo'] = match.group(1), match.group(2)
        entry['page'] = 78
        entry['sourceSha256'] = sha(entry['testo'])
        del entry['titolo']
    return {
        '_nota': "Equipaggiamento d'avventura dell'SRD 5.1 (2014) in italiano, trascritto da scripts/transcribe-srd-equipment.py (gear2014). Righe della tabella, descrizioni, capienza dei contenitori e dotazioni come stampate, con impronta sha256.",
        'fonte': {'document': 'SRD 5.1', 'sourceUrl': URL_51, 'sourceSha256': SHA_51, 'pages': [74, 75, 76, 77, 78]},
        'intro': {'testo': intro, 'page': 74, 'sourceSha256': sha(intro)},
        'tabella': rows,
        'descrizioni': descriptions,
        'capienza': {'righe': capacity, 'nota': note, 'sourceSha256': sha(json.dumps(capacity, ensure_ascii=False) + note)},
        'dotazioni': {'intro': intro_packs, 'voci': packs},
    }


def tools2014(pdf51, pdf521):
    # Table: p. 78 right column, p. 79 left column up to the row "Veicoli (terrestri o acquatici)"
    # (y 148), which has no price ("*": see "Cavalcature e veicoli") and is left out.
    rows = gear_table(pdf51, [(78, 1, 325, 740), (79, 0, 60, 148)])
    intro = ' '.join(paragraphs(pdf51, 78, 1, 60, 300))
    found = paragraphs(pdf51, 79, 0, 155, 740) + paragraphs(pdf51, 79, 1, 40, 740)
    descriptions = labelled(found, 79, max_words=6)
    return {
        '_nota': "Strumenti dell'SRD 5.1 (2014) in italiano, trascritti da scripts/transcribe-srd-equipment.py (tools2014). Righe della tabella e descrizioni come stampate, con impronta sha256. La riga «Veicoli (terrestri o acquatici)» rimanda a «Cavalcature e veicoli» e non è inclusa.",
        'fonte': {'document': 'SRD 5.1', 'sourceUrl': URL_51, 'sourceSha256': SHA_51, 'pages': [78, 79]},
        'intro': {'testo': intro, 'page': 78, 'sourceSha256': sha(intro)},
        'tabella': rows,
        'descrizioni': descriptions,
    }


def sha_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


ARMOR_GROUPS = ['Armature leggere', 'Armature medie', 'Armature pesanti', 'Scudo']


def armor_record(row, edition):
    c = row['cells']
    record = {'nome': c['nome'], 'costo': c['costo'], 'ca': c['ca'], 'forza': c['forza'], 'furtivita': c['furtivita'], 'peso': c['peso'], 'page': row['page']}
    record['sourceText'] = ' | '.join(c[k] for k in (['nome', 'costo', 'ca', 'forza', 'furtivita', 'peso'] if edition == '2014' else ['nome', 'ca', 'forza', 'furtivita', 'peso', 'costo']))
    record['sourceSha256'] = sha(record['sourceText'])
    return record


def donning_2024(header):
    """"Armatura media (5 minuti per indossare e 1 minuto per togliere)" -> times as printed."""
    inside = re.search(r'\((.*)\)', header).group(1)
    both = re.fullmatch(r'(.+) per indossare o togliere', inside)
    if both:
        return {'indossare': both.group(1), 'togliere': both.group(1), 'testo': inside}
    each = re.fullmatch(r'(.+) per indossare e (.+) per togliere', inside)
    return {'indossare': each.group(1), 'togliere': each.group(2), 'testo': inside}


def armor(pdf51, pdf521):
    def x51(x):
        return 'nome' if x < 145 else 'costo' if x < 200 else 'ca' if x < 330 else 'forza' if x < 362 else 'furtivita' if x < 410 else 'peso'

    def x521(x):
        return 'nome' if x < 185 else 'ca' if x < 360 else 'forza' if x < 400 else 'furtivita' if x < 455 else 'peso' if x < 490 else 'costo'
    rows51 = table(pdf51, [70], ['Calibri'], 'Armatura', ['nome'], x51)
    rows521 = table(pdf521, [104], ['GillSans'], 'Armature', ['nome'], x521, stop={104: 735})
    rows521 = [row for row in rows521 if row['y'] > 445]
    assert len(rows51) == len(rows521) == 13, (len(rows51), len(rows521))
    groups51 = {'Armature leggere': 0, 'Armature medie': 1, 'Armature pesanti': 2, 'Scudi': 3}
    headers521 = []
    items = []
    for row51, row521 in zip(rows51, rows521):
        group = groups51[row51['group']]
        assert row521['group'].startswith(['Armatura leggera', 'Armatura media', 'Armatura pesante', 'Scudo'][group]), row521['group']
        if row521['group'] not in headers521:
            headers521.append(row521['group'])
        items.append({'id': slug(row51['cells']['nome']), 'categoria': group, '2014': armor_record(row51, '2014'), '2024': armor_record(row521, '2024')})
    # SRD 5.1 p. 71: table "Indossare e togliere armature".
    times51 = {}
    for y, x, text, font in spans(pdf51[70], ['Calibri']):
        if 240 < y < 290 and font == 'Calibri':
            times51.setdefault(y, []).append(clean(text))
    times51 = [{'indossare': cells[1], 'togliere': cells[2]} for _, cells in sorted(times51.items())]
    assert len(times51) == 4
    # 2014 rule texts, word for word (pp. 69-71). Category introductions follow their heading without a label.
    def is_label(text):
        return bool(re.match(r'^[A-ZÀ-Ý][^.]{0,40}\. ', text))

    def intro(paragraph_list):
        out = []
        for text in paragraph_list:
            if is_label(text):
                break
            out.append(text)
        return out
    general = labelled(paragraphs(pdf51, 69, 0, 265, 740), 69)
    light, medium = paragraphs(pdf51, 69, 1, 72, 287), paragraphs(pdf51, 69, 1, 288, 740)
    heavy_intro, heavy = paragraphs(pdf51, 70, 0, 136, 365), paragraphs(pdf51, 70, 1, 40, 365)
    mezza = paragraphs(pdf51, 70, 0, 40, 135)
    parts = [(light, 69), (medium, 69), (mezza, 70), (heavy, 70)]
    descriptions = labelled([t for list_, _ in parts for t in list_[len(intro(list_)):]], [page for list_, page in parts for _ in list_[len(intro(list_)):]])
    categories = {}
    for name, text, page in (('Armature leggere', intro(light), 69), ('Armature medie', intro(medium), 69), ('Armature pesanti', heavy_intro, 70)):
        joined = '\n\n'.join(text)
        categories[name] = {'testo': joined, 'page': page, 'sourceSha256': sha(joined)}
    donning = labelled(paragraphs(pdf51, 71, 0, 100, 210), 71)
    return {
        '_nota': "Armature dell'SRD 5.1 (2014) e dell'SRD 5.2.1 (2024) in italiano, trascritte da scripts/transcribe-srd-equipment.py. Stesso id per la stessa armatura (nome 2014); ogni riga conserva il testo stampato e la sua impronta. I testi 2014 sono copiati parola per parola; le regole 2024 si leggono dal manuale 2024 (srd-manual-5.2.1-it.json, voce equipaggiamento-armature).",
        'fonti': {
            '2014': {'document': 'SRD 5.1', 'sourceUrl': URL_51, 'sourceSha256': SHA_51, 'pages': [69, 70, 71]},
            '2024': {'document': 'SRD 5.2.1', 'sourceUrl': URL_521, 'sourceSha256': SHA_521, 'pages': [104, 105], 'manuale': 'equipaggiamento-armature'},
        },
        'categorie': ARMOR_GROUPS,
        'tempi': {'2014': times51, '2024': [dict(donning_2024(h), page=104) for h in headers521]},
        'armature': items,
        'regole2014': {'generali': general, 'categorie': categories, 'descrizioni': descriptions, 'indossareTogliere': donning},
    }


if __name__ == '__main__':
    main()
