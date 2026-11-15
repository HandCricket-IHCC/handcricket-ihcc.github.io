#!/usr/bin/env python3
"""Put a fingerprint of the file in every ?v= of a local .js or .css link.
Run before every push:   python3 tools/stamp.py
Check only (used by the automatic test):   python3 tools/stamp.py --check
"""
import re, sys, hashlib, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAT = re.compile(r'''((?:src|href)=")([A-Za-z0-9_.\-]+\.(?:js|css))\?v=([A-Za-z0-9]+)(")''')
def fp(path):
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()[:8]
def main():
    check = '--check' in sys.argv
    bad = []; changed = 0
    for f in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        s = open(f, encoding='utf-8').read()
        def rep(m):
            target = os.path.join(ROOT, m.group(2))
            if not os.path.exists(target):
                bad.append('%s: missing file %s' % (os.path.basename(f), m.group(2))); return m.group(0)
            return m.group(1) + m.group(2) + '?v=' + fp(target) + m.group(4)
        n = PAT.sub(rep, s)
        if n != s:
            changed += 1
            if check: bad.append('%s: version numbers are out of date' % os.path.basename(f))
            else: open(f, 'w', encoding='utf-8').write(n)
    if bad:
        print('\n'.join(bad)); sys.exit(1)
    print('stamp: %s' % ('all version numbers are current' if check else '%d page(s) updated' % changed))
main()
