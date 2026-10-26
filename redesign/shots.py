"""The redesign's screenshots: every page of the landing at 1440, 768, 390 and 320 px, reduced motion, and the hero's
three revisions. Looked at, not asserted: §4 of the brief scores what these show.

    python3 redesign/shots.py [base url]        (default the live site; a local build: `node scripts/serve-site.mjs --port <p>`)
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'https://vibecad.commandagi.app'
OUT = Path(__file__).parent / 'shots'
OUT.mkdir(exist_ok=True)
WIDTHS = {1440: 900, 768: 1024, 390: 844, 320: 640}

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for width, height in WIDTHS.items():
        for motion in ('no-preference', 'reduce'):
            if motion == 'reduce' and width not in (1440, 390):
                continue
            page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion=motion)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(f'{BASE}/', wait_until='load')
            page.wait_for_selector('.bv[data-ready]', timeout=20000)
            page.wait_for_timeout(900)
            tag = f'{width}' + ('-reduced' if motion == 'reduce' else '')
            page.screenshot(path=str(OUT / f'home-{tag}.png'))
            for rev in ('b', 'c'):
                page.click(f'#rev-tab-{rev}')
                page.wait_for_timeout(1300)
                page.screenshot(path=str(OUT / f'home-{tag}-rev-{rev}.png'))
            # Each sheet scrolled into view: its scroll-driven drawing runs only on the way in.
            for sheet in ('sheet-2', 'sheet-3', 'sheet-4', 'sheet-5', 'notes-title'):
                page.evaluate(f"document.getElementById('{sheet}').scrollIntoView({{block: 'start'}})")
                page.mouse.wheel(0, 1)
                page.wait_for_timeout(900)
                page.screenshot(path=str(OUT / f'home-{tag}-{sheet}.png'))
            print(tag, 'errors:', errors)
            page.close()
    for path in ('/es/', '/zh-Hans/', '/studio/'):
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto(f'{BASE}{path}', wait_until='load')
        page.wait_for_timeout(2500)
        page.screenshot(path=str(OUT / f"{path.strip('/').replace('/', '-')}-1440.png"))
        page.close()
    browser.close()

# Kept as WebP: the repository carries the evidence, not 7 MB of PNG.
from PIL import Image
for png in OUT.glob('*.png'):
    Image.open(png).save(png.with_suffix('.webp'), quality=82)
    png.unlink()
