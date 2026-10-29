"""Derive timeline-cart.js from timeline.js: the same video, but it opens on the mini-cart
drawer (shirt already in the cart), taps GO TO CART and starts the steps from the code/gift-card step.

  python motion/make-cart-timeline.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'timeline.js'), encoding='utf-8') as f:
    js = f.read()
TL = json.loads(js[js.index('{'):js.rindex('}') + 1])

CART_START = 14.4     # GO TO CART tap in the drawer, in the full video
LAND = 4.25           # ...lands here, just after the phone has risen in (2.6-3.5s)
OFF = CART_START - LAND
GONE = -99            # moments that belong to the skipped part

def sh(t):
    return t if t >= 90 else round(t - OFF, 3)

cart_i = [s[0] for s in TL['screens']].index('sProduct')   # product page stays behind the drawer
screens = [[n, a, b] for n, a, b in TL['screens'][cart_i:]]
screens[0][1] = -9
TL['screens'] = [[n, a if a < 0 else sh(a), sh(b)] for n, a, b in screens]
TL['taps'] = [[sh(t), e] for t, e in TL['taps'] if t >= CART_START]
TL['typing'] = [[i, sh(a), sh(b), s] for i, a, b, s in TL['typing']]
TL['selects'] = [[i, sh(a), v] for i, a, v in TL['selects']]
TL['scrolls'] = [[i, sh(a), sh(b), d] if a >= CART_START else [i, GONE, GONE + .1, d] for i, a, b, d in TL['scrolls'] if i in ('lProduct', 'lPortal')]
TL['layerScrolls'] = [[l, sh(a), sh(b), i, y] for l, a, b, i, y in TL['layerScrolls']]
TL['crumbs'] = []
m = TL['moments']
for k in ('size', 'toastIn', 'toastOut'):
    m[k] = GONE
m['badge'] = m['drawerIn'] = -9                   # shirt already in the cart, drawer already open
for k, v in m.items():
    if v > 0: m[k] = sh(v)
TL['steps'] = [GONE, GONE, 3.0] + [sh(t) for t in TL['steps'][3:]]
TL['drums'] = [3.5, sh(TL['drums'][1])]
TL['duration'] = round(TL['duration'] - OFF, 2)
TL['tapOn'] = 3.4
TL['startAtCart'] = True

with open(os.path.join(HERE, 'timeline-cart.js'), 'w', encoding='utf-8') as f:
    f.write('window.TL_CART = ' + json.dumps(TL, ensure_ascii=False, indent=2) + ';\n')
print('duration', TL['duration'], 'steps', TL['steps'])
