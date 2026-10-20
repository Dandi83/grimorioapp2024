"""Transcribe the 2014 spells of the Italian SRD 5.1 (pp. 129-222) and the class lists (pp. 120-128).

The PDF stays in a temporary folder and is never committed. Text is kept as printed:
only spaces and line breaks are normalized. Fonts drive the structure:
Calibri 12 title, Cambria-Italic level line, Cambria-Bold field labels, Cambria body text,
Cambria-BoldItalic "Ai livelli superiori.", Calibri 9 tables (kept as <pre>), SymbolMT bullets.

Usage: python scripts/transcribe-srd51-spells.py SRD_CC_v5.1_IT.pdf out.json [overrides.json]
overrides.json: {"Spell name": {"livello": "..."}} for lines whose text layer is damaged
(read from the page image; reported in the release notes).
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

PDF_SHA256 = '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7'
SPELL_PAGES = (129, 222)
CLASS_PAGES = (120, 128)
CLASSES = ['bardo', 'chierico', 'druido', 'mago', 'paladino', 'ranger', 'stregone', 'warlock']
LEVEL_LINE = re.compile(r'^(Trucchetto di \S+|\S+ di \d+° livello)')
FIELDS = {'Tempo di lancio:': 'tempo_di_lancio', 'Gittata:': 'gittata', 'Componenti:': 'componenti', 'Componente:': 'componenti', 'Durata:': 'durata'}


def slug(text):
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def read_lines(pdf, first, last):
    lines = []
    for number in range(first, last + 1):
        page = pdf[number - 1]
        middle = page.rect.width / 2
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                spans = [(s['text'], s['font'], round(s['size'])) for s in line['spans']]
                text = ''.join(s[0] for s in spans)
                x, y = line['bbox'][0], line['bbox'][1]
                if not text.strip() or y < 45 or y > 745:
                    continue
                first_span = next(s for s in spans if s[0].strip())
                lines.append({'page': number, 'col': 0 if x < middle else 1, 'x': x, 'y': y, 'text': text,
                              'spans': spans, 'font': first_span[1], 'size': first_span[2]})
    lines.sort(key=lambda l: (l['page'], l['col'], round(l['y']), l['x']))
    return lines


def class_lists(pdf):
    """Spell names under "Incantesimi da <classe>" on pp. 120-128."""
    result, current = {}, None
    for line in read_lines(pdf, *CLASS_PAGES):
        text = line['text'].strip()
        heading = re.match(r'^Incantesimi da (\w+)$', text)
        if heading and heading.group(1) in CLASSES:
            current = heading.group(1)
            continue
        if current and line['font'].startswith('Cambria') and not re.match(r'^(\d+° livello|Trucchetti)', text):
            result.setdefault(slug(text), set()).add(current)
    return result


def inline_html(spans):
    out = ''
    for text, font, _ in spans:
        if font.startswith('SymbolMT'):
            out += text
            continue
        if 'BoldItalic' in font or ('Bold' in font and 'Italic' in font):
            out += f'<strong>{text}</strong>' if text.strip() else text
        elif 'Bold' in font:
            out += f'<strong>{text}</strong>' if text.strip() else text
        elif 'Italic' in font:
            out += f'<em>{text}</em>' if text.strip() else text
        else:
            out += text
    out = re.sub(r'</(strong|em)>(\s*)<\1>', r'\2', out)
    return re.sub(r'(\s+)</(strong|em)>', r'</\2>\1', out)


def table_text(items):
    """A printed table as preformatted text: one line per printed row, cells placed by their position."""
    left = min(x for x, _, _ in items)
    rows = []
    for x, y, text in sorted(items, key=lambda item: (round(item[1]), item[0])):
        if rows and abs(rows[-1][0] - y) < 2.5:
            rows[-1][1].append((x, text))
        else:
            rows.append((y, [(x, text)]))
    lines = []
    for _, cells in rows:
        line = ''
        for x, text in sorted(cells):
            column = round((x - left) / 4.6)
            line += ' ' * max(column - len(line), 2 if line else 0) + text
        lines.append(line.rstrip())
    return '<pre>' + '\n'.join(lines) + '</pre>'


def build(entry):
    fields, paragraphs, table = {}, [], []
    field = None

    def flush_table():
        if table:
            paragraphs.append(table_text(table))
            table.clear()

    for line in entry['body']:
        text = line['text']
        stripped = text.strip()
        label = next((k for k in FIELDS if stripped.startswith(k)), None) if not paragraphs and not table else None
        if label:
            field = FIELDS[label]
            fields[field] = stripped[len(label):].strip()
            continue
        if field and not paragraphs and line['font'] == 'Cambria' and (field != 'durata' or fields['durata'].endswith(',')):
            # A long value wraps on the next line (material components, reaction triggers).
            fields[field] += ' ' + stripped
            continue
        field = None
        if line['font'].startswith('Calibri') and line['size'] <= 9:
            x = line['x']
            for span in line['spans']:
                if span[0].strip():
                    table.append((x, line['y'], span[0].strip()))
                x += len(span[0]) * 4.6
            continue
        flush_table()
        html = inline_html(line['spans']).strip()
        starts = (not paragraphs or text.startswith(' ') or line['font'].startswith('SymbolMT') or stripped.startswith('•')
                  or (line['font'] == 'Calibri' and line['size'] == 12))
        if starts:
            paragraphs.append(html)
        else:
            paragraphs[-1] += ' ' + html
    flush_table()
    clean = [re.sub(r'\s+', ' ', p).strip() if not p.startswith('<pre>') else p for p in paragraphs]
    return {k: re.sub(r'\s+', ' ', v).strip() for k, v in fields.items()}, '<br><br>'.join(p for p in clean if p)


def main():
    pdf_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    overrides = json.loads(Path(sys.argv[3]).read_text()) if len(sys.argv) > 3 else {}
    if hashlib.sha256(pdf_path.read_bytes()).hexdigest() != PDF_SHA256:
        raise SystemExit('unexpected PDF')
    pdf = pymupdf.open(pdf_path)
    lines = read_lines(pdf, *SPELL_PAGES)
    # A spell starts at a Calibri 12 title with its italic level line right beside it (the PDF stores them out of order).
    titles = [i for i, l in enumerate(lines) if l['font'] == 'Calibri' and l['size'] == 12]
    starts = []
    for i in titles:
        fixed = lines[i]['text'].strip() in overrides
        near = [j for j, l in enumerate(lines) if l['page'] == lines[i]['page'] and l['col'] == lines[i]['col']
                and abs(l['y'] - lines[i]['y']) < 25 and l['font'] == 'Cambria-Italic'
                and (fixed or LEVEL_LINE.match(l['text'].strip()))]
        if near:
            starts.append((i, near[0]))
    classes = class_lists(pdf)
    records = []
    begins = [min(i, lvl) for i, lvl in starts]
    for n, (i, level_index) in enumerate(starts):
        end = begins[n + 1] if n + 1 < len(starts) else len(lines)
        name = lines[i]['text'].strip()
        skip = {i, level_index}
        body = [lines[j] for j in range(begins[n], end) if j not in skip]
        level = overrides.get(name, {}).get('livello') or re.sub(r'\s+', ' ', lines[level_index]['text']).strip()
        fields, descrizione = build({'body': body})
        ritual = '(rituale)' in level
        level_text = level.replace(' (rituale)', '')
        spell_classes = [c for c in CLASSES if c in classes.get(slug(name), set())]
        pages = sorted({l['page'] for l in body} | {lines[i]['page']})
        source = re.sub(r'\s+', ' ', ' '.join([name, lines[level_index]['text']] + [l['text'] for l in body])).strip()
        spell = {
            'id': f'{slug(name)}-2014', 'nome_italiano': name,
            'livello': f"{level_text} ({', '.join(spell_classes)})" if spell_classes else level_text,
            'tempo_di_lancio': fields.get('tempo_di_lancio', '') + (' o rituale' if ritual else ''),
            'gittata': fields.get('gittata', ''), 'componenti': fields.get('componenti', ''),
            'durata': fields.get('durata', ''), 'descrizione': descrizione,
        }
        printed = re.sub(r'\s+', ' ', lines[level_index]['text']).strip()
        record = {'page': pages[0], 'sourceName': name, 'sourceLevel': printed, 'sourceText': source,
                  'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'spell': spell}
        if len(pages) > 1:
            record['pages'] = pages
        records.append(record)
    out_path.write_text(json.dumps({'sourceSha256': PDF_SHA256, 'records': records}, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(records)} spells; class lists: {len(classes)} names')
    missing = [r['sourceName'] for r in records if '(' not in r['spell']['livello']]
    if missing:
        print('WITHOUT CLASSES', missing)


if __name__ == '__main__':
    main()
