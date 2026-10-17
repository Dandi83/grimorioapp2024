import fitz,re,json,html,hashlib,subprocess,collections,math,sys
from pathlib import Path

"""Reproduce the transcription from the official PDF. Usage: python3 scripts/transcribe-srd.py /path/IT_SRD_CC_v5.2.1.pdf [--write]"""
PDF=Path(sys.argv[1])
ROOT=Path(__file__).resolve().parents[1]
previous=json.loads((ROOT/'lib/data/srd-italiano-5.2.1.json').read_text())
assert hashlib.sha256(PDF.read_bytes()).hexdigest()==previous['sourcePdfSha256'], 'Unexpected source PDF version'
AUDIT={'eligible':[{'id':s['id'],'app':s['appName'],'title':s['sourceName']} for s in previous['spells']]}
review_path=ROOT/'lib/data/srd-revisions-20261017.json'
if review_path.exists():
    review=json.loads(review_path.read_text())
    assert review['sourcePdfSha256']==previous['sourcePdfSha256'], 'Review uses a different SRD version'
    existing_ids={s['id'] for s in AUDIT['eligible']}
    AUDIT['eligible'] += [{'id':s['id'],'app':s['appName'],'title':s['sourceName']} for s in review['replacements'] if s['id'] not in existing_ids]
additions=json.loads((ROOT/'lib/data/srd-additions-20261017.json').read_text())
assert additions['sourcePdfSha256']==previous['sourcePdfSha256']
existing_ids={s['id'] for s in AUDIT['eligible']}
AUDIT['eligible'] += [{'id':s['id'],'app':s['sourceName'].upper(),'title':s['sourceName']} for s in additions['spells'] if s['id'] not in existing_ids]
doc=fitz.open(PDF)
raw=subprocess.check_output(['pdftotext','-raw','-f','121','-l','202',str(PDF),'-']).decode().splitlines()
school=r'^(?:Abiurazione|Ammaliamento|Divinazione|Evocazione|Illusione|Invocazione|Necromanzia|Trasmutazione) (?:di|trucchetto)|^Trucchetto di '
titles={raw[i-1] for i,l in enumerate(raw) if re.match(school,l)}
assert len(titles)==339

def norm(t):
    return re.sub(r'\s+',' ',t.replace('\u00a0',' ').replace('\u00ad','')).strip()

def row_text(spans):
    result='';last=None
    for s in sorted(spans,key=lambda x:x['bbox'][0]):
        t=s['text'].replace('\u00a0',' ')
        if last is not None and s['bbox'][0]-last>1.3 and result and not result.endswith((' ','\t')) and not t.startswith((' ','\t')):result+=' '
        result+=t;last=s['bbox'][2]
    return result.strip()

rows=[]
for pi in range(120,201):
    cols=[[],[]]
    for bi,b in enumerate(doc[pi].get_text('dict')['blocks']):
        for l in b.get('lines',[]):
            for s in l['spans']:
                if not s['text'].strip() or s['bbox'][1]>=741:continue
                if s['bbox'][0]<60:continue
                cols[int(s['bbox'][0]>=300)].append({**s,'block':bi})
    for ci,col in enumerate(cols):
        groups=[]
        for s in sorted(col,key=lambda s:(s['origin'][1],s['bbox'][0])):
            if groups and abs(groups[-1][0]-s['origin'][1])<1.0:groups[-1][1].append(s)
            else:groups.append([s['origin'][1],[s]])
        for base,spans in groups:
            text=row_text(spans)
            rows.append({'text':text,'spans':spans,'page':pi+1,'col':ci,'base':base,'block':(pi,ci,spans[0]['block']),
                         'bbox':(min(s['bbox'][0] for s in spans),min(s['bbox'][1] for s in spans),max(s['bbox'][2] for s in spans),max(s['bbox'][3] for s in spans))})

records={};current=None
for row in rows:
    is_title=row['text'] in titles and any(s['font']=='GillSans-SemiBold' and abs(s['size']-12)<.1 for s in row['spans'])
    if is_title:
        assert row['text'] not in records,row['text']
        current={'name':row['text'],'titlePage':row['page'],'rows':[]}
        records[row['text']]=current
    elif current:current['rows'].append(row)
assert set(records)==titles,(len(records),titles-set(records))

def is_table(row):
    # Body tables use Gill Sans; rules prose uses Cambria, stat-block prose Optima.
    return all(s['font'].startswith('GillSans') for s in row['spans']) and not all(s['size']>=11 for s in row['spans'])

def chars(t):return collections.Counter(c.casefold() for c in t if c.isalnum())

def join_lines(parts):
    result=''
    for t in parts:
        t=t.replace('\u00a0',' ').strip()
        if not result:result=t;continue
        if result.endswith('\u00ad'):result=result[:-1]+t
        elif result.endswith('-') and t[:1].islower() and not re.search(r'(?:nord|sud|anti|est|ovest)-$',result,re.I):result=result[:-1]+t
        else:result+=' '+t
    return norm(result)

transcripts={};table_log=[]
for name,record in records.items():
    rr=record['rows']
    # Skip the school and complete metadata, including material-cost line wraps.
    dur=next(i for i,r in enumerate(rr) if r['text'].startswith('Durata:'))
    start=next(i for i,r in enumerate(rr[dur+1:],dur+1) if any(s['font'].startswith('Cambria') and s['font']!='Cambria-Italic' for s in r['spans']))
    body=rr[start:]
    tempo=next(i for i,r in enumerate(rr[:start]) if r['text'].startswith('Tempo di lancio:'))
    metadata={'livello':join_lines([r['text'] for r in rr[:tempo]])}
    field_names={'Tempo di lancio':'tempo_di_lancio','Gittata':'gittata','Componenti':'componenti','Componente':'componenti','Durata':'durata'}
    key=None;parts=[]
    for r in rr[tempo:start]:
        m=re.match(r'^(Tempo di lancio|Gittata|Componenti|Componente|Durata):\s*(.*)',r['text'])
        if m:
            if key:metadata[key]=join_lines(parts)
            key=field_names[m[1]];parts=[m[2]]
        else:parts.append(r['text'])
    if key:metadata[key]=join_lines(parts)
    assert set(metadata)=={'livello','tempo_di_lancio','gittata','componenti','durata'},name
    groups=[]
    for r in body:
        table=is_table(r)
        if groups and table and groups[-1]['table'] and groups[-1]['rows'][-1]['page']==r['page'] and groups[-1]['rows'][-1]['col']==r['col']:
            groups[-1]['rows'].append(r)
        elif groups and not table and not groups[-1]['table'] and groups[-1]['rows'][-1]['block']==r['block'] and not r['text'].startswith('•'):
            groups[-1]['rows'].append(r)
        else:groups.append({'table':table,'rows':[r]})
    # Physical block boundaries can interrupt the middle of a sentence at page/column edges.
    for i in range(len(groups)-1,0,-1):
        a=groups[i-1];b=groups[i]
        if not a['table'] and not b['table']:
            prev=a['rows'][-1]['text'];nxt=b['rows'][0]['text']
            boundary=a['rows'][-1]['page']!=b['rows'][0]['page'] or a['rows'][-1]['col']!=b['rows'][0]['col']
            if (prev.endswith(('\u00ad','-')) or (nxt[:1].islower() and not prev.endswith(('.',':','!','?')))) and (boundary or nxt[:1].islower()):
                a['rows']+=b['rows'];groups.pop(i)
    segments=[]
    for g in groups:
        if g['table']:
            rs=g['rows'];page=rs[0]['page'];x0=min(r['bbox'][0] for r in rs)-1;y0=min(r['bbox'][1] for r in rs)-1
            x1=max(r['bbox'][2] for r in rs)+1;y1=max(r['bbox'][3] for r in rs)+1
            args=['pdftotext','-layout','-nopgbrk','-f',str(page),'-l',str(page),'-x',str(math.floor(x0)),'-y',str(math.floor(y0)),'-W',str(math.ceil(x1)-math.floor(x0)),'-H',str(math.ceil(y1)-math.floor(y0)),str(PDF),'-']
            table=subprocess.check_output(args).decode().replace('\u00a0',' ').replace('\u00ad','').strip('\n')
            # Every letter and digit in the selected PDF cells must survive transcription.
            expected=''.join(s['text'] for r in rs for s in r['spans'])
            assert chars(table)==chars(expected),(name,page,chars(expected)-chars(table),chars(table)-chars(expected))
            table_log.append((name,page,len(rs)))
            segments.append('<pre>'+html.escape(table,quote=False)+'</pre>')
        else:
            content=join_lines([r['text'] for r in g['rows']])
            assert chars(content)==chars(''.join(r['text'] for r in g['rows'])),(name,'paragraph changed')
            if all('Bold' in s['font'] or s['size']>11 for r in g['rows'] for s in r['spans']):content='<b>'+html.escape(content,quote=False)+'</b>'
            else:content=html.escape(content,quote=False)
            segments.append(content)
    desc='<br><br>'.join(segments)
    assert chars(html.unescape(re.sub('<[^>]+>','',desc)))==chars(''.join(r['text'] for r in body)),name
    transcripts[name]={**metadata,'descrizione':desc,'pages':sorted({record['titlePage']}|{r['page'] for r in body}),
                       'sourceAlphanumericSha256':hashlib.sha256(''.join(sorted(chars(''.join(r['text'] for r in body)).elements())).encode()).hexdigest()}

assert {s['title'] for s in AUDIT['eligible']}==titles, 'The app must include every source spell'

data={'version':'5.2.1','language':'it','license':'CC-BY-4.0',
      'sourceUrl':'https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf',
      'sourcePdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),
      'attribution':'Quest’opera include materiale tratto dal System Reference Document 5.2.1 ("SRD 5.2.1") di Wizards of the Coast LLC, disponibile all’indirizzo https://www.dndbeyond.com/srd. Il SRD 5.2.1 è concesso in licenza ai sensi della licenza di attribuzione 4.0 Internazionale di Creative Commons, disponibile all’indirizzo https://creativecommons.org/licenses/by/4.0/legalcode.',
      'transcriptionNotes':'Testo integrale italiano del SRD. Normalizzati spazi, a capo e sillabazione tipografica; tabelle mantenute. Nessuna riformulazione delle regole.',
      'spells':[{'id':x['id'],'appName':x['app'],'sourceName':x['title'],**transcripts[x['title']]} for x in AUDIT['eligible']]}
dest=ROOT/'lib/data/srd-italiano-5.2.1.json'
if '--write' in sys.argv:
    dest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
else:
    assert data==previous, 'Transcription differs from the source PDF; review before any write'
print(json.dumps({'verifiedRecords':len(data['spells']),'distinctSpells':len({s['sourceName'] for s in data['spells']}),'sourcePdfSha256':data['sourcePdfSha256'],'sourceTables':len(table_log)},ensure_ascii=False))

