"""Emit an apply_patch for the ten approved Italian SRD 5.1 records.

Only whitespace/HTML formatting is normalized. Variants use their 2014 bases.
Usage: python scripts/transcribe-legacy-monsters.py /path/to/SRD_CC_v5.1_IT.pdf
"""
import hashlib
import json
import re
import sys
from pathlib import Path
from fractions import Fraction

import fitz

pdf = Path(sys.argv[1])
doc = fitz.open(pdf)


def column(page, side):
    p = doc[page - 1]
    x0, x1 = (0, p.rect.width / 2) if side == 0 else (p.rect.width / 2, p.rect.width)
    return re.sub(r"\s+", " ", p.get_text(clip=fitz.Rect(x0, 30, x1, p.rect.height - 50))).strip()


def between(text, start, end=None):
    text = text[text.index(start):]
    return text[:text.index(end)].strip() if end else text


def html(text, titles):
    for title in sorted(titles, key=len, reverse=True):
        text = text.replace(title, '<br><br><strong>' + title + '</strong>', 1)
    for label in ['Attacco con arma da mischia o a distanza:', 'Attacco con arma da mischia:', 'Attacco con arma a distanza:', 'Colpito:']:
        text = text.replace(label, '<em>' + label + '</em>')
    return text.removeprefix('<br><br>').strip()


empty = {key: '' for key in ['tiri_salvezza', 'abilita', 'vulnerabilita', 'resistenze', 'immunita_danni', 'immunita_condizioni', 'linguaggi', 'tratti', 'azioni', 'reazioni', 'azioni_leggendarie', 'descrizione']}
records = []


def record(id, name, page, source, kind, size, alignment, cr, xp, ac, hp, speed, scores, senses, languages, traits, actions, trait_titles, action_titles, **other):
    monster = dict(empty, id=id, nome=name, tipo=kind, taglia=size, allineamento=alignment,
                   grado_sfida=cr, px=xp, classe_armatura=ac, punti_ferita=hp, velocita=speed,
                   sensi=senses, linguaggi=languages, gs_num=float(Fraction(cr)),
                   tratti=html(traits, trait_titles), azioni=html(actions, action_titles), **other)
    monster.update(zip(['forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma'], scores))
    records.append(dict(page=page, sourceName=name, sourceText=source,
                        sourceSha256=hashlib.sha256(source.encode()).hexdigest(), monster=monster))


source = between(column(347, 1), 'Duergar') + ' ' + between(column(348, 0), 'Invisibilità', 'Mostri (E)')
traits, actions = between(source, 'Resilienza del duergar.').split(' Azioni ', 1)
record('duergar', 'Duergar', 347, source, 'Umanoide (nano)', 'Media', 'legale malvagio', '1', '200', '16 (corazza a scaglie, scudo)', '26 (4d8 + 8)', '7,5 m', [14,11,14,11,10,9], 'Percezione passiva 10, scurovisione 36 m', 'Nanico, Sottocomune', traits, actions, ['Resilienza del duergar.', 'Sensibilità al sole.'], ['Ingrandire (ricarica dopo un riposo breve o lungo).', 'Piccone da guerra.', 'Giavellotto.', 'Invisibilità (ricarica dopo un riposo breve o lungo).'], resistenze='veleno')
records[-1]['pages'] = [347,348]

source = between(column(350,0) + ' ' + column(350,1), 'Elfo drow', 'Ettercap')
traits, actions = between(source, 'Incantesimi innati.').split(' Azioni ', 1)
record('elfo-drow', 'Elfo drow', 350, source, 'Umanoide (elfo)', 'Media', 'neutrale malvagio', '1/4', '50', '15 (giaco di maglia)', '13 (3d8)', '9 m', [10,14,10,11,11,12], 'Percezione passiva 12, scurovisione 36 m', 'Elfico, Sottocomune', traits, actions, ['Incantesimi innati.', 'Retaggio fatato.', 'Sensibilità al sole.'], ['Spada corta.', 'Balestra a mano.'], abilita='Furtività +4, Percezione +2')

source = between(column(359,1), 'Gnomo delle profondità (svirfneblin)')
traits, actions = between(source, 'Astuzia gnomesca.').split(' Azioni ', 1)
record('gnomo-delle-profondita-svirfneblin', 'Gnomo delle profondità (svirfneblin)', 359, source, 'Umanoide (gnomo)', 'Piccola', 'neutrale buono', '1/2', '100', '15 (giaco di maglia)', '16 (3d6 + 6)', '6 m', [15,14,14,12,10,9], 'Percezione passiva 12, scurovisione 36 m', 'Gnomesco, Sottocomune, Terran', traits, actions, ['Astuzia gnomesca.', 'Incantesimi innati.', 'Mimetizzazione rocciosa.'], ['Piccone da guerra.', 'Dardo avvelenato.'], abilita='Furtività +4, Indagare +3, Percezione +2')

source = between(column(371,0), 'Lucertoloide', 'Mostri (M)')
traits, actions = between(source, 'Apnea.').split(' Azioni ',1)
record('lucertoloide', 'Lucertoloide', 371, source, 'Umanoide (lucertoloide)', 'Media', 'neutrale', '1/2', '100', '15 (armatura naturale, scudo)', '22 (4d8 + 4)', '9 m, nuotare 9 m', [15,10,13,7,12,7], 'Percezione passiva 13', 'Draconico', traits, actions, ['Apnea.'], ['Multiattacco.', 'Mazza pesante.', 'Morso.', 'Scudo chiodato.', 'Giavellotto.'], abilita='Furtività +4, Percezione +3, Sopravvivenza +5')

source = between(column(387,0), 'Orco', 'Orsogufo')
traits, actions = between(source, 'Aggressivo.').split(' Azioni ',1)
record('orco', 'Orco', 387, source, 'Umanoide (orco)', 'Media', 'caotico malvagio', '1/2', '100', '13 (armatura di pelle)', '15 (2d8 + 6)', '9 m', [16,12,16,7,11,10], 'Percezione passiva 10, scurovisione 18 m', 'Comune, Orchesco', traits, actions, ['Aggressivo.'], ['Ascia bipenne.', 'Giavellotto.'], abilita='Intimidire +2')

base = between(column(436,1), 'Sciame di insetti', 'Sciame di pipistrelli')
variants = between(column(436,0) + ' ' + column(436,1), 'Variante: sciami di insetti', 'Sciame di insetti')
base_traits, actions = between(base, 'Sciame.').split(' Azioni ',1)
variant_specs = [
    ('scarabei', '6 m, scalare 6 m, scavare 1,5 m', between(variants, 'Sciame di scarabei.', 'Sciame di vespe.'), []),
    ('millepiedi', '6 m, scalare 6 m', between(variants, 'Sciame di millepiedi.', 'Sciame di ragni.'), []),
    ('ragni', '6 m, scalare 6 m', between(variants, 'Sciame di ragni.', 'Sciame di scarabei.'), ['Arrampicatele.', 'Movimenti del ragno.', 'Percezione della ragnatela.']),
    ('vespe', '1,5 m, volare 9 m', between(variants, 'Sciame di vespe.'), []),
]
for suffix, speed, variant, titles in variant_specs:
    name = 'Sciame di ' + suffix
    record('sciame-di-' + suffix, name, 436, base + ' ' + variant, 'Sciame di bestie Minuscole', 'Media', 'senza allineamento', '1/2', '100', '12 (armatura naturale)', '22 (5d8)', speed, [3,13,10,1,7,1], 'Percezione passiva 8, vista cieca 3 m', '—', base_traits + ' ' + variant, actions, ['Sciame.', name + '.'] + titles, ['Morsi.'], resistenze='contundenti, perforanti, taglienti', immunita_condizioni='affascinato, afferrato, paralizzato, pietrificato, prono, spaventato, stordito, trattenuto')
    records[-1]['adaptation'] = 'Scheda base Sciame di insetti (2014) con le sole modifiche della variante SRD 5.1; intestazione autonoma e velocità aggiornate secondo la variante.'

base = between(column(442,1), 'Topo gigante')
variant = between(column(443,0), 'Variante: topi giganti contagiosi', 'Vespa gigante')
traits = between(base, 'Olfatto acuto.', 'Azioni')
actions = between(variant, 'Morso.')
record('topo-gigante-contagioso', 'Topo gigante contagioso', 443, base + ' ' + variant, 'Bestia', 'Piccola', 'senza allineamento', '1/8', '25', '12', '7 (2d6)', '9 m', [7,15,11,2,10,4], 'Percezione passiva 10, scurovisione 18 m', '—', traits, actions, ['Olfatto acuto.', 'Tattiche del branco.'], ['Morso.'])
records[-1]['pages'] = [442,443]
records[-1]['adaptation'] = 'Scheda base Topo gigante (2014) con l’azione Morso sostituita dalla variante contagiosa SRD 5.1; intestazione autonoma.'

data = dict(sourceUrl='https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1_IT.pdf',
            sourceSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
            document='SRD 5.1', edition='2014', license='CC BY 4.0',
            normalization='Spazi e a capo normalizzati; titoli e attacchi formattati in HTML. Taglie ricondotte alle categorie del filtro. Varianti applicate esclusivamente alle basi SRD 5.1 del 2014.', records=records)
print('*** Begin Patch')
print('*** Add File: ' + str(Path(__file__).resolve().parents[1] / 'lib/data/srd-monsters-5.1-it.json'))
for line in json.dumps(data, ensure_ascii=False, indent=2).splitlines():
    print('+' + line)
print('*** End Patch')
