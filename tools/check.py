#!/usr/bin/env python3
"""Automatic checks for the IHCC site. Run:  python3 tools/check.py
Used by GitHub Actions on every push. Exit code 1 means something must be fixed."""
import re, os, sys, glob, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
errors = []
def err(f, msg): errors.append('%s: %s' % (f, msg))
pages = sorted(glob.glob('*.html'))
ids_of = {}
for f in pages:
    s = open(f, encoding='utf-8').read()
    ids_of[f] = set(re.findall(r'\bid="([^"]+)"', s))
for f in pages:
    s = open(f, encoding='utf-8').read()
    if 'http-equiv="Content-Security-Policy"' not in s: err(f, 'no Content-Security-Policy meta')
    if not re.search(r'<html lang="[a-z-]+"', s): err(f, 'no lang on html')
    if '<meta name="viewport"' not in s: err(f, 'no viewport meta')
    if not re.search(r'<title>[^<]+</title>', s): err(f, 'no title')
    if f != '404.html' and 'name="description"' not in s: err(f, 'no description')
    if len(re.findall(r'<h1[ >]', s)) != 1: err(f, 'needs exactly one h1')
    if '<main' not in s: err(f, 'no main')
    # inline script and style are blocked by the CSP, so they must never appear
    for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>', s):
        if 'application/ld+json' not in m.group(0): err(f, 'inline script (blocked by CSP)')
    if re.search(r'\son[a-z]+="', s): err(f, 'inline event handler such as onclick (blocked by CSP)')
    if re.search(r'<style[ >]', s) or re.search(r'\sstyle="', s): err(f, 'inline style (blocked by CSP)')
    for m in re.finditer(r'<img\b[^>]*>', s):
        if ' alt=' not in m.group(0): err(f, 'image without alt text')
    for m in re.finditer(r'<a\b[^>]*target="_blank"[^>]*>', s):
        if 'noopener' not in m.group(0): err(f, 'target=_blank without rel=noopener')
    if re.search(r'[؀-ۿ]', s) and 'lang="ur"' not in s: err(f, 'Urdu text without lang="ur"')
    # local links and anchors
    for m in re.finditer(r'\b(?:href|src)="([^"#?]*)(?:\?[^"#]*)?(#[^"]*)?"', s):
        path, frag = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|data:|javascript:)', path) or path.startswith('//'): continue
        if path.startswith('/'): path = path[1:]
        target = f if path == '' else path
        if path != '' and not os.path.exists(target): err(f, 'broken link: ' + path); continue
        if frag and len(frag) > 1 and target.endswith('.html') and frag[1:] not in ids_of.get(target, set()):
            # ids made by scripts are allowed to be missing in the static html
            err(f, 'anchor not found: %s%s' % (path, frag))
# scripts must be valid
for js in sorted(glob.glob('*.js')):
    r = subprocess.run(['node', '--check', js], capture_output=True, text=True)
    if r.returncode != 0: err(js, 'JavaScript error: ' + r.stderr.strip().splitlines()[0] if r.stderr.strip() else 'JavaScript error')
# events file for the home banner
import json
try:
    for e in json.load(open('events.json', encoding='utf-8')):
        for k in ('from', 'to', 'title', 'text'):
            if k not in e: err('events.json', 'missing ' + k)
except Exception as ex:
    err('events.json', 'not valid: %s' % ex)
# sitemap
sm = open('sitemap.xml', encoding='utf-8').read()
for u in re.findall(r'<loc>https://handcricket-ihcc\.github\.io/([^<]*)</loc>', sm):
    if u and not os.path.exists(u): err('sitemap.xml', 'page not found: ' + u)
# version numbers
r = subprocess.run([sys.executable, 'tools/stamp.py', '--check'], capture_output=True, text=True)
if r.returncode != 0: err('versions', r.stdout.strip() + ' (run: python3 tools/stamp.py)')
# generated pages must match the masters
before = {f: open(f, 'rb').read() for f in ['constitution.html', 'rulebook.html', 'constitution-draft.txt', 'rulebook-draft.txt']}
subprocess.run([sys.executable, 'tools/build.py'], check=True, capture_output=True)
subprocess.run([sys.executable, 'tools/stamp.py'], check=True, capture_output=True)
for f, b in before.items():
    if open(f, 'rb').read() != b:
        err(f, 'does not match tools/masters (run: python3 tools/build.py then python3 tools/stamp.py)')
        open(f, 'wb').write(b)
if errors:
    print('PROBLEMS FOUND (%d):' % len(errors)); print('\n'.join(errors)); sys.exit(1)
print('All checks passed: %d pages, %d scripts.' % (len(pages), len(glob.glob('*.js'))))
