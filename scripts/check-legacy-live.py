"""Read-only HTTP verification of the approved Legacy preview."""
import concurrent.futures
import json
import re
import sys
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'lib/data/srd-monsters-5.1-it.json').read_text())
base = sys.argv[1].rstrip('/')


def fetch(path):
    with urllib.request.urlopen(base + path, timeout=45) as response:
        assert response.status == 200, path
        return BeautifulSoup(response.read().decode(), 'html.parser')


def norm(text):
    return re.sub(r'\s+', '', text).casefold()


catalog = fetch('/bestiario')
animals = fetch('/bestiario?raccolta=animali')
for page in [catalog, animals]:
    assert page.h1.get_text() == 'Bestiario (340)'
assert len(catalog.select('a[href^="/mostro/"]')) == 240
assert len(animals.select('a[href^="/mostro/"]')) == 100
catalog_ids = {link['href'] for link in catalog.select('a[href^="/mostro/"]')}
animal_ids = {link['href'] for link in animals.select('a[href^="/mostro/"]')}
assert not catalog_ids & animal_ids
assert len(catalog_ids | animal_ids) == 340
badges = catalog.select('[data-monster-provenance="verified"]') + animals.select('[data-monster-provenance="verified"]')
assert len(badges) == 340
assert sum('D&D 2014' in badge.get_text() for badge in badges) == 10
assert sum('2024' in badge.get_text() for badge in badges) == 330
assert not catalog.select('[data-monster-provenance="unverified"]')
assert not catalog.select('a a')
for id in ['oggetto-animato', 'cavalcatura-ultraterrena', 'insetto-gigante', 'spirito-draconico', 'mosca-gigante', 'avatar-della-morte']:
    assert not catalog.select('a[href="/mostro/' + id + '"]'), id


def check(record):
    monster = record['monster']
    page = fetch('/mostro/' + monster['id'])
    article = page.article
    assert article.h1.get_text() == monster['nome']
    badge = article.select_one('a[data-monster-provenance="verified"]')
    assert badge and 'D&D 2014' in badge.get_text()
    assert badge['href'] == data['sourceUrl'] + '#page=' + str(record['page'])
    assert badge['target'] == '_blank'
    assert not article.select('a[href^="/manuale/condizioni-"], a[href^="/spell/"]')
    assert article.select('[data-damage-type]')
    sections = {section.h2.get_text().strip().lower(): section for section in article.find_all('section') if section.h2}
    for field, title in [('tratti', 'tratti'), ('azioni', 'azioni')]:
        section = BeautifulSoup(str(sections[title]), 'html.parser')
        section.h2.extract()
        expected = BeautifulSoup(monster[field], 'html.parser').get_text()
        assert norm(section.get_text()) == norm(expected), (monster['id'], field)
    footer = article.select_one('aside[aria-label="Fonte della scheda"]')
    assert 'Testo integrale: SRD 5.1 italiano' in footer.get_text()
    assert 'SRD 5.2.1' not in footer.get_text()
    assert footer.select_one('a[href="/fonti"]')
    if record.get('adaptation'):
        assert record['adaptation'] in footer.get_text()
    return monster['id']


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for id in pool.map(check, data['records']):
        print('PASS:', id, flush=True)

for id in ['lich', 'aboleth', 'lupo', 'drago-rosso-adulto']:
    page = fetch('/mostro/' + id)
    badge = page.article.select_one('a[data-monster-provenance="verified"]')
    assert badge and '2024' in badge.get_text() and '5.2.1' in badge.get_text()
    print('PASS existing 2024:', id, flush=True)
sources = fetch('/fonti')
assert 'Questo lavoro include materiale del System Reference Document 5.1' in sources.get_text()
assert sources.select_one('a[href="' + data['sourceUrl'] + '"]')
assert sources.select_one('a[href="https://creativecommons.org/licenses/by/4.0/legalcode.it"]')
print('PASS: catalog 340; 10 D&D 2014, 330 unchanged edition badges; all new actions/traits and source links; 4 existing routes; attribution. Visual/mobile QA not performed by this HTTP check.', flush=True)
