"""Faithful SRD reference extraction. Two-column prose; wide/narrow tables preserved in layout text.
No generated rules. Each block carries a PDF region and source character proof.
"""
import fitz,re,json,hashlib,collections,subprocess,math,unicodedata
from pathlib import Path
R=Path(__file__).resolve().parents[1];PDF=Path('/tmp/grimorio-srd-it.pdf');DOC=fitz.open(PDF)
SHA='a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718'
def norm(t):return re.sub(r'\s+',' ',t.replace('\xad','')).strip()
def chars(t):return collections.Counter(c.casefold() for c in unicodedata.normalize('NFKC',t.replace('\xad','')) if not c.isspace())
def proof(t):return hashlib.sha256(''.join(sorted(chars(t).elements())).encode()).hexdigest()
def slug(t):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFD',t.lower()).encode('ascii','ignore').decode()).strip('-')
def rowtext(spans):
 out='';last=None
 for s in sorted(spans,key=lambda s:s['bbox'][0]):
  if last is not None and s['bbox'][0]-last>1.3 and out and not out.endswith((' ','\t')) and not s['text'].startswith((' ','\t')):out+=' '
  out+=s['text'];last=s['bbox'][2]
 return out.strip()
def join(parts):
 out=''
 for t in parts:
  if out and not out.endswith('\xad'):out+=' '
  out+=t.strip()
 return norm(out)
def cliptable(page,spans):
 rect=fitz.Rect(min(s['bbox'][0] for s in spans)-1,min(s['bbox'][1] for s in spans)-1,max(s['bbox'][2] for s in spans)+1,max(s['bbox'][3] for s in spans)+1)
 x,y=math.floor(rect.x0),math.floor(rect.y0);w,h=math.ceil(rect.x1)-x,math.ceil(rect.y1)-y
 text=subprocess.check_output(['pdftotext','-layout','-nopgbrk','-f',str(page),'-l',str(page),'-x',str(x),'-y',str(y),'-W',str(w),'-H',str(h),str(PDF),'-']).decode().replace('\xad','-').strip('\n')
 expected=''.join(s['text'] for s in spans).replace('\xad','-')
 assert chars(text)==chars(expected),('TABLE COVERAGE',page,rect,chars(expected)-chars(text),chars(text)-chars(expected))
 return dict(kind='table',text=text,page=page,region=[x,y,x+w,y+h],sourceHash=proof(expected))
def extract(first,last):
 output=[]
 for pi in range(first-1,last):
  p=DOC[pi];spans=[]
  for bi,b in enumerate(p.get_text('dict')['blocks']):
   for l in b.get('lines',[]):
    for s in l['spans']:
     if s['text'].strip() and 30<s['bbox'][1]<735 and s['bbox'][0]>40:spans.append(dict(s,block=bi))
  tablefont=lambda s:s['font'].startswith('GillSans') and s['size']<11.9
  zones=[]
  for d in p.get_drawings():
   rect=d['rect']
   if d.get('fill') and rect.width>350 and rect.y0<735:
    ss=[s for s in spans if tablefont(s) and rect.y0-45<s['bbox'][1]<min(735,rect.y1+20) and (s['bbox'][1]<=rect.y1 or s['size']<10)]
    if ss:zones.append((min(s['bbox'][1] for s in ss)-.1,max(s['bbox'][3] for s in ss)+.1,ss))
  zones.sort();lasty=30
  def columns(top,bottom):
   result=[]
   for col in [0,1]:
    ss=[s for s in spans if top<=s['bbox'][1]<bottom and (s['bbox'][0]<300)==(col==0)]
    rows=[]
    for s in sorted(ss,key=lambda s:(s['origin'][1],s['bbox'][0])):
     if rows and abs(rows[-1][0]-s['origin'][1])<1:rows[-1][1].append(s)
     else:rows.append([s['origin'][1],[s]])
    groups=[]
    for base,ss in rows:
     text=rowtext(ss);size=max(s['size'] for s in ss);kind='heading' if size>=11.9 else 'table' if all(tablefont(s) for s in ss) else 'prose'
     key=(kind,ss[0]['block'])
     # Tables can span several PDF text blocks; prose paragraphs and multiline headings retain their blocks.
     if groups and groups[-1]['kind']==kind and (kind=='table' or groups[-1]['key']==key) and (kind!='heading' or abs(groups[-1]['size']-size)<.2):
      groups[-1]['spans']+=ss;groups[-1]['parts'].append(text)
     else:groups.append(dict(kind=kind,key=key,size=size,spans=list(ss),parts=[text]))
    for g in groups:
     if g['kind']=='table':result.append(cliptable(pi+1,g['spans']))
     else:
      text=join(g['parts']);expected=''.join(s['text'] for s in g['spans']);assert chars(text)==chars(expected)
      result.append(dict(kind=g['kind'],text=text,page=pi+1,size=round(g['size'],2),sourceHash=proof(expected)))
   return result
  for top,bottom,ss in zones:
   assert top>=lasty,('OVERLAPPING TABLES',pi+1)
   output+=columns(lasty,top);output.append(cliptable(pi+1,ss));lasty=bottom
  output+=columns(lasty,735)
 return output

def entry(title,category,subgroup,blocks):
 assert blocks,title
 return dict(id=category+'-'+slug(title),title=title,category=category,subgroup=subgroup,page=blocks[0]['page'],pages=sorted({b['page'] for b in blocks}),blocks=blocks)
def main():
 assert hashlib.sha256(PDF.read_bytes()).hexdigest()==SHA
 entries=[]
 # Every glossary heading bounds a definition. Keep only the 15 official conditions.
 glossary=extract(202,219);current=None;parts=[]
 for b in glossary:
  if b['kind']=='heading' and abs(b['size']-12)<.2:
   if current and '[condizione]' in current:entries.append(entry(current.replace(' [condizione]',''),'condizioni','Condizioni',parts))
   current=b['text'];parts=[]
  elif current:parts.append(b)
 if current and '[condizione]' in current:entries.append(entry(current.replace(' [condizione]',''),'condizioni','Condizioni',parts))
 assert sum(e['category']=='condizioni' for e in entries)==15
 equip=extract(101,117);current=None;parts=[]
 for b in equip:
  if b['kind']=='heading' and abs(b['size']-18)<.2:
   if current:entries.append(entry(current,'equipaggiamento','Equipaggiamento',parts))
   current=b['text'];parts=[]
  elif current:parts.append(b)
 if current:entries.append(entry(current,'equipaggiamento','Equipaggiamento',parts))
 classes=extract(32,92);current=None;parts=[]
 names={'Barbaro','Bardo','Chierico','Druido','Guerriero','Ladro','Mago','Monaco','Paladino','Ranger','Stregone','Warlock'}
 for b in classes:
  if b['kind']=='heading' and b['text'] in names and abs(b['size']-18)<.2:
   if current:entries.append(entry(current,'personaggi','Classi',parts))
   current=b['text'];parts=[]
  elif current:parts.append(b)
 if current:entries.append(entry(current,'personaggi','Classi',parts))
 assert sum(e['subgroup']=='Classi' for e in entries)==12
 entries.append(entry('Creazione del personaggio','personaggi','Creazione',extract(21,31)))
 origins=extract(93,97);current='Origini e background';subgroup='Origini';parts=[]
 backgrounds={'Accolito','Criminale','Sapiente','Soldato'};species={'Dragonide','Elfo','Gnomo','Goliath','Halfling','Nano','Orco','Tiefling','Umano'}
 for b in origins:
  if b['kind']=='heading' and ((b['text'] in backgrounds|species and abs(b['size']-12)<.2) or b['text']=='Specie dei personaggi'):
   if parts:entries.append(entry(current,'personaggi',subgroup,parts))
   current=b['text'];subgroup='Background' if current in backgrounds else 'Specie' if current in species else 'Origini';parts=[]
  else:parts.append(b)
 if parts:entries.append(entry(current,'personaggi',subgroup,parts))
 # Page 97 starts Umano in the right column above the full-width Tiefling table.
 # Geometric reading order therefore crosses a species boundary: retain the exact
 # source block/region but associate the printed caption with its species.
 tiefling=next(e for e in entries if e['id']=='personaggi-tiefling')
 for owner in entries:
  for block in list(owner['blocks']):
   if block['kind']=='table' and block['page']==97 and 'Retaggi immondi' in block['text'] and owner is not tiefling:
    owner['blocks'].remove(block);tiefling['blocks'].append(block)
    owner['pages']=sorted({b['page'] for b in owner['blocks']})
    tiefling['pages']=sorted({b['page'] for b in tiefling['blocks']})
 entries.append(entry('Talenti','personaggi','Talenti',extract(98,100)))
 assert len({e['id'] for e in entries})==len(entries)
 data=dict(sourceUrl='https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf',sourceSha256=SHA,entries=entries)
 (R/'lib/data/srd-manual-5.2.1-it.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('Manual entries',collections.Counter(e['category'] for e in entries),'tables',sum(b['kind']=='table' for e in entries for b in e['blocks']))
if __name__=='__main__':main()
