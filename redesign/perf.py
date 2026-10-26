"""The landing's budget (brief §3) measured in Chromium: LCP and CLS on a throttled 4G link (1.6 Mbps down, 750 kbps
up, 150 ms RTT) with a 4× slower CPU, and the JavaScript the page transfers before any interaction, split into the
three.js chunk (the WebGL hero, allowed to load after its poster) and the rest. Cold cache, one run per width.

    python3 redesign/perf.py [base url]         (default https://vibecad.commandagi.app)
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = next((a for a in sys.argv[1:] if not a.startswith('--')), None) or 'https://vibecad.commandagi.app'
OBSERVE = """
window.__lcp = 0; window.__cls = 0; window.__lcpWhat = '';
new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpWhat = e.url || (e.element && e.element.tagName + '.' + e.element.className) || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
window.__inp = 0;
new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) { window.__inp = Math.max(window.__inp, e.duration); (window.__slow ||= []).push(e.name + ' ' + Math.round(e.duration) + ' ' + (e.target && e.target.className)); } }).observe({ type: 'event', durationThreshold: 16, buffered: true });
"""
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for width, height in ((1440, 900), (390, 844)):
        context = browser.new_context(viewport={'width': width, 'height': height})
        page = context.new_page()
        cdp = context.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
        cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 1.6e6 / 8, 'uploadThroughput': 750e3 / 8})
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        scripts = {}
        cdp.on('Network.responseReceived', lambda e: scripts.__setitem__(e['requestId'], e['response']['url']) if e['type'] == 'Script' else None)
        sizes = {}
        cdp.on('Network.loadingFinished', lambda e: sizes.__setitem__(e['requestId'], e['encodedDataLength']))
        page.add_init_script(OBSERVE)
        page.goto(f'{BASE}/', wait_until='load', timeout=120000)
        page.wait_for_selector('.bv[data-ready]', timeout=120000)
        page.wait_for_timeout(3000)
        lcp, cls, what = page.evaluate('[window.__lcp, window.__cls, window.__lcpWhat]')
        # The demo's interactions (the slowest one stands for INP): revision B, the wall slider by keyboard at a held
        # key's repeat rate, the material, revision C.
        page.click('#rev-tab-b'); page.wait_for_timeout(600)
        page.focus('.slider input')
        for _ in range(6): page.keyboard.press('ArrowRight'); page.wait_for_timeout(50)  # a held key repeats every 33-50 ms
        page.click('.stamp-choice:nth-of-type(3)'); page.wait_for_timeout(300)
        page.click('#rev-tab-c'); page.wait_for_timeout(800)
        inp = page.evaluate('window.__inp')
        if '--list' in sys.argv: print(page.evaluate('(window.__slow || []).filter(x => +x.split(" ")[1] > 100)'))
        chunks = [(url, sizes.get(i, 0)) for i, url in scripts.items()]
        # three.js is the hero's lazy import (allowed after the poster): its chunks are the ones that carry its renderer.
        three = [c for c in chunks if c[0].startswith(BASE) and any(m in page.request.get(c[0]).text() for m in ('WebGLRenderer', '__THREE__'))]
        total, heavy = sum(s for _, s in chunks), sum(s for _, s in three)
        print(json.dumps({'width': width, 'lcp_ms': round(lcp), 'lcp_element': what, 'cls': round(cls, 4), 'slowest_interaction_ms': round(inp), 'js_kb_total': round(total / 1024, 1), 'js_kb_three': round(heavy / 1024, 1), 'js_kb_before_interaction': round((total - heavy) / 1024, 1), 'scripts': len(chunks)}))
        if '--list' in sys.argv:
            for url, size in sorted(chunks, key=lambda c: -c[1]): print(f'  {size / 1024:7.1f} KB  {url}')
        context.close()
    browser.close()
