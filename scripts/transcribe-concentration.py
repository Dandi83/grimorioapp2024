"""Transcribe the concentration rule of both editions, as printed in the Italian SRD PDFs.

- 2024: «Concentrazione», Glossario delle regole, SRD 5.2.1 italiano, p. 206 (left column).
- 2014: «Concentrazione», capitolo «Lanciare incantesimi», SRD 5.1 italiano, pp. 116-117.

Words are kept as printed: line-end soft hyphens are joined, spaces normalised; the bold label of a paragraph
(«Danni.», «Subire danni.») is recorded apart, the text still starts with it. Each block carries the SHA-256 of
its text; the script checks that the characters of the blocks are exactly those of the printed lines.

Usage: python scripts/transcribe-concentration.py IT_SRD_CC_v5.2.1.pdf SRD_CC_v5.1_IT.pdf lib/data/srd-concentrazione-it.json
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

SOURCES = {
    '2024': {'sha256': 'a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718',
             'url': 'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf',
             'document': 'SRD 5.2.1 italiano', 'chapter': 'Glossario delle regole',
             # page, clip (x0, y0, x1, y1), first line, line that follows the entry
             'regions': [(206, (55, 405, 300, 760))], 'start': 'Concentrazione', 'end': None},
    '2014': {'sha256': '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7',
             'url': 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf',
             'document': 'SRD 5.1 italiano', 'chapter': 'Lanciare incantesimi',
             'regions': [(116, (320, 505, 570, 745)), (117, (50, 55, 320, 360))], 'start': 'Concentrazione', 'end': None},
}
EXPECTED_BLOCKS = {'2024': 5, '2014': 7}


def chars(text):
    return collections.Counter(c.casefold() for c in unicodedata.normalize('NFKC', text.replace('\xad', '')) if not c.isspace())


def lines_of(pdf, regions):
    out = []
    for page, clip in regions:
        for block in pdf[page - 1].get_text('dict', clip=pymupdf.Rect(*clip))['blocks']:
            for line in block.get('lines', []):
                spans = [s for s in line['spans'] if s['text'].strip() or s['text'] == ' ']
                text = ''.join(s['text'] for s in spans)
                if not text.strip() or text.startswith(('Rivendita vietata', 'Systems Reference', 'System Reference')):
                    continue
                bold = ''
                for s in spans:
                    if s['text'] in ('•', ' ') and not bold:
                        continue
                    if 'Bold' not in s['font']:
                        break
                    bold += s['text']
                out.append({'page': page, 'x0': line['bbox'][0], 'x1': line['bbox'][2], 'text': text, 'bold': bold.strip(),
                            'heading': spans[0]['font'].startswith(('GillSans', 'Calibri'))})
    return out


def transcribe(edition, pdf_path):
    source = SOURCES[edition]
    if hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest() != source['sha256']:
        raise SystemExit(f'unexpected PDF for {edition}')
    lines = lines_of(pymupdf.open(pdf_path), source['regions'])
    first = next(i for i, line in enumerate(lines) if line['heading'] and line['text'].strip() == source['start'])
    lines = lines[first:]
    body = lines[1:]
    # The entry ends at the next heading of the column.
    end = next((i for i, line in enumerate(body) if line['heading']), len(body))
    body = body[:end]
    printed = ''.join(line['text'] for line in body)
    paragraphs = []
    for i, line in enumerate(body):
        previous = body[i - 1] if i else None
        starts = (not paragraphs or line['text'].startswith((' ', '•')) or (line['bold'] and previous and not previous['bold'])
                  or (previous and previous['text'].rstrip().endswith('.') and previous['x1'] < 260 and previous['page'] == line['page']
                      and line['x0'] == previous['x0']))
        if starts:
            paragraphs.append({'page': line['page'], 'parts': [], 'label': line['bold']})
        elif paragraphs[-1]['label'] and not paragraphs[-1]['label'].endswith('.') and line['bold']:
            paragraphs[-1]['label'] += ' ' + line['bold']  # a bold label on two lines
        paragraphs[-1]['parts'].append(line['text'])
    blocks = []
    for paragraph in paragraphs:
        text = ''
        for part in paragraph['parts']:
            part = part.replace('\xa0', ' ')
            text = text[:-1] + part.lstrip() if text.endswith('\xad') else (text + ' ' + part.strip() if text else part.strip())
        text = re.sub(r'\s+', ' ', text.replace('\xad', '')).strip()
        block = {'kind': 'prose', 'text': text, 'page': paragraph['page']}
        label = re.sub(r'\s+', ' ', paragraph['label']).strip()
        if label:
            assert text.lstrip('• ').startswith(label), (label, text)
            block['label'] = label
        block['sourceHash'] = hashlib.sha256(text.encode()).hexdigest()
        blocks.append(block)
    assert chars(''.join(b['text'] for b in blocks)) == chars(printed), (chars(printed) - chars(''.join(b['text'] for b in blocks)))
    assert len(blocks) == EXPECTED_BLOCKS[edition], [b['text'][:40] for b in blocks]
    pages = sorted({line['page'] for line in body} | {lines[0]['page']})
    return {
        'id': 'concentrazione' if edition == '2024' else 'concentrazione-2014',
        'title': 'Concentrazione', 'edizione': edition, 'document': source['document'], 'chapter': source['chapter'],
        'sourceUrl': source['url'], 'sourceSha256': source['sha256'], 'page': pages[0], 'pages': pages, 'blocks': blocks,
    }


def main():
    pdf2024, pdf2014, out = sys.argv[1:4]
    entries = [transcribe('2024', pdf2024), transcribe('2014', pdf2014)]
    Path(out).write_text(json.dumps(entries, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    for entry in entries:
        print(entry['id'], entry['pages'], len(entry['blocks']), 'blocks')


if __name__ == '__main__':
    main()
