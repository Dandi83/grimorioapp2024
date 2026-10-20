"""Compare transcribed SRD 5.1 Italian stat blocks with the English 5e-bits database.

Checks numbers only (AC, HP, challenge, XP, ability scores) and the list of creatures;
the Italian PDF stays the source of every text.

Usage:
  python scripts/check-srd51-against-5e-database.py transcribed.json 5e-SRD-Monsters.json [ids...]
The English file: https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Monsters.json
"""
import json
import re
import sys
from fractions import Fraction

ABILITIES = ['forza', 'destrezza', 'costituzione', 'intelligenza', 'saggezza', 'carisma']
EN_ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']


def first_int(text):
    match = re.search(r'\d+', text or '')
    return int(match.group()) if match else None


def italian_numbers(monster):
    return {
        'CA': first_int(monster['classe_armatura']),
        'PF': first_int(monster['punti_ferita']),
        'GS': monster['grado_sfida'],
        'PE': int(monster['px'].replace('.', '')) if monster['px'] else None,
        'caratteristiche': tuple(monster[a] for a in ABILITIES),
    }


def english_numbers(entry):
    cr = entry['challenge_rating']
    return {
        # Every listed armor class counts ("15 natural, 17 with shield"): the Italian line prints the final one.
        'CA': tuple(a['value'] for a in entry['armor_class']),
        'PF': entry['hit_points'],
        'GS': str(Fraction(cr).limit_denominator()) if cr else '0',
        'PE': entry['xp'],
        'caratteristiche': tuple(entry[a] for a in EN_ABILITIES),
    }


def main():
    records = json.load(open(sys.argv[1]))['records']
    english = json.load(open(sys.argv[2]))
    only = set(sys.argv[3:])
    unused = {entry['index']: english_numbers(entry) for entry in english}
    names = {entry['index']: entry['name'] for entry in english}
    report = {'matched': [], 'differences': [], 'unmatched_italian': []}
    for record in records:
        monster = record['monster']
        if only and monster['id'] not in only:
            continue
        mine = italian_numbers(monster)
        # The same creature has the same six ability scores; HP and challenge break ties.
        candidates = [k for k, v in unused.items() if v['caratteristiche'] == mine['caratteristiche']]
        if len(candidates) > 1:
            candidates = [k for k in candidates if unused[k]['PF'] == mine['PF']] or candidates
        if len(candidates) > 1:
            candidates = [k for k in candidates if unused[k]['GS'] == mine['GS']] or candidates
        if not candidates:
            # Fall back to HP + challenge: a typo in one score must still be reported, not hidden.
            candidates = [k for k, v in unused.items() if v['PF'] == mine['PF'] and v['GS'] == mine['GS']]
        if len(candidates) != 1:
            report['unmatched_italian'].append({'id': monster['id'], 'candidates': candidates})
            continue
        key = candidates[0]
        theirs = unused.pop(key)
        diffs = {field: {'it': mine[field], 'en': theirs[field]} for field in mine
                 if (mine[field] not in theirs[field] if field == 'CA' else mine[field] != theirs[field])}
        entry = {'id': monster['id'], 'nome': monster['nome'], 'en': names[key], 'index': key}
        report['matched'].append(entry)
        if diffs:
            report['differences'].append({**entry, 'diff': diffs})
    if not only:
        report['unmatched_english'] = sorted(unused)
    json.dump(report, sys.stdout, ensure_ascii=False, indent=1)
    print()


if __name__ == '__main__':
    main()
