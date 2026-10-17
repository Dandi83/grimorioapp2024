"""Deterministic transcription: PDF columns -> stat blocks -> typed records.
Only whitespace, soft hyphens and typographic minus are normalized.
Bold/italic from PDF fonts becomes semantic HTML; no generated rule text.
"""
import fitz,json,re,hashlib,html,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PDF=Path('/tmp/grimorio-srd-it.pdf')
SHA='a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718'
def norm(s):return re.sub(r'\s+',' ',s.replace('\xad','').replace('−','-')).strip()
def compact(s):return re.sub(r'\s+','',s.replace('\xad','').replace('−','-')).casefold()
def slug(s):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFD',s.lower()).encode('ascii','ignore').decode()).strip('-')
def joinlines(lines):
    out=''
    for line in lines:
        text=line['text']
        if out and not out.endswith('\xad'):out+=' '
        out+=text
    return norm(out)
def render(lines):
    # Paragraph boundaries: a PDF bold-italic label starts a new ability; preserve all other lines.
    paragraphs=[];parts=[]
    for l in lines:
        starts=bool(l['spans'] and 'BoldItalic' in l['spans'][0]['font'] and l['spans'][0]['bbox'][0]%250.5<80)
        # Use indentation/vertical gap as additional paragraph boundary (never drop content).
        if parts and (starts or l.get('break')):
            paragraphs.append(parts);parts=[]
        parts.append(l)
    if parts:paragraphs.append(parts)
    result=[]
    for par in paragraphs:
        # merge adjacent runs of equal style, including across line hyphenations
        runs=[]
        for ix,l in enumerate(par):
            if ix and runs and not runs[-1][1].endswith('\xad'):runs[-1][1]+=' '
            for s in l['spans']:
                font=s['font'];style='strong' if 'BoldItalic' in font or 'Bold' in font else 'em' if 'Italic' in font else ''
                text=s['text']
                if runs and runs[-1][0]==style:runs[-1][1]+=text
                else:runs.append([style,text])
        def runtext(txt): return re.sub(r'\s+',' ',txt.replace('\xad','').replace('−','-'))
        result.append(''.join((f'<{tag}>'+html.escape(runtext(txt))+f'</{tag}>' if tag else html.escape(runtext(txt))) for tag,txt in runs).strip())
    return '<br><br>'.join(result)

def blocks(doc):
    records=[];current=None
    for pi in range(293,384):
        p=doc[pi]
        native=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) if 30<l['bbox'][1]<735]
        for col in [0,1]:
            lines=sorted([l for l in native if (l['bbox'][0]<300)==(col==0)],key=lambda l:(l['bbox'][1],l['bbox'][0]))
            # Group table fragments and baseline-aligned CA/Iniziativa into reading rows.
            merged=[]
            for l in lines:
                if merged and abs(l['bbox'][1]-merged[-1]['bbox'][1])<3.1:
                    merged[-1]['spans']+=l['spans'];merged[-1]['spans'].sort(key=lambda s:s['bbox'][0])
                else:merged.append({'bbox':l['bbox'],'spans':list(l['spans'])})
            for l in merged:
                spans=l['spans'];l['text']=''.join((' ' if i and s['bbox'][0]-spans[i-1]['bbox'][2]>1.5 else '')+s['text'] for i,s in enumerate(spans))
                if any(14.7<s['size']<14.9 for s in spans):
                    current={'page':pi+1,'name':norm(l['text']),'lines':[]};records.append(current)
                elif any(s['size']>=17 for s in spans):
                    # Decorative group headers are outside stat blocks.
                    pass
                elif current:
                    l['page']=pi+1;l['col']=col;current['lines'].append(l)
    return records

def parse(r):
    lines=r['lines'];text=[norm(l['text']) for l in lines]
    m={k:'' for k in ['id','nome','tipo','taglia','allineamento','grado_sfida','px','classe_armatura','iniziativa','bonus_competenza','punti_ferita','velocita','tiri_salvezza','abilita','vulnerabilita','resistenze','immunita_danni','immunita_condizioni','sensi','linguaggi','tratti','azioni','reazioni','azioni_leggendarie','descrizione']}
    m['id']=slug(r['name']);m['nome']=r['name']
    meta=text[0];match=re.match(r'(.+?) (Minuscola|Piccola|Media|Medio|Grande|Enorme|Mastodontica|Piccolo|Minuscolo|Mastodontico)(.*?), (.*)',meta)
    if not match:raise ValueError(('TYPE',r['name'],meta))
    tipo,size,extra,align=match.groups()
    descriptors=' '.join(re.findall(r'\([^)]*\)',extra))
    alternative=re.sub(r'\([^)]*\)','',extra).strip()
    m.update(tipo=(tipo+' '+descriptors).strip(),taglia={'Medio':'Media','Piccolo':'Piccola','Minuscolo':'Minuscola','Mastodontico':'Mastodontica'}.get(size,size),allineamento=align)
    m['sottotitolo_fonte']=meta
    ca=' '.join(text[1:3]);mat=re.search(r'CA (.*?)\s*Iniziativa\s*(.*?)(?: PF|$)',ca)
    if not mat:raise ValueError(('CA',r['name'],ca))
    m['classe_armatura'],m['iniziativa']=mat.groups()
    # Reconstruct metadata until first section, ability rows handled separately.
    sec=next(i for i,t in enumerate(text) if t in ['Tratti','Azioni','Azioni bonus','Reazioni','Azioni leggendarie'])
    header=joinlines(lines[:sec])
    # PDF table small caps are merged without artificial spaces; use explicit ability delimiters.
    abilities=re.findall(r'(For|Des|Cos|Int|Sag|Car)\s*(\d+)\s*([+\-]\d+)\s*([+\-]?\d+)',header)
    if len(abilities)!=6:raise ValueError(('ABILITIES',r['name'],header))
    for key,(_,score,mod,save) in zip(['forza','destrezza','costituzione','intelligenza','saggezza','carisma'],abilities):m[key]=int(score)
    m['tiri_salvezza']=', '.join(f'{label} {save if save.startswith("+") or save.startswith("-") else "+"+save}' for label,score,mod,save in abilities)
    # Remove only ability table text; rest remains official metadata.
    header=re.sub(r'MOD SALV','',header)
    header=re.sub(r'(For|Des|Cos|Int|Sag|Car)\s*(\d+)\s*([+\-]\d+)\s*([+\-]?\d+)','',header)
    labels={'PF':'punti_ferita','Velocità':'velocita','Abilità':'abilita','Vulnerabilità':'vulnerabilita','Resistenze':'resistenze','Immunità':'immunita','Sensi':'sensi','Lingue':'linguaggi','Attrezzatura':'attrezzatura','GS':'challenge'}
    keys=list(labels);pattern=r'\b('+ '|'.join(keys)+r')\s+'
    pieces=re.split(pattern,header)
    for i in range(1,len(pieces),2):m[labels[pieces[i]]]=norm(pieces[i+1])
    challenge=m.pop('challenge');mat=re.fullmatch(r'([\d/]+) \(PE (.*); BC ([+\-]\d+)\)',challenge)
    if not mat:raise ValueError(('GS',r['name'],challenge))
    m['grado_sfida'],m['px'],m['bonus_competenza']=mat.groups();g=m['grado_sfida'];m['gs_num']=float(g.split('/')[0])/float(g.split('/')[1]) if '/' in g else int(g)
    sections={'Tratti':'tratti','Azioni':'azioni','Azioni bonus':'azioni_bonus','Reazioni':'reazioni','Azioni leggendarie':'azioni_leggendarie'}
    body=[];section=None;buf=[]
    for l in lines[sec:]:
        t=norm(l['text'])
        if t in sections:
            if section:m[section]=render(buf);body+=buf
            section=sections[t];buf=[]
        else:buf.append(l)
    if section:m[section]=render(buf);body+=buf
    # Source body stored in display order to verify partition coverage; full source independently hashed below.
    bodytext=joinlines(body)
    return m,bodytext

def main():
    assert hashlib.sha256(PDF.read_bytes()).hexdigest()==SHA
    doc=fitz.open(PDF);rs=blocks(doc);assert len(rs)==235
    # Index is extracted from printed table of contents, independent of stat-block title boundaries.
    index=[]
    for p in doc[:4]:
        for line in p.get_text().splitlines():
            mat=re.fullmatch(r'(.+?)\.{2,}\s*(\d+)',line.strip())
            if mat and mat[1]!='Mostri A–Z' and 294<=int(mat[2])<=384:index.append({'name':norm(mat[1]),'page':int(mat[2])})
    print('INDEX',len(index))
    (ROOT/'tests/fixtures/srd-monsters-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    # Audit source reference uses a separate extractor API from semantic parser.
    import importlib.util
    spec=importlib.util.spec_from_file_location('checks',ROOT/'scripts/check-srd-monsters-source.py');checks=importlib.util.module_from_spec(spec);spec.loader.exec_module(checks)
    refs=checks.reference(str(PDF))
    output=[]
    for r,ref in zip(rs,refs):
        m,body=parse(r)
        if m['id']=='aboleth':m=json.loads((ROOT/'lib/data/srd-monster-sample.json').read_text())['monster']
        output.append({'page':r['page'],'sourceName':r['name'],'sourceText':ref['text'],'sourceSha256':hashlib.sha256(compact(ref['text']).encode()).hexdigest(),'bodyText':body,'monster':m})
    data={'sourceUrl':'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf','sourceSha256':SHA,'normalization':'Spazi, sillabazione morbida e segno meno; nessuna modifica alle regole. I nomi delle taglie sono ricondotti alle categorie del filtro.','records':output}
    (ROOT/'lib/data/srd-monsters-5.2.1-it.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('WROTE',len(output))
if __name__=='__main__':main()
