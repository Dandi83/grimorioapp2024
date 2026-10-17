import importlib.util,json,hashlib,re,html
from pathlib import Path
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('source',R/'scripts/check-srd-monsters-source.py');source=importlib.util.module_from_spec(spec);spec.loader.exec_module(source)
p=R/'lib/data/srd-animals-5.2.1-it.json';assert p.exists(),'Missing 95 official animals'
d=json.loads(p.read_text());assert len(d['records'])==95
idx=json.loads((R/'tests/fixtures/srd-animals-index.json').read_text());assert len(idx)==95
assert sorted((r['sourceName'],r['page']) for r in d['records'])==sorted((x['name'],x['page']) for x in idx)
refs=source.reference('/tmp/grimorio-srd-it.pdf',385,405)
for r,e in zip(d['records'],refs):
 assert r['sourceName']==e['name'] and r['page']==e['page']
 assert r['sourceSha256']==hashlib.sha256(source.compact(e['text']).encode()).hexdigest()
 source_text=e['text'].replace('−','-')
 abilities=re.findall(r'\b(For|Des|Cos|Int|Sag|Car)\s*(\d+)\s*([+-]\d+)\s*([+-]?\d+)',source_text)
 assert len(abilities)==6,r['sourceName']
 for key,(_,score,mod,save) in zip(['forza','destrezza','costituzione','intelligenza','saggezza','carisma'],abilities):assert r['monster'][key]==int(score),r['sourceName']
 assert r['monster']['tiri_salvezza']==', '.join(f'{label} {int(save):+d}' for label,score,mod,save in abilities),r['sourceName']
 body=html.unescape(re.sub('<[^>]+>','',''.join(r['monster'].get(k,'') for k in ['tratti','azioni','azioni_bonus','reazioni','azioni_leggendarie'])))
 expected=re.split(r'GS [\d/]+ \(PE .*?; BC [+-]\d+\)',e['text'].replace('−','-'),maxsplit=1)[1]
 expected=re.sub(r'\b(?:Azioni leggendarie|Azioni bonus|Azioni|Reazioni|Tratti)\b','',expected)
 assert source.compact(body)==source.compact(expected),r['sourceName']
 assert source.compact(r['monster']['sottotitolo_fonte']) in source.compact(e['text']),r['sourceName']
print('[animals] 95 unique official animals, printed index, source hashes and complete rendered rules verified.')
