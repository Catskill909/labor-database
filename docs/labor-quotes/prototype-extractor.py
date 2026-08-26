import re, html, json, time, urllib.request, hashlib, os, sys
from collections import defaultdict

BASE="https://laborquotes.weebly.com"
AUTHOR=["a","b","c","d-e","f-g","h-i","j-k","l","m-o","p-q","r","s","t-z"]
TOPIC=["automation","big-businesspower--corruption","brotherhood","economics--inequality",
"good--evil","labor-day","leadership","management","negotiating","outsourcing--globalization",
"politics","presidential-quotes","solidarity","strikes--struggle","the-law","unions--labor",
"wisdom--knowledge","work","apwu-quotes"]
CACHE="cache"; os.makedirs(CACHE,exist_ok=True)

def fetch(slug):
    p=os.path.join(CACHE,slug.replace("/","_")+".html")
    if os.path.exists(p): return open(p,encoding="utf-8",errors="replace").read()
    req=urllib.request.Request(f"{BASE}/{slug}.html",headers={"User-Agent":"Mozilla/5.0 (research crawler)"})
    t=urllib.request.urlopen(req,timeout=30).read().decode("utf-8","replace")
    open(p,"w",encoding="utf-8").write(t); time.sleep(1.0); return t

def content_region(s):
    m=re.search(r'id="wsite-content".*?(?=<div id="footer|<div class="wsite-footer|</body>)',s,re.S)
    return m.group(0) if m else s

def clean(frag):
    frag=re.sub(r'</?(?:font|span|u|div)[^>]*>','',frag)
    frag=re.sub(r'<a[^>]*>|</a>','',frag)
    frag=re.sub(r'\s+',' ',frag)
    return frag

def totext(frag):
    t=re.sub(r'<[^>]+>','',frag)
    t=html.unescape(t).replace('​','').replace('\xa0',' ')
    return re.sub(r'\s+',' ',t).strip()

DASH=re.compile(r'^\s*(?:—|–|--|-)\s*')

def parse(slug):
    body=content_region(fetch(slug))
    # capture h2 section headings (author sections) as we walk
    body=re.sub(r'<span class=.imgPusher.[^>]*></span>','',body)
    parts=re.split(r'(<h2[^>]*>.*?</h2>)',body,flags=re.S)
    section=None; out=[]; blocks_total=0; unpaired=[]
    for part in parts:
        if part.startswith('<h2'):
            section=totext(part) or None; continue
        img=None
        mimg=re.search(r'<img[^>]*src="([^"]+)"',part)
        if mimg: img=mimg.group(1)
        wiki=None
        mw=re.search(r'href="(https?://en\.wikipedia\.org/[^"]+)"',part)
        if mw: wiki=mw.group(1)
        c=clean(part)
        for blk in re.split(r'(?:<br\s*/?>\s*){2,}',c):
            if not blk.strip(): continue
            blocks_total+=1
            ms=re.search(r'<strong>(.*?)</strong>',blk,re.S)
            if not ms:
                if totext(blk): unpaired.append((slug,totext(blk)[:120]))
                continue
            quote=totext(ms.group(1))
            rest=blk[ms.end():]
            attrib=DASH.sub('',totext(rest))
            if not quote: continue
            out.append(dict(page=slug,section=section,quote=quote,attribution=attrib,
                            image=img,wiki=wiki,
                            key=hashlib.sha1(re.sub(r'[^a-z0-9]','',quote.lower()).encode()).hexdigest()[:16]))
    return out,blocks_total,unpaired

allq=[]; stats={}; allunpaired=[]
for slug in AUTHOR+TOPIC:
    try:
        q,tot,unp=parse(slug)
    except Exception as e:
        print(f"FAIL {slug}: {e}",file=sys.stderr); continue
    allq+=q; allunpaired+=unp
    noattr=sum(1 for x in q if not x['attribution'])
    stats[slug]=(len(q),tot,noattr)
    print(f"{slug:35s} quotes={len(q):4d} blocks={tot:4d} no-attrib={noattr:3d}")

print("\n=== TOTALS ===")
print("raw quote rows:",len(allq))
byk=defaultdict(list)
for x in allq: byk[x['key']].append(x)
print("unique quotes  :",len(byk))
print("duplicate rows :",len(allq)-len(byk))
au={x['key'] for x in allq if x['page'] in AUTHOR}
tp={x['key'] for x in allq if x['page'] in TOPIC}
print("author-page uniques:",len(au)," topic-page uniques:",len(tp)," overlap:",len(au&tp))
print("topic-only (not on any author page):",len(tp-au))
print("no attribution :",sum(1 for x in allq if not x['attribution']))
print("unpaired text blocks (non-quote prose/noise):",len(allunpaired))
print("with image:",sum(1 for x in allq if x['image'])," with wikipedia link:",sum(1 for x in allq if x['wiki']))
import statistics
L=[len(x['quote']) for x in allq]
print("quote len: min",min(L),"median",int(statistics.median(L)),"max",max(L))
print("\n=== 12 SAMPLE ROWS ===")
for x in allq[::max(1,len(allq)//12)][:12]:
    print(json.dumps({k:x[k] for k in('page','section','quote','attribution')},ensure_ascii=False)[:260])
print("\n=== 10 LONGEST (likely prose/mis-parse) ===")
for x in sorted(allq,key=lambda z:-len(z['quote']))[:10]:
    print(f"[{x['page']}] {len(x['quote'])}ch :: {x['quote'][:150]}")
print("\n=== 12 UNPAIRED BLOCKS (what the strong/em rule misses) ===")
for s,t in allunpaired[:12]: print(f"[{s}] {t}")
json.dump(allq,open("quotes-raw.json","w"),ensure_ascii=False,indent=1)
print("\nwrote quotes-raw.json")
