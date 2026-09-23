#!/usr/bin/env python3
"""
apply-verdicts.py — fold the adversarial verification pass back into the
research files.

    python3 tools/apply-verdicts.py            # all slices
    python3 tools/apply-verdicts.py agents     # one slice
    python3 tools/apply-verdicts.py --dry-run

Each research slice (research/<slice>.json) was checked by independent
verifiers that re-fetched every source and tried to refute every record.
Their verdicts are in research/verify/<slice>-<n>.json:

    { "verdicts": [ { "kind", "id", "status": OK|FIXED|DOWNGRADED|DROP,
                      "issues": [...], "fieldFixes": {...},
                      "sourceFixes": [ { "index", ...fields } ],
                      "addSources": [ Source... ] } ] }

This script applies them:
  - fieldFixes replace fields on the record (dotted paths such as
    "points[3].value" reach into nested structures);
  - sourceFixes update the record's source objects by index (a downgrade
    keeps the verifier's reason in the source note);
  - addSources are appended;
  - DROP moves the record out of the slice into "dropped", with the reasons,
    so nothing disappears without a trace;
  - every touched record gets a "_verify" stamp { status, issues } for the
    audit trail (the build ignores it).
The verdict files are kept as the record of the check.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = '--dry-run' in sys.argv
only = [a for a in sys.argv[1:] if not a.startswith('--')]

KIND_KEYS = {
    'event': 'events', 'events': 'events', 'quant': 'quant', 'series': 'series',
    'myth': 'myths', 'myths': 'myths', 'image': 'images', 'images': 'images', 'media': 'images',
}


def arrays(doc):
    for k, v in doc.items():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            yield k, v
        elif isinstance(v, dict):  # e.g. the "standard" object's arrays
            for k2, v2 in v.items():
                if isinstance(v2, list) and v2 and isinstance(v2[0], dict):
                    yield f'{k}.{k2}', v2


def same(r, rid):
    """Records without an id are named by the verifiers from another field:
    a scenario 'step-3', a milestone by its date, an agreement type by its
    name."""
    rid = str(rid)
    if r.get('id') == rid or r.get('code') == rid:
        return True
    if 'id' not in r:
        if r.get('step') is not None and rid in (f"step-{r['step']}", str(r['step'])):
            return True
        if r.get('date') and rid.startswith(str(r['date'])):
            return True
        for f in ('type', 'name'):
            if r.get(f) and rid == r[f]:
                return True
    return False


def find(doc, kind, rid):
    key = KIND_KEYS.get(kind, kind)
    cands = []
    for k, arr in arrays(doc):
        if k == key or k.endswith('.' + key) or key not in KIND_KEYS.values():
            for i, r in enumerate(arr):
                if same(r, rid):
                    cands.append((k, arr, i))
    if not cands:  # kind label did not match an array name: search everything
        for k, arr in arrays(doc):
            for i, r in enumerate(arr):
                if same(r, rid):
                    cands.append((k, arr, i))
    if not cands and isinstance(doc.get(kind), dict):  # a single object, e.g. "standard"
        return (kind, None, doc[kind])
    return cands[0] if cands else None


def set_path(obj, path, value):
    parts = re.findall(r'[^.\[\]]+|\[\d+\]', path)
    cur = obj
    for j, p in enumerate(parts):
        last = j == len(parts) - 1
        if p.startswith('['):
            idx = int(p[1:-1])
            if last:
                cur[idx] = value
            else:
                cur = cur[idx]
        else:
            if last:
                cur[p] = value
            else:
                cur = cur.setdefault(p, {})


def source_list(rec):
    if isinstance(rec.get('sources'), list):
        return rec['sources']
    if isinstance(rec.get('evidence'), list):  # the argument records
        return rec['evidence']
    if isinstance(rec.get('source'), list):
        return rec['source']
    if isinstance(rec.get('source'), dict):
        rec['source'] = [rec['source']]
        return rec['source']
    rec['sources'] = []
    return rec['sources']


def apply_slice(slice_):
    path = os.path.join(ROOT, 'research', slice_ + '.json')
    if not os.path.exists(path):
        return None
    doc = json.load(open(path))
    files = sorted(glob.glob(os.path.join(ROOT, 'research', 'verify', slice_ + '-*.json')))
    stats = {'files': len(files), 'OK': 0, 'FIXED': 0, 'DOWNGRADED': 0, 'DROP': 0, 'missing': []}
    drops = []
    for f in files:
        try:
            v = json.load(open(f))
        except Exception as e:  # noqa: BLE001
            print(f'  ! {os.path.basename(f)} does not parse: {e}')
            continue
        for vd in v.get('verdicts', []):
            rid, kind, st = vd.get('id'), vd.get('kind', ''), str(vd.get('status', 'OK')).upper()
            hit = find(doc, kind, rid)
            if not hit:
                stats['missing'].append(f'{kind}:{rid}')
                continue
            key, arr, i = hit
            rec = arr[i] if arr is not None else i
            stats[st] = stats.get(st, 0) + 1
            if st == 'DROP' and arr is not None:
                drops.append((arr, rec, key, vd))
                continue
            for fp, val in (vd.get('fieldFixes') or {}).items():
                try:
                    set_path(rec, fp, val)
                except (IndexError, KeyError, TypeError) as e:
                    print(f'  ! {rid}: could not set {fp}: {e}')
            srcs = source_list(rec) if (vd.get('sourceFixes') or vd.get('addSources')) else None
            for sf in vd.get('sourceFixes') or []:
                idx = sf.get('index')
                if not isinstance(idx, int) or idx >= len(srcs):
                    print(f'  ! {rid}: sourceFix index {idx} out of range')
                    continue
                s = srcs[idx]
                for k2 in ('institution', 'title', 'date', 'url', 'quote', 'accessType'):
                    if sf.get(k2):
                        s[k2] = sf[k2]
                if sf.get('verificationStatus'):
                    s['verificationStatus'] = sf['verificationStatus']
                    if sf['verificationStatus'] == 'PENDING' and sf.get('note'):
                        s['note'] = ((s.get('note') or '') + ' Verification: ' + sf['note']).strip()
            for add in vd.get('addSources') or []:
                if isinstance(add, dict) and add.get('url'):
                    srcs.append(add)
            rec['_verify'] = {'status': st, 'issues': vd.get('issues') or []}
    for arr, rec, key, vd in drops:
        if rec in arr:
            arr.remove(rec)
            doc.setdefault('dropped', []).append({'from': key, 'id': rec.get('id') or rec.get('code'),
                                                  'reasons': vd.get('issues') or [], 'record': rec})
    if not DRY:
        json.dump(doc, open(path, 'w'), indent=1, ensure_ascii=False)
        open(path, 'a').write('\n')
    return stats


def main():
    slices = only or sorted({os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ROOT, 'research', '*.json'))})
    for s in slices:
        st = apply_slice(s)
        if st is None:
            print(f'{s}: no research file')
            continue
        miss = f", {len(st['missing'])} verdicts matched nothing ({', '.join(st['missing'][:6])})" if st['missing'] else ''
        print(f"{s}: {st['files']} verdict files · OK {st['OK']} · FIXED {st['FIXED']} · "
              f"DOWNGRADED {st['DOWNGRADED']} · DROP {st['DROP']}{miss}{' (dry run)' if DRY else ''}")


if __name__ == '__main__':
    main()
