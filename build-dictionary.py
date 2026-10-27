#!/usr/bin/env python3
"""Rebuild the bundled dictionary from a pinned, locally built ESDB checkout.

Usage: python3 build-dictionary.py /path/to/wordlist
Run `make` in that checkout first. Source and licensing: DICTIONARY.md.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

SOURCE_COMMIT = '1e5b7d3a72f47a71da5d28686c1dd4b397178485'
root = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve()
commit = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
if commit != SOURCE_COMMIT:
    raise SystemExit('Expected ESDB commit ' + SOURCE_COMMIT)
args = ['./scowl', 'word-list', '60', 'A,B,Z', '1', '--categories=',
        '--wo-poses=abbr,pre,suf,wp,we,x',
        '--wo-pos-classes=person,surname,place,name,name?,upper,upper?,demonym,trademark,abbr,abbr?',
        '--wo-pos-categories=nonword,special,wordpart',
        '--wo-usage-notes=nonstandard,offensive-1,offensive-2', '--deaccent']
result = subprocess.run(args, cwd=source, check=True, capture_output=True, text=True)
# Keep lowercase source entries BEFORE converting case. Names are not lowercased into eligibility.
exclusions = set(json.loads((root / 'dictionary-exclusions.json').read_text())['words'])
words = sorted({w.upper() for w in result.stdout.splitlines() if re.fullmatch(r'[a-z]{4,24}', w)} - exclusions)
assert len(words) > 70000
html_path = root / 'index.html'
html = html_path.read_text()
license_text = (source / 'Copyright').read_text().split('\n===\n')[0].strip() + '\n'
(root / 'DICTIONARY-LICENSE.txt').write_text(license_text)
declaration = 'const dictionary=new Set(' + json.dumps(' '.join(words)) + '.split(" "));'
html, count = re.subn(r'const dictionary=new Set\(.*?\);', lambda _: declaration, html, count=1)
assert count == 1
html = re.sub(r'// Retain original-game words.*?\.forEach\(word=>dictionary.add\(word\)\);\n', '', html, flags=re.S)
marker = '/* ESDB dictionary attribution\n'
if marker not in html:
    html = html.replace('const dictionary=', marker + license_text + '*/\nconst dictionary=', 1)
html_path.write_text(html)
puzzles = json.loads(re.search(r'const puzzles=(.*?);', html).group(1))
audit = []
for i, puzzle in enumerate(puzzles):
    allowed = set(puzzle['letters'])
    valid = [w for w in words if puzzle['center'] in w and set(w) <= allowed]
    pangrams = [w for w in valid if len(set(w)) == 7]
    assert len(allowed) == 7 and pangrams, (i, puzzle)
    audit.append(dict(index=i, **puzzle, words=len(valid), pangrams=pangrams))
(root / 'dictionary-audit.json').write_text(json.dumps({
    'source': 'https://github.com/en-wl/wordlist', 'source_commit': commit,
    'command': args, 'entries': len(words), 'editorial_exclusions': sorted(exclusions),
    'words_sha256': hashlib.sha256(('\n'.join(words)+'\n').encode()).hexdigest(),
    'puzzles': audit,
}, indent=2) + '\n')
print(f'Built {len(words):,} entries; all {len(puzzles)} puzzles have pangrams.')
