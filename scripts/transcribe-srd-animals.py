import importlib.util,fitz,json,re,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,R/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
extract=module('extract','scripts/transcribe-srd-monsters.py');source=module('source','scripts/check-srd-monsters-source.py')
doc=fitz.open('/tmp/grimorio-srd-it.pdf');refs=source.reference('/tmp/grimorio-srd-it.pdf',385,405);records=[]
for block,ref in zip(extract.blocks(doc,385,405),refs):
 m,body=extract.parse(block)
 records.append(dict(page=block['page'],sourceName=block['name'],sourceText=ref['text'],sourceSha256=hashlib.sha256(source.compact(ref['text']).encode()).hexdigest(),bodyText=body,monster=m))
assert len(records)==95
idx=[]
for p in doc[:4]:
 for line in p.get_text().splitlines():
  match=re.fullmatch(r'(.+?)\.{2,}\s*(\d+)',line.strip())
  if match and 385<=int(match[2])<=405 and match[1]!='Animali':idx.append(dict(name=extract.norm(match[1]),page=int(match[2])))
(R/'tests/fixtures/srd-animals-index.json').write_text(json.dumps(idx,ensure_ascii=False,indent=2)+'\n')
(R/'lib/data/srd-animals-5.2.1-it.json').write_text(json.dumps(dict(sourceUrl='https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf',sourceSha256=extract.SHA,records=records),ensure_ascii=False,indent=2)+'\n')
print('Animals',len(records),'printed index',len(idx))
