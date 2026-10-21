"""Transcribe the magic items A-Z of the Italian SRD 5.2.1 (pp. 237-288) and SRD 5.1 (pp. 237-288, 290-291).

The PDFs stay in a temporary folder and are never committed. Pages are read column by column with
the words in text-flow order (pdfplumber, use_text_flow=True). A new item starts at a name printed in
the name font (2024 GillSans-SemiBold 12, 2014 Calibri 12) followed by its italic type line. Body text
is split into paragraphs at indented lines, run-in bold-italic labels and bullets; a word broken at
the end of a line is joined back. Tables and stat blocks are printed in other fonts: they are read by
coordinates (a row starts at its first cell) and placed where they are printed in the column; the few
tables printed inside another item's text are moved to their item and listed in "tabelleSpostate".
Italic words are wrapped in *...*. Every item keeps its page, its printed type line and a SHA-256
fingerprint of its text. Nothing is rewritten: display-only repairs live in a separate file.

The second, independent extraction used by the fidelity tests (pdftotext -raw) is written by
--raw: one text file per edition, item names as printed, never committed together with the PDF.

Usage: python scripts/transcribe-srd-magic-items.py 2024|2014 SRD.pdf out.json
       python scripts/transcribe-srd-magic-items.py --raw 2024|2014 SRD.pdf out.txt
"""
import collections
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import pdfplumber

EDITIONS = {
    '2024': {
        'sha': 'a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718',
        'url': 'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf',
        'pages': list(range(237, 289)),
        'name': ('GillSans-SemiBold', 12.0),
        # Running footer: "System Reference Document 5.2.1" and the page number, both 11 pt.
        'footer': lambda font, size, top: font.startswith('GillSans') and size == 11.0,
        'body': ('Cambria', 'SymbolMT'),
        'statblock': ('Optima',),
        'title': (('GillSans-SemiBold', 10.5),),
        'start': 'Oggetti magici A–Z',
        'resume': (),
        'count': 258,
    },
    '2014': {
        'sha': '2ef143b8abeae9558d30b405ea48e2ee9b5d700dd11cd955e6117e61cbddd3f7',
        'url': 'https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf',
        'pages': list(range(237, 292)),
        'name': ('Calibri', 12.0),
        # Running footer: licence line (Calibri-Italic 8) and "Systems Reference Document 5.1" with the page number.
        'footer': lambda font, size, top: (font, size) == ('Calibri-Italic', 8.0) or (font, size) == ('Calibri', 10.0) and top > 745,
        'body': ('Cambria', 'SymbolMT'),
        'statblock': ('Calibri-Bold 10', 'Calibri 10', 'Calibri-Italic 10', 'Calibri-BoldItalic 10', 'Calibri-Bold 11'),
        'title': (('Calibri-Bold', 12.0),),
        'start': 'Oggetti magici A–Z',
        # After "Oggetti magici senzienti" the 2014 list goes on with one item printed under "Manufatti".
        'resume': ('Manufatti',),
        'count': 240,
    },
}
TYPES = ['Oggetto meraviglioso', 'Arma', 'Armatura', 'Anello', 'Pozione', 'Bacchetta', 'Bastone', 'Verga', 'Pergamena']
RARITIES = ['comune', 'non comune', 'raro', 'rara', 'molto raro', 'molto rara', 'leggendario', 'leggendaria', 'manufatto', 'rarità variabile']
# Tables printed inside the text of another item, moved by their printed title (page, title start) to their item.
MOVED_TABLES = {
    '2024': {},
    '2014': {},
}


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def slug(text):
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def font_of(word):
    return word['fontname'].split('+')[-1]


def kind_of(word, config):
    font, size = word['font'], word['size']
    if (font, size) == config['name']:
        return 'name'
    if font.startswith(config['body']) and abs(size - 10) < 0.3:
        return 'body'
    if size >= 17.5:
        return 'heading'
    return 'aside'


def shading(page):
    """Grey row backgrounds of the tables on a page: (x0, top, x1, bottom)."""
    return [(r['x0'], r['top'], r['x1'], r['bottom']) for r in page.rects
            if r.get('fill') and r['bottom'] - r['top'] < 300 and r['x1'] - r['x0'] > 10]


def page_words(pdf, number, config):
    """Words of a page split in its two columns, each in text-flow order, plus the table shading.

    Table words printed across both columns (a shaded row crossing the middle) stay in the first column."""
    page = pdf.pages[number - 1]
    middle = page.width / 2
    rects = shading(page)
    wide = [(top, bottom) for x0, top, x1, bottom in rects if x0 < middle - 20 and x1 > middle + 20]
    columns = ([], [])
    for word in page.extract_words(use_text_flow=True, extra_attrs=['fontname', 'size'], return_chars=True):
        if config['footer'](font_of(word), round(word['size'], 1), word['top']):
            continue
        # The baseline of the text matrix is reliable; the box top of some italic and bold runs is not.
        base = page.height - word['chars'][0]['matrix'][5]
        word = {
            'text': word['text'].replace('\u00ad', ''), 'x0': word['x0'], 'x1': word['x1'],
            'top': base - 0.75 * word['size'], 'bottom': base + 0.25 * word['size'],
            'font': font_of(word), 'size': round(word['size'], 1), 'page': number,
        }
        if '-SC' in word['font'] and word['size'] > 9:
            # Small caps: the full-size letter is printed as a capital (the "S" of "Sag").
            word['text'] = word['text'].upper()
        word['kind'] = kind_of(word, config)
        column = 0 if word['x0'] < middle else 1
        if column and word['kind'] == 'aside' and any(top - 45 <= word['top'] <= bottom + 30 for top, bottom in wide):
            column = 0
        columns[column].append(word)
    return columns, rects


def group_lines(words, tolerance=3):
    """Words grouped into printed lines by position (used only inside tables and stat blocks)."""
    lines = []
    for word in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        if lines and abs(lines[-1][0]['top'] - word['top']) <= tolerance:
            lines[-1].append(word)
        else:
            lines.append([word])
    return [sorted(line, key=lambda w: w['x0']) for line in lines]


def aside_blocks(words):
    """Table and stat-block words of one column grouped into blocks printed one under the other."""
    blocks = []
    for line in group_lines(words):
        if blocks and line[0]['top'] - blocks[-1][-1][0]['bottom'] < 9:
            blocks[-1].append(line)
        else:
            blocks.append([line])
    return blocks


HYPHENS = set()


def style_of(word):
    """'b' for bold, 'i' for italic, '' for roman text."""
    if 'Bold' in word['font']:
        return 'b'
    return 'i' if 'Italic' in word['font'] else ''


MARKS = {'': '', 'i': '*', 'b': '**'}


def render(tokens):
    """Text of words in reading order: italics wrapped in *...*, bold words in **...**.

    Words split by a font change (no gap, or after an apostrophe) are glued back; a word broken by a
    hyphen at the end of a line is joined, keeping the hyphen only for words printed with it elsewhere."""
    pieces, previous_x1 = [], 0.0
    for token in tokens:
        text, style, glue = token['text'], style_of(token), False
        if pieces and not token['newline'] and (token['x0'] - previous_x1 < 0.6 or pieces[-1][0].endswith(("'", '’'))):
            glue = True
            if pieces[-1][0][-1:].isalnum() and text[:1].isalnum():
                style = pieces[-1][1]
        elif pieces and token['newline'] and pieces[-1][0].endswith('-') and len(glued_word(pieces)) > 1 \
                and re.match(r'[a-zà-ù]', text):
            word = glued_word(pieces)
            head = re.sub(r"^.*[\s(«\"]", '', word)[:-1].lower()
            pair = head + '-' + re.sub(r'[^\w\'’-].*$', '', text).lower()
            if pair not in HYPHENS:
                pieces[-1][0] = pieces[-1][0][:-1]
            glue = True
            if text[:1].isalnum():
                style = pieces[-1][1]
        pieces.append([text.replace('*', '\\*'), style, glue])
        previous_x1 = token['x1']
    out, current = '', ''
    for text, style, glue in pieces:
        space = '' if glue or not out else ' '
        if style != current:
            out += MARKS[current] + space + MARKS[style] + text
            current = style
        else:
            out += space + text
    return out + MARKS[current]


def glued_word(pieces):
    """The last word of the pieces, made of the pieces glued together."""
    k = len(pieces) - 1
    word = pieces[k][0]
    while k > 0 and pieces[k][2]:
        k -= 1
        word = pieces[k][0] + word
    return word


def line_tokens(words):
    """Words of table cells or stat-block lines in reading order, each line flagged as a new line."""
    out = []
    for line in group_lines(words):
        for n, word in enumerate(line):
            out.append({**word, 'newline': n == 0})
    return out


def table_cells(lines, config, previous=None, rects=()):
    """Rows of a table, read by coordinates.

    Columns and rows come from the grey shading of the rows (cell rectangles); a table without
    shading uses the gaps between header words for the columns and starts a row at its first cell.
    A block without a header continues the previous table of the same item (next column or page).
    Returns the new table, or None when the rows were added to the previous one."""
    title = []
    while lines and any((w['font'], w['size']) in config['title'] for w in lines[0]):
        title.extend(lines.pop(0))
    footnotes = []
    while lines and all(w['size'] <= 8.5 for w in lines[-1]):
        footnotes.insert(0, lines.pop())
    star = next((n for n, line in enumerate(lines) if n and line[0]['text'].startswith('*')), None)
    if star is not None:
        footnotes = lines[star:] + footnotes
        lines = lines[:star]
    header_lines = []
    while lines and all('Bold' in w['font'] or 'SemiBold' in w['font'] for w in lines[0]):
        header_lines.append(lines.pop(0))
    if not header_lines and (previous is None or title):
        raise ValueError('table without header near: ' + ' '.join(w['text'] for w in lines[0]))
    if rects:
        starts = []
        for x in sorted(r[0] for r in rects):
            if not starts or x - starts[-1] > 8:
                starts.append(x)
    elif header_lines:
        starts = []
        for line in header_lines:
            before = None
            for word in line:
                if before is None or word['x0'] - before['x1'] > 6:
                    if not any(abs(word['x0'] - s) < 6 for s in starts):
                        starts.append(word['x0'] - 8)
                before = word
        starts.sort()
    else:
        left = min(w['x0'] for line in lines for w in line)
        starts = [left - 8 + s for s in previous['_starts']]
    table = previous if not header_lines else {
        'kind': 'table', 'title': join_words(title) or None, '_header': [], '_rows': [], 'notes': []}
    table['_starts'] = [s - starts[0] for s in starts]

    def column(word):
        index = 0
        for i, start in enumerate(starts):
            if word['x0'] >= start - 2:
                index = i
        return index

    def cells_of(line_list):
        cells = [[] for _ in starts]
        for line in line_list:
            for word in line:
                cells[column(word)].append(word)
        return cells

    if header_lines:
        table['_header'] = cells_of(header_lines)
    shaded = []
    for top, bottom in sorted((r[1], r[3]) for r in rects):
        if shaded and top <= shaded[-1][1] + 0.5:
            shaded[-1][1] = max(shaded[-1][1], bottom)
        else:
            shaded.append([top, bottom])

    def row_key(line):
        middle = (line[0]['top'] + line[0]['bottom']) / 2
        for i, (top, bottom) in enumerate(shaded):
            if top - 1 <= middle <= bottom + 1:
                return ('shaded', i)
        return ('plain', sum(1 for top, _ in shaded if top < middle))

    rows, key = table['_rows'], None
    for n, line in enumerate(lines):
        if shaded:
            starts_row = row_key(line) != key
            key = row_key(line)
        else:
            columns_here = {column(w) for w in line}
            starts_row = 0 in columns_here and (len(starts) == 1 or len(columns_here) > 1)
        if not rows or starts_row:
            rows.append(cells_of([line]))
        else:
            for cell, extra in zip(rows[-1], cells_of([line])):
                cell.extend(extra)
    table['notes'] += [join_words(line) for line in footnotes]
    return table if header_lines else None


def finish_table(table):
    # Titles and headers are bold by design: their text is kept without the bold marks.
    header = [join_words(c).replace('**', '') for c in table['_header']]
    rows = [[join_words(c) for c in row] for row in table['_rows']]
    half = len(header) // 2
    side_by_side = len(header) % 2 == 0 and half and header[:half] == header[half:]
    if side_by_side:
        # Two halves printed side by side: the left half is read first, then the right one.
        rows = [row[:half] for row in rows] + [row[half:] for row in rows if any(row[half:])]
        header = header[:half]
    title = table['title'].replace('**', '') if table['title'] else None
    out = {'kind': 'table', 'title': title, 'header': header, 'rows': rows}
    if side_by_side:
        out['affiancata'] = len(table['_rows'])
    if table['notes']:
        out['notes'] = table['notes']
    out['page'] = table['page']
    return out


def join_words(words):
    return render(line_tokens(words)) if words else ''


def statblock(lines):
    """A creature's stat block: one entry per printed entry, wrapped lines joined.

    An entry starts at a line opening with a bold word, in another size, in italics, or in the ability table."""
    entries = []
    for line in lines:
        first = line[0]
        new = not entries or 'Bold' in first['font'] or 'Italic' in first['font'] or first['size'] != entries[-1][-1][0]['size'] \
            or any(w['size'] < 7 or 'SC' in w['font'] for w in line) or entries[-1][0][0]['text'] == 'FOR'
        if new:
            entries.append([line])
        else:
            entries[-1].append(line)
    return {'kind': 'statblock', 'lines': [render(line_tokens([w for line in entry for w in line])) for entry in entries]}


def is_bullet(word):
    return word['text'] == '•'


def hanging(word):
    """A line opening with a bold label or a bullet: the lines under it are indented."""
    return 'Bold' in word['font'] or is_bullet(word)


def stream(pdf, config):
    """Body words and aside blocks of every column, in reading order."""
    out, carried, carried_after = [], None, False
    for number in config['pages']:
        columns, rects = page_words(pdf, number, config)
        for words in columns:
            body = [w for w in words if w['kind'] != 'aside']
            blocks = aside_blocks([w for w in words if w['kind'] == 'aside'])
            line_tops, line_top, previous = [], None, None
            for word in body:
                if previous is None or word['x0'] < previous['x1'] - 2 or word['top'] > line_top + 8:
                    line_top = word['top']
                    word['newline'] = True
                else:
                    word['newline'] = False
                word['line_top'] = line_top
                previous = word
            for block in blocks:
                top = block[0][0]['top']
                index = next((i for i, w in enumerate(body) if w.get('newline') and w['line_top'] > top), len(body))
                x0 = min(w['x0'] for line in block for w in line)
                x1 = max(w['x1'] for line in block for w in line)
                bottom = max(w['bottom'] for w in block[-1])
                own = [r for r in rects if r[1] >= top - 3 and r[3] <= bottom + 3 and r[2] > x0 and r[0] < x1]
                body.insert(index, {'kind': 'block', 'lines': block, 'page': number, 'top': top, 'rects': own})
            left = collections.Counter(round(w['x0']) for w in body if w.get('newline') and w['kind'] == 'body')
            column_left = min((x for x, n in left.items() if n >= 2), default=0)
            # A line is indented when it starts right of the next line (first-line indent) or of the line
            # above. Under a line opening with a bold label or a bullet the next lines may hang indented:
            # they continue the entry, and a line back at the margin starts a new paragraph.
            starts = [w for w in body if w['kind'] != 'block' and w['newline']]
            for word in body:
                word['indent'] = False
            hang = column_left + carried if carried is not None else None
            after_hanging = {'x0': column_left} if carried_after else None
            for n, word in enumerate(starts):
                below = starts[n + 1] if n + 1 < len(starts) else None
                above = starts[n - 1] if n else None
                if hanging(word):
                    hang, after_hanging = None, word
                    continue
                if after_hanging is not None:
                    if word['x0'] > after_hanging['x0'] + 4:
                        hang = word['x0']
                    after_hanging = None
                    continue
                if hang is not None:
                    if abs(word['x0'] - hang) < 2:
                        continue
                    # Back at the margin: a new paragraph, unless the sentence goes on.
                    before = body[body.index(word) - 1]
                    word['indent'] = bool(re.search(r'[.:!?]\*?$', before['text']))
                    hang = None
                    continue
                below_x = below['x0'] if below is not None and not hanging(below) else column_left
                word['indent'] = word['x0'] > below_x + 4 or (above is not None and word['x0'] > above['x0'] + 4)
            # A hanging entry may go on in the next column.
            carried = hang - column_left if hang is not None else None
            carried_after = after_hanging is not None
            out.extend(body)
    return out


def split_items(words, config):
    items, active, item = [], False, None
    i = 0
    while i < len(words):
        word = words[i]
        if word['kind'] == 'heading':
            run = [word]
            while i + 1 < len(words) and words[i + 1]['kind'] == 'heading':
                i += 1
                run.append(words[i])
            text = ' '.join(w['text'] for w in run)
            active = text == config['start'] or text in config['resume']
            item = None
        elif not active:
            pass
        elif word['kind'] == 'name':
            run = [word]
            while i + 1 < len(words) and words[i + 1]['kind'] == 'name':
                i += 1
                run.append(words[i])
            item = {'nameWords': run, 'typeWords': [], 'content': [], 'page': run[0]['page'], 'pages': {run[0]['page']}}
            items.append(item)
            # The italic type line follows the name; it ends before the first capitalized word outside parentheses.
            depth = 0
            while i + 1 < len(words) and words[i + 1]['kind'] == 'body' and 'Italic' in words[i + 1]['font']:
                nxt = words[i + 1]
                if item['typeWords'] and depth == 0 and nxt['text'][:1].isupper() and nxt['newline']:
                    break
                item['typeWords'].append(nxt)
                depth += nxt['text'].count('(') - nxt['text'].count(')')
                i += 1
        elif item is not None:
            item['content'].append(word)
            item['pages'].add(word['page'])
        i += 1
    return items


def paragraphs(content):
    """Body words cut into paragraphs and tables, in printed order.

    A paragraph starts at an indented line, at a bullet, or at a line opening with a bold label.
    A table printed inside a paragraph (the text goes on after it) follows that paragraph."""
    blocks, current, waiting = [], [], []

    def flush():
        if current:
            blocks.append({'kind': 'p', 'words': list(current)})
            current.clear()
        blocks.extend(waiting)
        waiting.clear()

    for n, word in enumerate(content):
        if word['kind'] == 'block':
            following = next((w for w in content[n + 1:] if w['kind'] != 'block'), None)
            ends = current and re.search(r'[.:!?]\*?$', current[-1]['text'])
            if current and following is not None and not (ends and following['text'][:1].isupper()):
                waiting.append(word)
            else:
                flush()
                blocks.append(word)
            continue
        label = word['newline'] and starts_label(content, n) and not (current and all('Bold' in w['font'] for w in current))
        # A stat line ("Classe armatura: 20") ends at the end of its printed line.
        stat_line = word['newline'] and word['text'][:1].isupper() and current and starts_label(current, 0) \
            and current[bold_run(current, 0) - 1]['text'].endswith(':')
        if word['indent'] or is_bullet(word) or label or stat_line:
            flush()
        current.append(word)
    flush()
    return blocks


def bold_run(words, start):
    end = start
    while end < len(words) and words[end]['kind'] != 'block' and 'Bold' in words[end]['font']:
        end += 1
    return end


def starts_label(words, start):
    """A run-in label: bold words at the start of a line, ending with a full stop or a colon."""
    end = bold_run(words, start)
    return end > start and words[end - 1]['text'].endswith(('.', ':'))


def render_paragraph(words):
    """(label, text, bullet) of a paragraph: the label is the leading bold run-in."""
    bullet = is_bullet(words[0])
    if bullet:
        words = words[1:]
    count = bold_run(words, 0) if starts_label(words, 0) else 0
    label = render(words[:count]).strip('*') if count else None
    return label, render(words[count:]), bullet


def hyphenated_words(pdf, config):
    """Words printed with a hyphen inside a line anywhere in the range: they keep it when broken at a line end."""
    found = set()
    for number in config['pages']:
        for word in pdf.pages[number - 1].extract_words():
            text = word['text'].strip('.,;:()«»"*').lower()
            if re.match(r'^[a-zà-ù\']+-[a-zà-ù\']+$', text):
                found.add(text)
    return found


def type_line(words):
    text = ' '.join(w['text'] for w in words)
    return re.sub(r'\s+', ' ', text).strip()


def parse_type(text):
    """Type, rarity and attunement read from the printed italic line: "Tipo (dettaglio), rarità (richiede sintonia ...)"."""
    attune = re.search(r'\((richiede sintonia[^)]*)\)\s*$', text)
    head = text[:attune.start()].strip() if attune else text
    requirement = attune.group(1)[len('richiede sintonia'):].strip() or None if attune else None
    item_type = next((t for t in sorted(TYPES, key=len, reverse=True) if head.startswith(t)), None)
    rest = head[len(item_type):].strip() if item_type else head
    detail = None
    if rest.startswith('('):
        depth = 0
        for i, char in enumerate(rest):
            depth += {'(': 1, ')': -1}.get(char, 0)
            if depth == 0:
                detail, rest = rest[1:i], rest[i + 1:].strip()
                break
    return {
        'tipo': item_type,
        'dettaglioTipo': detail,
        'rarita': rest.lstrip(', ').strip(),
        'sintonia': bool(attune),
        'requisitoSintonia': requirement,
    }


def build(pdf_path, edition):
    config = EDITIONS[edition]
    pdf = pdfplumber.open(pdf_path)
    HYPHENS.clear()
    HYPHENS.update(hyphenated_words(pdf, config))
    items = split_items(stream(pdf, config), config)
    records = []
    for item in items:
        name = re.sub(r'\s+', ' ', ' '.join(w['text'] for w in item['nameWords'])).strip()
        printed_type = type_line(item['typeWords'])
        blocks = []
        for block in paragraphs(item['content']):
            if block['kind'] == 'block':
                lines = [list(line) for line in block['lines']]
                is_stat = any(w['font'].startswith(config['statblock']) or f"{w['font']} {int(w['size'])}" in config['statblock']
                              for line in lines for w in line)
                if is_stat:
                    blocks.append({**statblock(lines), 'page': block['page']})
                    continue
                previous = next((b for b in reversed(blocks) if b['kind'] == 'table'), None)
                out = table_cells(lines, config, previous, block['rects'])
                if out is not None:
                    out['page'] = block['page']
                    blocks.append(out)
                continue
            label, text, bullet = render_paragraph(list(block['words']))
            out = {'kind': 'li' if bullet else 'p'}
            if label:
                out['label'] = label
            out.update(text=text, page=block['words'][0]['page'])
            blocks.append(out)
        blocks = merge_statblocks(blocks)
        blocks = merge_continued([finish_table(b) if b['kind'] == 'table' else b for b in blocks], name)
        record = {'id': slug(name), 'nome': name, 'rigaTipo': printed_type, **parse_type(printed_type),
                  'pagina': item['page'], 'pagine': sorted(item['pages']), 'blocchi': blocks}
        # Fingerprint of the printed item (name, type line, blocks) as compact JSON: tests recompute it.
        record['sourceSha256'] = sha(json.dumps([name, printed_type, blocks], ensure_ascii=False, separators=(',', ':')))
        records.append(record)
    return records


MERGED = []


def merge_statblocks(blocks):
    """The parts of one stat block are one block, placed where it starts.

    A stat block starts with the creature's name and its italic type line; a part without them goes on
    the stat block above it, also when the page prints other paragraphs in between (next column)."""
    out = []
    for block in blocks:
        starts = len(block.get('lines', [])) > 1 and block['lines'][1].startswith('*') and not block['lines'][1].startswith('**')
        if block['kind'] == 'statblock' and not starts:
            previous = next((b for b in reversed(out) if b['kind'] == 'statblock'), None)
            if previous is not None:
                previous['lines'] = previous['lines'] + block['lines']
                continue
        out.append(block)
    return out


def merge_continued(blocks, name):
    """A table printed again with the same header right after itself (next column or page) is one table."""
    out = []
    for block in blocks:
        last = out[-1] if out else None
        if block['kind'] == 'table' and last and last['kind'] == 'table' and not block['title'] \
                and block['header'] == last['header']:
            last['rows'] = last['rows'] + block['rows']
            last['intestazioniStampate'] = last.get('intestazioniStampate', 1) + 1
            if block.get('notes'):
                last['notes'] = last.get('notes', []) + block['notes']
            MERGED.append((name, block['page']))
            continue
        out.append(block)
    return out


def raw_text(pdf_path, edition):
    config = EDITIONS[edition]
    pages = config['pages']
    return subprocess.run(['pdftotext', '-raw', '-f', str(pages[0]), '-l', str(pages[-1]), pdf_path, '-'],
                          check=True, capture_output=True, text=True).stdout


def main():
    if sys.argv[1] == '--raw':
        _, _, edition, pdf_path, out = sys.argv
        Path(out).write_text(raw_text(pdf_path, edition))
        return
    edition, pdf_path, out = sys.argv[1:]
    config = EDITIONS[edition]
    if hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest() != config['sha']:
        sys.exit('PDF diverso da quello atteso')
    records = build(pdf_path, edition)
    data = {
        '_nota': f"Oggetti magici A–Z dell'SRD {'5.2.1' if edition == '2024' else '5.1'} in italiano, trascritti da scripts/transcribe-srd-magic-items.py. Testo come stampato, con impronta sha256 per oggetto.",
        'sourceUrl': config['url'],
        'sourceSha256': config['sha'],
        'oggetti': records,
    }
    Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    print(len(records), 'oggetti; attesi', config['count'])
    for name, page in MERGED:
        print('tabella continuata unita:', name, 'p.', page)


if __name__ == '__main__':
    main()
