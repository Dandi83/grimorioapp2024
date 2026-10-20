"""Transcribe every creature stat block of the Italian SRD 5.1 into catalog records.

Only spacing, line breaks and HTML formatting are normalized; the rules text is
copied as printed. The PDF is never stored in the repository.

Usage:
  python scripts/transcribe-srd51-monsters.py /path/to/SRD_CC_v5.1_IT.pdf out.json
Requires PyMuPDF (pip install pymupdf). Expected PDF SHA-256:
2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7
"""
import hashlib
import html
import json
import re
import sys
import unicodedata
from fractions import Fraction
from pathlib import Path

import pymupdf

PDF_SHA256 = '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7'
FIRST_PAGE, LAST_PAGE = 266, 453  # creature stat blocks: magic items (2), monsters, appendices A and B
APPENDIX_A = (414, 443)  # "Creature varie": the animals collection
APPENDIX_B = (444, 453)  # PNG

SIZES = {
    'minuscol': 'Minuscola', 'piccol': 'Piccola', 'medi': 'Media',
    'grand': 'Grande', 'enorm': 'Enorme', 'mastodontic': 'Mastodontica',
}
FIELDS = [
    ('Classe Armatura', 'classe_armatura'), ('Punti Ferita', 'punti_ferita'), ('Velocità', 'velocita'),
    ('Tiri Salvezza', 'tiri_salvezza'), ('Abilità', 'abilita'),
    ('Vulnerabilità ai Danni', 'vulnerabilita'), ('Resistenze ai Danni', 'resistenze'),
    ('Immunità ai Danni', 'immunita_danni'), ('Immunità alle Condizioni', 'immunita_condizioni'),
    ('Sensi', 'sensi'), ('Linguaggi', 'linguaggi'), ('Sfida', 'sfida'),
]
SECTIONS = {'azioni': 'azioni', 'reazioni': 'reazioni', 'azioni leggendarie': 'azioni_leggendarie'}
SPELL_LINE = re.compile(r'^(?:Trucchetti|\d+° livello|A volontà|\d+/giorno|\d+ volte al giorno)', re.I)


def slug(name):
    text = unicodedata.normalize('NFD', name.lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def clean(text):
    # PDF soft hyphens and non-breaking spaces; the typographic minus becomes a plain hyphen like the 2014 records.
    return text.replace('­', '').replace(' ', ' ').replace('−', '-')


def read_lines(pdf):
    lines = []
    for page_number in range(FIRST_PAGE, LAST_PAGE + 1):
        page = pdf[page_number - 1]
        middle = page.rect.width / 2
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                x, y = line['bbox'][0], line['bbox'][1]
                if y < 60 or y > 740:
                    continue  # running header and footer
                spans = [(clean(s['text']), s['font'], round(s['size'])) for s in line['spans']]
                lines.append({'page': page_number, 'column': 0 if x < middle else 1, 'x': x, 'y': y, 'spans': spans,
                              'text': ''.join(s[0] for s in spans)})
    lines.sort(key=lambda l: (l['page'], l['column'], l['y'], l['x']))
    # Spans of one visual line can come in several PDF lines (the ability table): merge same-y lines.
    merged = []
    for line in lines:
        last = merged[-1] if merged else None
        if last and last['page'] == line['page'] and last['column'] == line['column'] and abs(last['y'] - line['y']) < 2:
            last['spans'] += line['spans']
            last['text'] += line['text']
        else:
            merged.append(line)
    return merged


def is_title(line):
    first = next((s for s in line['spans'] if s[0].strip()), None)
    return bool(first) and first[1] == 'Calibri-Bold' and first[2] == 12


def is_heading(line):
    first = next((s for s in line['spans'] if s[0].strip()), None)
    return bool(first) and first[1] == 'Calibri' and first[2] >= 14


def is_section(line):
    first = next((s for s in line['spans'] if s[0].strip()), None)
    return bool(first) and first[1] == 'Calibri-Bold' and first[2] == 11 and line['text'].strip().lower() in SECTIONS


def inline_html(spans):
    """Plain text with italic runs as <em>; bold item names are handled by the caller."""
    out, open_em = [], False
    for text, font, _ in spans:
        italic = 'Italic' in font and 'Bold' not in font
        if italic and not open_em and text.strip():
            out.append('<em>')
            open_em = True
        elif not italic and open_em and text.strip():
            out.append('</em>')
            open_em = False
        out.append(html.escape(text, quote=False))
    if open_em:
        out.append('</em>')
    return ''.join(out).replace('<em></em>', '')


def split_name(spans, bold_kind):
    """Leading bold spans form an item name ("Nube di muco."); the rest is the text."""
    name, rest, in_name = [], [], True
    for index, span in enumerate(spans):
        bold = 'Bold' in span[1] and (bold_kind == 'any' or 'Italic' in span[1] or span[0].strip() in ('', '.'))
        # A space in another font inside a name: "Tocco" + " " + "paralizzante."
        joins = (not span[0].strip() and not ''.join(name).rstrip().endswith('.')
                 and index + 1 < len(spans) and 'Bold' in spans[index + 1][1])
        if in_name and (bold or joins):
            name.append(span[0])
        else:
            in_name = False
            rest.append(span)
    # The closing period is sometimes set in plain type: "Assorbimento del fulmine" + "."
    if name and rest and rest[0][0].lstrip().startswith('.') and not ''.join(name).rstrip().endswith('.'):
        text, font, size = rest[0]
        name.append('.')
        rest = [(text.lstrip()[1:], font, size)] + rest[1:]
    return ''.join(name).strip(), rest


def starts_item(line, section):
    first = next((s for s in line['spans'] if s[0].strip()), None)
    if not first or line['text'].startswith(' '):
        return None
    if first[1] == 'Calibri-BoldItalic':
        return 'italic'
    # Some names are set in plain bold (legendary actions, a few traits): "Sguardo pietrificante."
    if first[1] == 'Calibri-Bold' and first[0].rstrip().endswith('.'):
        return 'any'
    if section == 'azioni_leggendarie' and first[1] == 'Calibri-Bold':
        return 'any'
    return None


def join_text(parts):
    text = ''
    for part in parts:
        if not text:
            text = part
        elif text.endswith('-') and not text.endswith(' -') and part[:1].islower():
            text = text[:-1] + part  # word split across lines
        else:
            text = text.rstrip() + ' ' + part.lstrip()
    return re.sub(r'\s+', ' ', text).strip()


def build_html(items):
    paragraphs = []
    for item in items:
        body = []
        for chunk in item['chunks']:
            if chunk == '<br>':
                body.append('<br>')
            else:
                body.append(chunk)
        text = ''
        for piece in body:
            if piece == '<br>':
                text = text.rstrip() + '<br>'
            else:
                text = join_text([text, piece]) if text and not text.endswith('<br>') else text + piece.lstrip()
        text = re.sub(r'\s*</em>\s*<em>\s*', ' ', text).replace(' </em>', '</em> ').replace('<em> ', ' <em>')
        text = re.sub(r'\s+', ' ', text).replace(' <br>', '<br>').replace('<br> ', '<br>').strip()
        name = item['name']
        # "Autorità (ricarica dopo un riposo breve o lungo)." prints the recharge in plain type: keep it in the name.
        recharge = re.match(r'^(\([^)<]*\)\.)\s*', text) if name and not name.endswith('.') else None
        if recharge:
            name, text = f'{name} {recharge[1]}', text[recharge.end():]
        if name:
            item = {**item, 'name': name}
            paragraphs.append(f"<strong>{html.escape(item['name'], quote=False)}</strong> {text}".strip())
        else:
            paragraphs.append(text)
    return '<br><br>'.join(p for p in paragraphs if p)


def parse_subtitle(subtitle):
    match = re.match(r'^(?P<tipo>.+?) (?P<taglia>Minuscol[oaie]|Piccol[oaie]|Medi[oaie]|Grande|Grandi|Enorme|Enormi|Mastodontic[oaie]|Mastodontich[ei])'
                     r'(?P<resto>(?: \([^)]*\))?(?: di [^,]+)?), (?P<allineamento>.+)$', subtitle.strip(), re.I)
    if not match:
        raise ValueError(f'subtitle not understood: {subtitle!r}')
    tipo, size, rest = match['tipo'], match['taglia'].lower(), match['resto'].strip()
    taglia = next(v for k, v in SIZES.items() if size.startswith(k))
    if rest.startswith('di '):  # "Sciame Medio di bestie Minuscole"
        tipo = f'{tipo} {rest}'
    elif rest:
        tipo = f'{tipo} {rest}'
    return tipo.strip(), taglia, match['allineamento'].strip()


def parse_block(lines):
    title = lines[0]['text'].strip()
    # The italic subtitle can wrap ("..., qualsiasi" / "allineamento").
    italic = 1
    while italic < len(lines) and all('Italic' in span[1] or not span[0].strip() for span in lines[italic]['spans']):
        italic += 1
    subtitle = join_text([line['text'] for line in lines[1:italic]])
    tipo, taglia, allineamento = parse_subtitle(subtitle)
    monster = {key: '' for key in ['tiri_salvezza', 'abilita', 'vulnerabilita', 'resistenze', 'immunita_danni',
                                   'immunita_condizioni', 'linguaggi', 'tratti', 'azioni', 'reazioni',
                                   'azioni_leggendarie', 'descrizione']}
    # The printed subtitle is kept as is, like the 2024 sheets ("Non morto Medio, qualsiasi allineamento malvagio").
    monster.update(id=f'{slug(title)}-2014', nome=title, tipo=tipo, taglia=taglia, allineamento=allineamento,
                   sottotitolo_fonte=subtitle)
    fields, scores = {}, []
    sections = {'tratti': [], 'azioni': [], 'reazioni': [], 'azioni_leggendarie': []}
    section, current_field, after_stats = None, None, False
    for line in lines[italic:]:
        text = line['text']
        if not text.strip():
            continue
        if not after_stats:
            stripped = text.lstrip()
            bold = next((span[1] for span in line['spans'] if span[0].strip()), '')
            label = next((f for f in FIELDS if stripped.lower().startswith(f[0].lower() + ' ') and 'Bold' in bold), None)
            if label:
                current_field = label[1]
                fields[current_field] = [stripped[len(label[0]):].strip()]
                if current_field == 'sfida':
                    after_stats, section = True, 'tratti'
                continue
            if text.split()[:2] == ['FOR', 'DES']:
                current_field = None
                continue
            numbers = re.findall(r'(\d+)\s*\(\s*[+\-–]?\s*\d+\s*\)', text)
            if numbers and len(scores) < 6:
                scores += [int(n) for n in numbers]
                continue
            if current_field:
                fields[current_field].append(text.strip())
                continue
            raise ValueError(f'{title}: unexpected line before stats end: {text!r}')
        if is_section(line):
            section = SECTIONS[text.strip().lower()]
            continue
        kind = starts_item(line, section)
        items = sections[section]
        if kind:
            name, rest = split_name(line['spans'], kind)
            previous = items[-1] if items else None
            if previous and previous['name'] and not previous['name'].endswith('.') and not ''.join(previous['chunks']).strip():
                # A long name wraps: "Catene animate (ricarica dopo un riposo lungo" / "o breve)."
                previous['name'] += ' ' + name
                previous['chunks'] = [inline_html(rest)]
            else:
                items.append({'name': name, 'chunks': [inline_html(rest)]})
            continue
        if not items:
            items.append({'name': '', 'chunks': []})
        chunk = inline_html(line['spans'])
        if text.startswith(' ') or text.startswith('*') or (SPELL_LINE.match(text.strip()) and items[-1]['chunks']):
            items[-1]['chunks'].append('<br>')
            chunk = chunk.lstrip()
        items[-1]['chunks'].append(chunk)
    if len(scores) != 6:
        raise ValueError(f'{title}: ability scores not found ({scores})')
    for key, value in fields.items():
        fields[key] = join_text(value)
    challenge = re.match(r'^(\d+(?:/\d+)?|—) \(([\d.]+) PE\)$', fields.pop('sfida', ''))
    if not challenge:
        raise ValueError(f'{title}: challenge not found')
    monster.update({k: v for k, v in fields.items()})
    # "—": a creature without a challenge rating (the Avatar della morte), sorted first.
    monster.update(grado_sfida=challenge[1], px=challenge[2], gs_num=float(Fraction(challenge[1])) if challenge[1] != '—' else -1)
    monster.update(zip(['forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma'], scores))
    for key, items in sections.items():
        monster[key] = build_html(items)
    return monster


def main():
    pdf_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if digest != PDF_SHA256:
        raise SystemExit(f'unexpected PDF: {digest}')
    pdf = pymupdf.open(pdf_path)
    lines = read_lines(pdf)
    starts = [i for i, line in enumerate(lines[:-1]) if is_title(line)
              and lines[i + 1]['spans'] and lines[i + 1]['spans'][0][1] == 'Calibri-Italic']
    records, problems = [], []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(lines)
        block = lines[start:end]
        # A group heading or a table title ends the stat block: the text after it is not part of the sheet.
        for offset, line in enumerate(block[1:], 1):
            first = next((span for span in line['spans'] if span[0].strip()), None)
            # Descriptive text (PNG lore, magic item text) is set in Cambria, stat blocks in Calibri.
            # A "Variante: ..." box (Calibri 11) is a sidebar printed after the sheet, not part of it.
            sidebar = first and first[1] == 'Calibri' and first[2] == 11 and first[0].startswith('Variante')
            if is_heading(line) or (is_title(line) and offset > 1) or (first and first[1].startswith('Cambria')) or sidebar:
                block = block[:offset]
                break
        source = re.sub(r'\s+', ' ', ' '.join(line['text'] for line in block)).strip()
        try:
            monster = parse_block(block)
        except ValueError as error:
            problems.append(f'p.{block[0]["page"]} {error}')
            continue
        pages = sorted({line['page'] for line in block})
        record = {'page': pages[0], 'sourceName': monster['nome'], 'sourceText': source,
                  'sourceSha256': hashlib.sha256(source.encode()).hexdigest(), 'monster': monster}
        if len(pages) > 1:
            record['pages'] = pages
        record['collection'] = 'animali' if APPENDIX_A[0] <= pages[0] <= APPENDIX_A[1] else 'mostri'
        records.append(record)
    out_path.write_text(json.dumps({'sourceSha256': digest, 'records': records}, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(records)} stat blocks')
    for problem in problems:
        print('NOT TRANSCRIBED', problem)


if __name__ == '__main__':
    main()
