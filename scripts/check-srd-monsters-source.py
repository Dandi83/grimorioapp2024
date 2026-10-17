"""Independent PDF reference checks; never accepts regenerated fixtures silently."""
import argparse, hashlib, json, re
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
SHA='a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718'
def compact(t):
    return re.sub(r'\s+','',t.replace('\xad','').replace('−','-')).casefold()
def reference(pdf):
    doc=fitz.open(pdf); entries=[]; current=None
    for page in range(294,385):
        p=doc[page-1]
        # Text blocks supply title boundaries; words provide independent text extraction.
        lines=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[])]
        for col in (0,1):
            titles=sorted([l for l in lines if (l['bbox'][0]<300)==(col==0) and any(14.7<s['size']<14.9 for s in l['spans'])],key=lambda l:l['bbox'][1])
            headings=[l for l in lines if (l['bbox'][0]<300)==(col==0) and any(s['size']>=17 for s in l['spans'])]
            words=p.get_text('words',clip=fitz.Rect(55 if col==0 else 305,30,300 if col==0 else 555,735))
            # Use positions to assign words, omitting decorative group headings and footer.
            events=[(l['bbox'][1],'title',l) for l in titles]+[(w[1],'word',w) for w in words]
            events.sort(key=lambda x:(x[0],0 if x[1]=='title' else 1))
            for y,kind,obj in events:
                if kind=='title':
                    current={'name':''.join(s['text'] for s in obj['spans']),'page':page,'words':[]};entries.append(current)
                elif current:
                    x0,y0,x1,y1,word,*_=obj
                    if any(h['bbox'][0]-1<=x0<h['bbox'][2] and abs(h['bbox'][1]-y0)<2 for h in headings+titles):continue
                    if y0>735:continue
                    current['words'].append((page,col,y0,x0,word))
    for e in entries:
        rows=[]
        for w in sorted(e.pop('words'),key=lambda w:(w[0],w[1],w[2],w[3])):
            if rows and w[:2]==rows[-1][0][:2] and abs(w[2]-rows[-1][0][2])<4: rows[-1].append(w)
            else: rows.append([w])
        e['text']=' '.join(w[4] for row in rows for w in sorted(row,key=lambda w:w[3]))
    return entries

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--pdf',required=True);args=parser.parse_args()
    assert hashlib.sha256(Path(args.pdf).read_bytes()).hexdigest()==SHA
    path=ROOT/'lib/data/srd-monsters-5.2.1-it.json'
    assert path.exists(),'Missing dataset: 235 complete monster records required'
    data=json.loads(path.read_text());rows=data['records'];assert len(rows)==235
    assert len({r['monster']['id'] for r in rows})==235
    ref=reference(args.pdf)
    proofs=json.loads((ROOT/'tests/fixtures/srd-monsters-source-checks.json').read_text())
    assert proofs==[dict(name=e['name'],page=e['page'],sha256=hashlib.sha256(compact(e['text']).encode()).hexdigest()) for e in ref]
    assert len(ref)==235
    assert [(r['sourceName'],r['page']) for r in rows]==[(e['name'],e['page']) for e in ref]
    # Independent printed table of contents, not generated from the stat blocks.
    idx=json.loads((ROOT/'tests/fixtures/srd-monsters-index.json').read_text())
    assert sorted((r['sourceName'],r['page']) for r in rows)==sorted((i['name'],i['page']) for i in idx)
    for r,e in zip(rows,ref):
        m=r['monster'];name=r['sourceName']
        assert r['sourceSha256']==hashlib.sha256(compact(e['text']).encode()).hexdigest(),f'{name}: PDF source differs'
        assert compact(r['sourceText'])==compact(e['text']),f'{name}: missing or reordered PDF text'
        assert m['nome']==name and any(m.get(k) for k in ['azioni','tratti','reazioni']),f'{name}: empty name/actions'
        source=e['text'].replace('−','-').replace('\xad','')
        abilities=re.findall(r'\b(For|Des|Cos|Int|Sag|Car)\s*(\d+)\s*([+-]\d+)\s*([+-]?\d+)',source)
        assert len(abilities)==6,(name,abilities)
        saves=[]
        for key,(label,score,mod,save) in zip(['forza','destrezza','costituzione','intelligenza','saggezza','carisma'],abilities):
            assert m[key]==int(score),(name,key)
            assert (int(score)-10)//2==int(mod),(name,'printed modifier',mod)
            saves.append(f'{label} {int(save):+d}')
        assert m['tiri_salvezza']==', '.join(saves),(name,'saving throws')
        header=re.split(r'GS [\d/]+ \(PE .*?; BC [+-]\d+\)',source,maxsplit=1)[0]
        labels={'PF':'punti_ferita','Velocità':'velocita','Abilità':'abilita','Vulnerabilità':'vulnerabilita','Resistenze':'resistenze','Immunità':'immunita','Sensi':'sensi','Lingue':'linguaggi','Attrezzatura':'attrezzatura'}
        for label,key in labels.items():
            pat=r'\b'+label+r'\s+(.*?)(?=\b(?:'+ '|'.join(labels)+r'|MOD SALV)\s|$)'
            match=re.search(pat,header)
            value=match[1] if match else ''
            assert compact(m.get(key,''))==compact(value),(name,key,m.get(key),value)
        match=re.search(r'CA (.*?) Iniziativa (.*?)(?= PF)',header)
        assert compact(m['classe_armatura'])==compact(match[1]),name
        assert compact(m['iniziativa'])==compact(match[2]),name
        # Every body character must survive in rendered fields, independent of HTML styling.
        body=re.sub('<[^>]+>','', ''.join(m.get(k,'') for k in ['tratti','azioni','azioni_bonus','reazioni','azioni_leggendarie']))
        import html
        body=html.unescape(body)
        source_body=re.split(r'GS [\d/]+ \(PE .*?; BC [+-]\d+\)',e['text'],maxsplit=1)[1]
        expected=re.sub(r'\b(?:Azioni leggendarie|Azioni bonus|Azioni|Reazioni|Tratti)\b','',source_body)
        assert compact(body)==compact(expected),f'{name}: body text omitted by field parser'
        assert not any(x in body for x in ['MOD SALV','System Reference Document']),name
        assert all(isinstance(m[k],int) and 1<=m[k]<=30 for k in ['forza','destrezza','costituzione','intelligenza','saggezza','carisma']),name
        assert len(re.findall(r'(?:For|Des|Cos|Int|Sag|Car) [+-]\d+',m['tiri_salvezza']))==6,name
    sample=json.loads((ROOT/'lib/data/srd-monster-sample.json').read_text())['monster']
    assert rows[0]['monster']==sample,'Approved Aboleth must remain identical'
    print('[source] 235 unique blocks, independent printed index, full PDF text hashes, rendered body coverage, abilities and unchanged Aboleth verified.')
if __name__=='__main__':main()
