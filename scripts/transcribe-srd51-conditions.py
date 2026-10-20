"""Transcribe the 2014 conditions (SRD 5.1 italiano, Appendice A del Manuale del Giocatore, pp. 406-407).

The Italian PDF prints 11 conditions: Prono, Spaventato, Stordito and Trattenuto are not in it.
Text is kept as printed; bullets stay one block each, the Indebolimento levels become a table.

Usage: python scripts/transcribe-srd51-conditions.py SRD_CC_v5.1_IT.pdf lib/data/srd-conditions-5.1-it.json
The PDF is read from a temporary folder and never committed.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf

PDF_SHA256 = '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7'
PAGES = (406, 407)
TITLES = ['Accecato', 'Affascinato', 'Afferrato', 'Assordato', 'Avvelenato', 'Incapacitato', 'Indebolimento',
          'Invisibile', 'Paralizzato', 'Pietrificato', 'Privo di sensi']


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def block(kind, text, page):
    return {'kind': kind, 'text': text, 'page': page, 'sourceHash': hashlib.sha256(text.encode()).hexdigest()}


def main():
    pdf_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    if hashlib.sha256(pdf_path.read_bytes()).hexdigest() != PDF_SHA256:
        raise SystemExit('unexpected PDF')
    pdf = pymupdf.open(pdf_path)
    lines = []
    for page in PAGES:
        for line in pdf[page - 1].get_text().split('\n'):
            if line.startswith('Rivendita vietata') or line.startswith('Systems Reference Document'):
                continue
            lines.append((page, line.strip()))
    start = next(i for i, (_, text) in enumerate(lines) if text == TITLES[0])
    entries, current = [], None
    for page, text in lines[start:]:
        if text in TITLES:
            current = {'title': text, 'page': page, 'pages': [page], 'lines': []}
            entries.append(current)
            continue
        if page not in current['pages']:
            current['pages'].append(page)
        current['lines'].append((page, text))
    records = []
    for entry in entries:
        blocks, paragraph, table = [], [], []
        def flush():
            if paragraph:
                blocks.append(block('prose', re.sub(r'\s+', ' ', ' '.join(t for _, t in paragraph)).strip(), paragraph[0][0]))
                paragraph.clear()
        rows = iter(entry['lines'])
        for page, text in rows:
            if text == 'Livello':
                flush()
                next(rows)  # "Effetto"
                table.append(('Livello', 'Effetto'))
                continue
            if table and len(table) < 7:
                if not text:
                    continue
                level, effect = text, next(r for r in rows if r[1])[1]
                table.append((level, effect.strip()))
                if len(table) == 7:
                    width = max(len(level) for level, _ in table) + 3
                    blocks.append(block('table', '\n'.join(f'{a:<{width}}{b}' for a, b in table), page))
                continue
            if text.startswith('•') or not text:
                flush()
            if text:
                paragraph.append((page, text))
        flush()
        records.append({'id': f'condizioni-{slug(entry["title"])}-2014', 'title': entry['title'], 'category': 'condizioni',
                        'subgroup': 'Condizioni · regole 2014', 'edizione': '2014', 'page': entry['page'],
                        'pages': entry['pages'], 'blocks': blocks})
    assert [r['title'] for r in records] == TITLES, [r['title'] for r in records]
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(records)} conditions')


if __name__ == '__main__':
    main()
