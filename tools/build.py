import re, html, sys, os
# Run from anywhere: python3 tools/build.py
# Masters (the texts to edit) are in tools/masters. Edit them, run this, then run tools/stamp.py, then push.
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,'masters')+os.sep
REPO=os.path.dirname(HERE)+os.sep
esc=lambda s: html.escape(s,quote=False)
NUM=r'\d+\.\d+[A-Z]?'
def link_refs(t, doc):
    # t already escaped
    def run(m):
        pre=m.group(1) or ''; kind=m.group(2); lst=m.group(3)
        const = pre.strip()=='Constitution'
        if doc=='c': base=('rulebook.html#r-' if kind.startswith('rule') else '#c-')
        else: base=('constitution.html#c-' if (const or kind.startswith('clause')) else '#r-')
        def one(n):
            return '<a href="%s%s">%s</a>'%(base,n.group(0).replace('.','-'),n.group(0))
        return pre+kind+' '+re.sub(NUM,one,lst)
    t=re.sub(r'(Constitution )?(clauses?|rules?) ((?:'+NUM+r'(?:\([a-z]\))?(?:, | and | to | or )?)+)',run,t)
    def art(m):
        pre=m.group(1) or ''
        if doc=='c': href='#art-'+m.group(3)
        else: href='constitution.html#art-'+m.group(3)
        return pre+'<a href="%s">Article %s</a>'%(href,m.group(3))
    t=re.sub(r'(Constitution )?(Article )(\d+[A-Z]?)\b',art,t)
    return t
def fmt(t,doc):
    t=esc(t)
    t=link_refs(t,doc)
    t=t.replace('[Locked]','<span class="lk">[Locked]</span>')
    t=re.sub(r'\[(to be decided[^\]]*|[^\]]*to be decided[^\]]*)\]',lambda m:'<span class="tbd">[%s]</span>'%m.group(1),t)
    return t
TITLES={}
TOOLS=''
def build(doc, lines, title, h1, desc, fname, txtname, draftline, intro, other):
    roman=[]
    out=[]; toc=[]
    i=0
    body=[]
    cur_ch=None
    units=[]
    for ln in lines:
        mm=re.match(r'^ARTICLE (\d+[A-Z]?): ',ln) if doc=='c' else re.match(r'^CHAPTER (\d+): ',ln)
        if mm:
            if doc=='c': units.append(('art-'+mm.group(1),'Article '+mm.group(1)))
            else: units.append(('ch-'+mm.group(1),'Chapter '+mm.group(1)))
    ui=[-1]; done=[True]
    def flush():
        k=ui[0]
        if k<0 or done[0]: return
        done[0]=True
        parts=[]
        if k>0: parts.append('<a href="#%s">Previous: %s</a>'%units[k-1])
        if k<len(units)-1: parts.append('<a href="#%s">Next: %s</a>'%units[k+1])
        parts.append('<a href="#tocH">Back to contents</a>')
        body.append('<p class="pn">'+' '.join(parts)+'</p>')
    for ln in lines:
        s=ln.rstrip('\n')
        if not s.strip(): continue
        m=re.match(r'^CHAPTER ([IVXL0-9]+): (.*)$',s)
        if m:
            flush()
            if doc=='r': ui[0]+=1; done[0]=False
            cid='ch-'+m.group(1).lower()
            name=TITLES.get('Chapter '+m.group(1),m.group(2))
            body.append('<h2 id="%s">Chapter %s: %s</h2>'%(cid,m.group(1),esc(name)))
            toc.append(('ch',cid,'Chapter %s: %s'%(m.group(1),name)))
            continue
        m=re.match(r'^ARTICLE (\d+[A-Z]?): (.*)$',s)
        if m:
            flush(); ui[0]+=1; done[0]=False
            aid='art-'+m.group(1)
            name=TITLES.get('Article '+m.group(1),m.group(2))
            body.append('<h3 id="%s">Article %s: %s</h3>'%(aid,m.group(1),esc(name)))
            toc.append(('art',aid,'Article %s: %s'%(m.group(1),name)))
            continue
        m=re.match(r'^(Part [A-Z]): (.*)$',s)
        if m:
            body.append('<h3>%s: %s</h3>'%(m.group(1),fmt(m.group(2),doc)))
            continue
        m=re.match(r'^('+NUM+r') (.*)$',s)
        if m:
            n=m.group(1); pid=('c-' if doc=='c' else 'r-')+n.replace('.','-')
            body.append('<p class="cl" id="%s"><span class="num">%s</span> %s</p>'%(pid,n,fmt(m.group(2),doc)))
            continue
        m=re.match(r'^\s{4}(.*)$',s)
        if m:
            body.append('<p class="sub">%s</p>'%fmt(m.group(1),doc)); continue
        body.append('<p>%s</p>'%fmt(s.strip(),doc))
    flush()
    tochtml=[]
    inart=False
    for k,idv,txt in toc:
        if k=='ch':
            if inart: tochtml.append('</ul></li>'); inart=False
            tochtml.append('<li><a href="#%s">%s</a>'%(idv,esc(txt)))
            tochtml.append('<ul class="toc2">'); inart=True
        else:
            tochtml.append('<li><a href="#%s">%s</a></li>'%(idv,esc(txt)))
    if inart: tochtml.append('</ul></li>')
    # chapters without articles: leave empty ul out
    tocs='\n'.join(tochtml).replace('<ul class="toc2"></ul>','')
    tocs=re.sub(r'<ul class="toc2">\s*</ul>','',tocs)
    page=open(REPO+'faq.html').read()
    head=page.split('<main id="main"')[0]
    foot='<!--SITEFOOT-->'+page.split('<!--SITEFOOT-->',1)[1]
    foot=re.sub(r'(<script src="notice\.js\?v=[A-Za-z0-9]+"></script>)',r'\1\n<script src="doc.js?v=0"></script>',foot,count=1)
    head=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="%s">'%esc(desc),head)
    head=head.replace('FAQ - IHCC',title+' (Draft) - IHCC')
    head=re.sub(r'<meta property="og:description" content="[^"]*">','<meta property="og:description" content="%s">'%esc(desc),head)
    head=head.replace('<meta name="theme-color"','<meta name="robots" content="noindex">\n<meta name="theme-color"')
    head=re.sub(r'(<link rel="stylesheet" href="notice\.css\?v=[A-Za-z0-9]+">)',r'\1\n<link rel="stylesheet" href="doc.css?v=0">',head,count=1)
    head=head.replace('<h1>Questions and answers</h1>','<h1>%s</h1>'%esc(h1))
    head=re.sub(r'<p class="lede">.*?</p>','<p class="lede">%s</p>'%esc(desc),head,flags=re.S)
    head=head.replace('<a href="faq.html" aria-current="page"','<a href="faq.html"')
    head=head.replace('<a href="%s"'%fname,'<a href="%s" aria-current="page"'%fname,1)
    box=('<section class="draftbox" aria-labelledby="dbx"><h2 id="dbx">DRAFT: not yet in force</h2>'
      '<p>%s</p>'
      '<p>Words in <span class="tbd">[square brackets]</span> are still to be decided. <span class="lk">[Locked]</span> after a number means the Boards decided it in a meeting.</p>'
      '<p><a href="%s" download>Download this draft as a plain text file</a>. <a href="%s">%s</a></p></section>')%(esc(draftline),txtname,other[0],esc(other[1]))
    main=('<main id="main" class="wrap docpage" tabindex="-1" data-doc="'+doc+'">\n'+box+TOOLS+
      '\n<nav aria-labelledby="tocH" class="doctoc"><h2 id="tocH">Contents</h2><ul>\n'+tocs+'\n</ul></nav>\n'+'\n'.join(body)+'\n</main>\n')
    open(REPO+fname,'w').write(head+main+foot)
import re as _re
def grab(lines):
    for l in lines:
        m=_re.match(r'^\s*((?:Chapter|Article) [IVXL0-9]+[A-Z]?): (.*)$',l)
        if m and m.group(1) not in TITLES: TITLES[m.group(1)]=m.group(2)
# Constitution
c=open(OUT+'constitution.txt').read().split('\n')
grab(c)
ci=[i for i,l in enumerate(c) if l.startswith('CHAPTER I: ')][0]
intro_c=c[1]
TOOLS='''<section class="doctools" aria-labelledby="toolsH"><h2 id="toolsH">Find a clause</h2>
<form id="dsearch" role="search" class="sform"><div><label for="dq">Search the text</label><input id="dq" type="text" autocomplete="off" aria-describedby="dstat"></div><button class="go" type="submit">Search</button></form>
<form id="djump" class="sform"><div><label for="dn">Go to clause number, for example 8.19</label><input id="dn" type="text" inputmode="decimal" autocomplete="off"></div><button class="go" type="submit">Go</button><button class="go" type="button" id="dcopy">Copy link</button></form>
<p id="dstat" role="status" aria-live="polite" class="field-hint"></p>
<ol id="dres" class="sres"></ol></section>'''
build('c',c[ci:],'The IHCC Constitution','The IHCC Constitution','The Constitution of the International Hand Cricket Council. This is a draft that is still being made.','constitution.html','constitution-draft.txt','This is a DRAFT. The text is still being made and changes every day. The last day for changes is 30 November 2026. It comes into force on 3 December 2026.',intro_c,('rulebook.html','Read the Rule Book draft'))
open(REPO+'constitution-draft.txt','w').write('\n'.join(c).replace('Draft 6 (14 November 2026).','DRAFT (14 November 2026).'))
# Rule book
TITLES.clear()
r1=open(OUT+'rb1.txt').read().split('\n'); r2=open(OUT+'rb2.txt').read().split('\n')
ri=[i for i,l in enumerate(r1) if l.startswith('CHAPTER 1: ')][0]
r2i=[i for i,l in enumerate(r2) if l.startswith('CHAPTER 8: ')][0]
intro_r=r1[1]
grab(r1)
TOOLS='''<section class="doctools" aria-labelledby="toolsH"><h2 id="toolsH">Find a clause</h2>
<form id="dsearch" role="search" class="sform"><div><label for="dq">Search the text</label><input id="dq" type="text" autocomplete="off" aria-describedby="dstat"></div><button class="go" type="submit">Search</button></form>
<form id="djump" class="sform"><div><label for="dn">Go to clause number, for example 8.19</label><input id="dn" type="text" inputmode="decimal" autocomplete="off"></div><button class="go" type="submit">Go</button><button class="go" type="button" id="dcopy">Copy link</button></form>
<p id="dstat" role="status" aria-live="polite" class="field-hint"></p>
<ol id="dres" class="sres"></ol></section>'''
build('r',r1[ri:]+r2[r2i:],'The IHCC Rule Book','The IHCC Rule Book','The detailed rules of the International Hand Cricket Council. This is a draft that is still being made.','rulebook.html','rulebook-draft.txt','This is a DRAFT. The text is still being made and changes every day. The last day for changes is 30 November 2026. It comes into force on 3 December 2026 together with the Constitution.',intro_r,('constitution.html','Read the Constitution draft'))
open(REPO+'rulebook-draft.txt','w').write('\n'.join(r1+r2[r2i-0:]) if False else ('\n'.join(r1)+'\n'+'\n'.join(r2[2:])).replace('Draft 5 (14 November 2026), Part 1 of 2: Chapters 1 to 7.','DRAFT (14 November 2026).').replace(' Part 2 holds Chapters 8 to 13.',''))

# Playing Regulations
TITLES.clear()
pl=open(OUT+'playing.txt').read().split('\n')
pi=[i for i,l in enumerate(pl) if l.startswith('CHAPTER 1: ')][0]
grab(pl)
build('r',pl[pi:],'The IHCC Playing Regulations','The IHCC Playing Regulations','The standard rules of play for every IHCC series and tournament. This is a draft that is still being made.','playing-regulations.html','playing-regulations-draft.txt','This is a DRAFT. The text is still being made and changes every day. The last day for changes is 30 November 2026. It comes into force on 3 December 2026 together with the Constitution and the Rule Book.',pl[1],('rulebook.html','Read the Rule Book draft'))
open(REPO+'playing-regulations-draft.txt','w').write('\n'.join(pl).replace('Draft (27 November 2026).','DRAFT (27 November 2026).'))
