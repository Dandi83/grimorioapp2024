import json,importlib.util
from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'lib/data/srd-manual-5.2.1-it.json'
assert p.exists(),'Missing official manual entries, conditions, equipment and characters'
spec=importlib.util.spec_from_file_location('extract',R/'scripts/transcribe-manual.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
d=json.loads(p.read_text());entries=d['entries'];assert len({e['id'] for e in entries})==len(entries)
assert len([e for e in entries if e['category']=='condizioni'])==15
assert len([e for e in entries if e['subgroup']=='Classi'])==12
assert len([e for e in entries if e['subgroup']=='Background'])==4
assert len([e for e in entries if e['subgroup']=='Specie'])==9
for e in entries:
 assert e['blocks'] and all(b['text'].strip() for b in e['blocks']),e['id']
 for b in e['blocks']:assert m.proof(b['text'])==b['sourceHash'],(e['id'],'source block chars')
# Printed species tables must belong to the species named by the source caption.
for caption,owner,page in [('Retaggi immondi','personaggi-tiefling',97),('Antenati draconici','personaggi-dragonide',94),('Lignaggi elfici','personaggi-elfo',95)]:
 matches=[(e,b) for e in entries for b in e['blocks'] if b['kind']=='table' and caption in b['text']]
 assert len(matches)==1 and matches[0][0]['id']==owner and matches[0][1]['page']==page,(caption,'species table ownership',[(e['id'],b['page']) for e,b in matches])
# Re-extract PDF and compare blocks: no changes to rule text or table cell values.
for first,last,selected in [(21,31,[e for e in entries if e['subgroup']=='Creazione']), (32,92,[e for e in entries if e['subgroup']=='Classi']), (93,97,[e for e in entries if e['subgroup'] in ['Origini','Background','Specie']]), (98,100,[e for e in entries if e['subgroup']=='Talenti']), (101,117,[e for e in entries if e['category']=='equipaggiamento'])]:
 actual=''.join(b['text'] for e in selected for b in e['blocks']);source=m.extract(first,last)
 # Top-level entry headings become the page title and are not duplicated in body.
 for e in selected:actual+=e['title'] if any(b['kind']=='heading' and b['text']==e['title'] for b in source) and not any(b['kind']=='heading' and b['text']==e['title'] for b in e['blocks']) else ''
 assert m.chars(actual)==m.chars(''.join(b['text'] for b in source if not (b['kind']=='heading' and b.get('size',0)>=26 and selected[0]['subgroup'] not in ['Creazione','Talenti','Origini']))),(first,last,'coverage')
glossary=m.extract(202,219)
for entry in [e for e in entries if e['category']=='condizioni']:
 start=next(i for i,b in enumerate(glossary) if b['kind']=='heading' and b['text']==entry['title']+' [condizione]')
 stop=next((i for i in range(start+1,len(glossary)) if glossary[i]['kind']=='heading' and abs(glossary[i].get('size',0)-12)<.2),len(glossary))
 assert entry['blocks']==glossary[start+1:stop],entry['title']
print('[manual] 15 conditions, 12 classes, 9 species, 4 backgrounds, equipment, original table cells and source coverage verified.')
