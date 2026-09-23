#!/usr/bin/env python3
"""
fetch-text.py — fetch a URL and print its readable text, so a research quote
can be copied verbatim rather than from a model's paraphrase.

    python3 tools/fetch-text.py URL                 # whole text
    python3 tools/fetch-text.py URL --grep "phrase" # only paragraphs containing it
    python3 tools/fetch-text.py URL --check "exact quote to verify"

HTML is reduced to paragraph text with BeautifulSoup; PDFs go through
pdfminer. --check normalises whitespace, curly quotes and dashes on both
sides and exits 0 when the quote is on the page, 1 when it is not, 2 when the
page could not be fetched. Fetched pages are cached in /tmp/fetch-text-cache.
"""
import hashlib, io, os, re, sys, urllib.request, ssl, gzip

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36')
CACHE = '/tmp/fetch-text-cache'


def fetch(url):
    os.makedirs(CACHE, exist_ok=True)
    key = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())
    if os.path.exists(key):
        with open(key, 'rb') as f:
            raw = f.read()
        ctype = open(key + '.type').read() if os.path.exists(key + '.type') else ''
        return raw, ctype
    ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
                                     if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*',
                                               'Accept-Language': 'en-US,en;q=0.8',
                                               'Accept-Encoding': 'gzip'})
    with urllib.request.urlopen(req, timeout=45, context=ctx) as r:
        raw = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            raw = gzip.decompress(raw)
        ctype = r.headers.get('Content-Type', '')
    with open(key, 'wb') as f:
        f.write(raw)
    with open(key + '.type', 'w') as f:
        f.write(ctype)
    return raw, ctype


def to_text(raw, ctype, url):
    if 'pdf' in ctype.lower() or url.lower().split('?')[0].endswith('.pdf') or raw[:5] == b'%PDF-':
        from pdfminer.high_level import extract_text
        return extract_text(io.BytesIO(raw))
    from bs4 import BeautifulSoup
    html = raw.decode('utf-8', errors='replace')
    soup = BeautifulSoup(html, 'html.parser')
    for t in soup(['script', 'style', 'noscript', 'svg', 'nav', 'footer']):
        t.decompose()
    blocks = []
    for el in soup.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'blockquote', 'td', 'th', 'dd', 'dt', 'pre', 'figcaption']):
        txt = ' '.join(el.get_text(' ', strip=True).split())
        if txt and (not blocks or blocks[-1] != txt):
            blocks.append(txt)
    text = '\n\n'.join(blocks)
    if len(text) < 400:  # div-soup pages: fall back to all text
        text = soup.get_text('\n', strip=True)
    return text


def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-').replace(' ', ' ').replace('­', '')
    s = re.sub(r'-\s*\n\s*', '', s)  # hyphenated line breaks in PDFs
    return re.sub(r'\s+', ' ', s).strip().lower()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    url = sys.argv[1]
    try:
        raw, ctype = fetch(url)
        text = to_text(raw, ctype, url)
    except Exception as e:  # noqa: BLE001
        print(f'FETCH-ERROR {type(e).__name__}: {e}')
        sys.exit(2)
    if '--check' in sys.argv:
        q = sys.argv[sys.argv.index('--check') + 1]
        ok = norm(q) in norm(text)
        if not ok:  # tolerate ellipses: every fragment must be present
            frags = [f for f in re.split(r'\s*(?:\.\.\.|…|\[\.\.\.\])\s*', q) if len(f.strip()) > 12]
            ok = bool(frags) and all(norm(f) in norm(text) for f in frags)
        print('FOUND' if ok else 'NOT-FOUND')
        sys.exit(0 if ok else 1)
    if '--grep' in sys.argv:
        g = norm(sys.argv[sys.argv.index('--grep') + 1])
        hits = [p for p in text.split('\n\n') if g in norm(p)]
        if not hits:  # PDFs: search a sliding window of the flat text
            flat = ' '.join(text.split())
            i = norm(flat).find(g)
            if i >= 0:
                hits = [flat[max(0, i - 600): i + 900]]
        print('\n\n---\n\n'.join(hits) if hits else 'NO-MATCH')
        return
    print(text)


if __name__ == '__main__':
    main()
