"""Transcribe the damage rules of both editions, as printed in the Italian SRD PDFs.

- 2024, Glossario delle regole, SRD 5.2.1 italiano: «Immunità» (p. 208), «Resistenza» (p. 212), «Vulnerabilità» (p. 219).
- 2014, SRD 5.1 italiano: «Resistenza e vulnerabilità ai danni» (Combattimento, p. 111) and «Vulnerabilità,
  resistenze e immunità» (Mostri, p. 295).

Same rules as scripts/transcribe-concentration.py: words as printed, line-end soft hyphens joined, spaces
normalised, one block per printed paragraph (a paragraph starts at the indented line), the SHA-256 of each
block, and a check that the characters of the blocks are exactly those of the printed lines.

Usage: python scripts/transcribe-damage-rules.py IT_SRD_CC_v5.2.1.pdf SRD_CC_v5.1_IT.pdf lib/data/srd-regole-danni-it.json
The PDFs are read from a temporary folder and never committed.
"""
import collections
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

PDFS = {
    '2024': {'sha256': 'a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718',
             'url': 'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf', 'document': 'SRD 5.2.1 italiano'},
    '2014': {'sha256': '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7',
             'url': 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf', 'document': 'SRD 5.1 italiano'},
}
# id, edition, chapter, title as printed, page, clip (x0, y0, x1, y1) of the column, expected blocks
ENTRIES = [
    ('immunita', '2024', 'Glossario delle regole', 'Immunità', 208, (55, 30, 300, 130), 1),
    ('resistenza', '2024', 'Glossario delle regole', 'Resistenza', 212, (305, 515, 570, 625), 1),
    ('vulnerabilita', '2024', 'Glossario delle regole', 'Vulnerabilità', 219, (305, 385, 570, 490), 1),
    ('resistenza-vulnerabilita-2014', '2014', 'Combattimento', 'Resistenza e vulnerabilità ai danni', 111, (50, 210, 320, 560), 4),
    ('immunita-2014', '2014', 'Mostri', 'Vulnerabilità, resistenze e immunità', 295, (50, 510, 320, 700), 1),
]


def chars(text):
    return collections.Counter(c.casefold() for c in unicodedata.normalize('NFKC', text.replace('\xad', '')) if not c.isspace())


def heading(span):
    return span['font'].startswith(('GillSans', 'Calibri')) and span['size'] >= 11


def transcribe(pdf, entry, edition):
    id_, _, chapter, title, page, clip, expected = entry
    lines = []
    for block in pdf[page - 1].get_text('dict', clip=pymupdf.Rect(*clip))['blocks']:
        for line in block.get('lines', []):
            spans = [s for s in line['spans'] if s['text'].strip() or s['text'] == ' ']
            text = ''.join(s['text'] for s in spans)
            if not text.strip() or text.startswith(('Rivendita vietata', 'Systems Reference', 'System Reference')):
                continue
            lines.append({'text': text, 'heading': heading(spans[0])})
    first = next(i for i, line in enumerate(lines) if line['heading'] and line['text'].strip() == title)
    body = lines[first + 1:]
    body = body[:next((i for i, line in enumerate(body) if line['heading']), len(body))]
    printed = ''.join(line['text'] for line in body)
    paragraphs = []
    for line in body:
        if not paragraphs or line['text'].startswith(' '):
            paragraphs.append([])
        paragraphs[-1].append(line['text'])
    blocks = []
    for parts in paragraphs:
        text = ''
        for part in parts:
            part = part.replace('\xa0', ' ')
            text = text[:-1] + part.lstrip() if text.endswith('\xad') else (text + ' ' + part.strip() if text else part.strip())
        text = re.sub(r'\s+', ' ', text.replace('\xad', '')).strip()
        blocks.append({'kind': 'prose', 'text': text, 'page': page, 'sourceHash': hashlib.sha256(text.encode()).hexdigest()})
    assert chars(''.join(b['text'] for b in blocks)) == chars(printed), id_
    assert len(blocks) == expected, (id_, [b['text'][:40] for b in blocks])
    source = PDFS[edition]
    return {'id': id_, 'title': title, 'edizione': edition, 'document': source['document'], 'chapter': chapter,
            'sourceUrl': source['url'], 'sourceSha256': source['sha256'], 'page': page, 'pages': [page], 'blocks': blocks}


def main():
    paths = {'2024': sys.argv[1], '2014': sys.argv[2]}
    pdfs = {}
    for edition, path in paths.items():
        if hashlib.sha256(Path(path).read_bytes()).hexdigest() != PDFS[edition]['sha256']:
            raise SystemExit(f'unexpected PDF for {edition}')
        pdfs[edition] = pymupdf.open(path)
    entries = [transcribe(pdfs[entry[1]], entry, entry[1]) for entry in ENTRIES]
    Path(sys.argv[3]).write_text(json.dumps(entries, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    for entry in entries:
        print(entry['id'], entry['pages'], len(entry['blocks']), 'blocks')


if __name__ == '__main__':
    main()
