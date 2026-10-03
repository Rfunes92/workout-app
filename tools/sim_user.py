#!/usr/bin/env python3
"""Mount Up simulated user (stdlib only). Logs TODAY's food, workout and (Wed/Sat) weigh-in for the test account,
in the app's exact Firestore format: users/{uid}/data/{workout,prefs,foodlib,weights}, users/{uid}/foodDays/{date},
each {j: JSON string, updatedAt: client ms, su: server time, dev}. Profile: users/{uid} {email, displayName, createdAt, lastActive}.
Idempotent per day: content is deterministic per date and docs are only rewritten when they differ.
Usage: python3 tools/sim_user.py [--date YYYY-MM-DD]
Creds: tools/.testuser.json (gitignored). Usage log: tools/sim_usage.csv (date, reads, writes, bytes)."""
import json, os, re, sys, time, random, datetime, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KEY = re.search(r"apiKey: '([^']+)'", open(os.path.join(ROOT, 'js/cloud.js')).read()).group(1)
PROJECT = 'torque-fit-e1bae'
DOCS = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
C = {'reads': 0, 'writes': 0, 'bytes': 0}

def http(url, body=None, token=None, method=None):
    h = {'Content-Type': 'application/json'}
    if token: h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    try: return json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        raise SystemExit(f'HTTP {e.code} {url}: {e.read().decode()[:300]}')

# ---------- deterministic daily content ----------
SEED = {  # id: (name, per100 [kcal,p,c,f,fiber], [(serving label, grams)]) copied from js/foods-seed.js
    'greek_yogurt_nonfat': ('Greek yogurt, plain, nonfat', [59, 10.3, 3.6, 0.4, 0], [('1 container (170 g)', 170)]),
    'oats': ('Oats, rolled, dry', [379, 13.2, 67.7, 6.5, 10.1], [('1/2 cup dry (40 g)', 40)]),
    'egg_large': ('Egg, whole, large', [143, 12.6, 0.7, 9.5, 0], [('1 large egg', 50)]),
    'chicken_breast_cooked': ('Chicken breast, skinless, cooked', [165, 31, 0, 3.6, 0], [('4 oz cooked', 113), ('1 breast (~6 oz)', 172)]),
    'turkey_93': ('Ground turkey 93/7, raw', [150, 18.6, 0, 8, 0], [('4 oz raw', 113)]),
    'salmon_cooked': ('Salmon, Atlantic, cooked', [206, 22.1, 0, 12.4, 0], [('4 oz cooked', 113), ('1 fillet (~6 oz)', 170)]),
    'chicken_thigh_cooked': ('Chicken thigh, skinless, cooked', [209, 25.9, 0, 10.9, 0], [('1 thigh (~3 oz)', 85), ('4 oz cooked', 113)]),
    'rice_white': ('White rice, cooked', [130, 2.7, 28.2, 0.3, 0.4], [('1 cup cooked', 158)]),
    'sweet_potato': ('Sweet potato, baked', [90, 2, 20.7, 0.2, 3.3], [('1 medium', 114)]),
    'tortilla_flour': ('Tortilla, flour (8")', [306, 8.2, 49.4, 8, 3.5], [('1 tortilla (49 g)', 49)]),
    'whey_scoop': ('Whey protein powder (typical)', [387, 77.4, 9.7, 4.8, 0], [('1 scoop (31 g)', 31)]),
    'peanut_butter': ('Peanut butter', [588, 25, 20, 50, 6], [('2 tbsp', 32)]),
    'banana': ('Banana', [89, 1.1, 22.8, 0.3, 2.6], [('1 medium', 118)]),
    'almonds': ('Almonds', [579, 21.2, 21.6, 49.9, 12.5], [('1 oz (~23 nuts)', 28)]),
}
POOLS = [  # (meal, [(food, serving idx, [q options])])
    ('breakfast', [('greek_yogurt_nonfat', 0, [1, 1.5, 2]), ('oats', 0, [1.5, 2]), ('egg_large', 0, [3, 4])]),
    ('lunch', [('chicken_breast_cooked', 1, [1, 1.5]), ('turkey_93', 0, [1.5, 2])]),
    ('dinner', [('salmon_cooked', 1, [1, 1.5]), ('chicken_thigh_cooked', 1, [2, 3])]),
    ('dinner', [('rice_white', 0, [1, 1.5, 2]), ('sweet_potato', 0, [1.5, 2]), ('tortilla_flour', 0, [2, 3])]),
    ('snacks', [('whey_scoop', 0, [1, 1.5, 2]), ('peanut_butter', 0, [1]), ('banana', 0, [1, 2]), ('almonds', 0, [1, 1.5])]),
]
def entry(fid, si, q, eid):
    name, per, sv = SEED[fid]; g = sv[si][1] * q / 100
    n = {k: round(v * g, 2) for k, v in zip(['kcal', 'p', 'c', 'f', 'fiber'], per)}
    return {'eid': eid, 'fid': 'seed:' + fid, 'si': si, 'q': q, 'sl': sv[si][0], 'name': name, 'brand': '', 'n': n}
def food_day(date):
    rng = random.Random('food' + date)
    for _ in range(5000):
        picks = [(m, *rng.choice(opts)) for m, opts in POOLS]
        es = [(m, entry(f, si, rng.choice(qs), f'esim{date.replace("-", "")}{i}')) for i, (m, f, si, qs) in enumerate(picks)]
        if rng.random() < 0.3: es.pop(4)  # some days only 4 entries
        kcal = sum(e['n']['kcal'] for _, e in es); p = sum(e['n']['p'] for _, e in es)
        if 2000 <= kcal <= 2300 and 150 <= p <= 200: break
    day = {'breakfast': [], 'lunch': [], 'dinner': [], 'snacks': [], 'water': rng.choice([64, 80, 96, 112])}
    for m, e in es: day[m].append(e)
    return day, round(kcal), round(p)

LIFTS = {'goblet_squat': 50, 'db_bench': 45, 'chest_supported_row': 40, 'db_rdl': 50, 'standing_db_press': 30, 'incline_db_curl': 20, 'skull_crusher': 25, 'pallof_press': 20, 'kb_swing': 35}
def lift_w(ex, date, start):
    wk = (datetime.date.fromisoformat(date) - datetime.date.fromisoformat(start)).days // 7
    base = LIFTS.get(ex) or 20 + (sum(map(ord, ex)) % 8) * 5  # deterministic fallback for gym-day exercises
    return str(base + 5 * (wk // 2))  # +5 lb every two weeks
def weigh(date, start):
    d = (datetime.date.fromisoformat(date) - datetime.date.fromisoformat(start)).days
    return round(230 - d * 0.14 + random.Random('wt' + date).uniform(-0.6, 0.6), 1)  # ~1 lb/week down

# ---------- Firestore REST helpers ----------
def get(path, tok):
    C['reads'] += 1; return http(f'{DOCS}/{path}', token=tok)
def jdoc(doc):
    try: return json.loads(doc['fields']['j']['stringValue'])
    except Exception: return None
def wdoc(uid, path, obj, now_ms):
    s = json.dumps(obj, separators=(',', ':'))
    return {'update': {'name': f'projects/{PROJECT}/databases/(default)/documents/users/{uid}/{path}',
                       'fields': {'j': {'stringValue': s}, 'updatedAt': {'integerValue': str(now_ms)}, 'dev': {'stringValue': 'sim'}}},
            'updateTransforms': [{'fieldPath': 'su', 'setToServerValue': 'REQUEST_TIME'}]}

def main():
    date = sys.argv[sys.argv.index('--date') + 1] if '--date' in sys.argv else datetime.date.today().isoformat()
    cred = json.load(open(os.path.join(HERE, '.testuser.json')))
    plan = json.load(open(os.path.join(HERE, 'sim_plan.json')))
    auth = http(f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={KEY}', {'email': cred['email'], 'password': cred['password'], 'returnSecureToken': True})
    tok, uid = auth['idToken'], auth['localId']; now = int(time.time() * 1000); writes = []

    # profile (createdAt only if missing)
    prof = get(f'users/{uid}', tok); pf = (prof or {}).get('fields', {})
    fields = {'email': {'stringValue': cred['email']}, 'displayName': {'stringValue': cred.get('displayName', 'Tank')}}
    if 'createdAt' not in pf: fields['createdAt'] = {'timestampValue': datetime.datetime.fromtimestamp(cred['createdAtMs'] / 1000, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')}
    writes.append({'update': {'name': f'projects/{PROJECT}/databases/(default)/documents/users/{uid}', 'fields': fields},
                   'updateMask': {'fieldPaths': list(fields)}, 'updateTransforms': [{'fieldPath': 'lastActive', 'setToServerValue': 'REQUEST_TIME'}]})

    # workout: app state with today's session completed + logged weights
    wd = jdoc(get(f'users/{uid}/data/workout', tok) or {}) 
    st = json.loads(json.dumps(wd)) if wd else dict(plan['baseState'])
    today = plan['days'].get(date)
    if not today:  # beyond the precomputed window: reuse the same weekday from the last week
        wkday = datetime.date.fromisoformat(date).weekday(); today = next(v for k, v in sorted(plan['days'].items(), reverse=True) if datetime.date.fromisoformat(k).weekday() == wkday)
    st.setdefault('done', {}); st.setdefault('log', {})
    st['done'][date] = {f"{today['day']}:{it['key']}": [True] * it['sets'] for it in today['items']}
    for it in today['items']:
        if it['kind'] not in ('mobility', 'cardio') and it['exId']: st['log'][it['exId']] = {'w': lift_w(it['exId'], date, plan['startDate']), 'd': date}
    cutoff = (datetime.date.fromisoformat(date) - datetime.timedelta(days=21)).isoformat()
    st['done'] = {k: v for k, v in st['done'].items() if k >= cutoff}  # same 21-day pruning as the app
    if st != wd: writes.append(wdoc(uid, 'data/workout', st, now))

    # prefs (once)
    if not get(f'users/{uid}/data/prefs', tok):
        writes.append(wdoc(uid, 'data/prefs', {'theme': 'dark', 'goals': {'kcal': 2200, 'protein': 180, 'macroMode': 'auto', 'fatShare': 40, 'carbs': 210, 'fat': 62, 'fiberOn': True, 'fiber': 30, 'waterOn': True, 'water': 100, 'waterStep': 16, 'waterUnit': 'oz'}, 'settings': None}, now))

    # food day
    day, kcal, p = food_day(date)
    if jdoc(get(f'users/{uid}/foodDays/{date}', tok) or {}) != day: writes.append(wdoc(uid, f'foodDays/{date}', day, now))

    # weigh-in Wed + Sat
    wt = None
    if datetime.date.fromisoformat(date).weekday() in (2, 5):
        wdocv = jdoc(get(f'users/{uid}/data/weights', tok) or {}) or {'weights': {}}
        wt = weigh(date, plan['startDate']); new = {'weights': dict(wdocv.get('weights') or {}, **{date: wt})}
        if new != wdocv: writes.append(wdoc(uid, 'data/weights', new, now))

    body = {'writes': writes}
    http(f'{DOCS}:commit', body, tok)
    C['writes'] += len(writes); C['bytes'] += len(json.dumps(body, separators=(',', ':')).encode())
    csv = os.path.join(HERE, 'sim_usage.csv'); new_csv = not os.path.exists(csv)
    with open(csv, 'a') as f:
        if new_csv: f.write('date,reads,writes,bytes\n')
        f.write(f"{date},{C['reads']},{C['writes']},{C['bytes']}\n")
    print(f"{date} {cred['email']}: {today['type']} session ({len(today['items'])} items) done, food {sum(len(day[m]) for m in ('breakfast','lunch','dinner','snacks'))} entries {kcal} kcal / {p} g P"
          f"{f', weigh-in {wt} lb' if wt else ''} | reads {C['reads']}, writes {C['writes']}, ~{C['bytes']} B")

if __name__ == '__main__': main()
