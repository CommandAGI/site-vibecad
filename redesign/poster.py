"""The hero's poster frame and the site's share images, rendered from the built site (the part as three.js draws it,
before any callout): public/media/bracket-poster.webp, public/og.png (1200 × 630), public/apple-touch-icon.png.

    python3 redesign/poster.py [base url]      then FFMPEG=… to convert the poster to WebP (printed below)
"""
import sys, subprocess, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
ROOT = Path(__file__).parent.parent
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=2, reduced_motion='reduce')
    page.goto(f'{BASE}/', wait_until='load')
    page.wait_for_selector('.bv[data-ready]')
    page.add_style_tag(content='.bv-overlay,.bv-balloons{display:none!important}.bv{background:transparent}')
    page.wait_for_timeout(800)
    page.locator('.bv canvas').screenshot(path='/tmp/bracket-poster.png', omit_background=True)
    # The share image: the first sheet itself, cropped to 1200 × 630 with the title block in its corner.
    og = browser.new_page(viewport={'width': 1200, 'height': 630}, reduced_motion='reduce')
    og.goto(f'{BASE}/', wait_until='load')
    og.wait_for_selector('.bv[data-ready]')
    og.add_style_tag(content='.hero-lead,.rev-panel,.rev-tabs,.hero-figure figcaption{display:none!important}.hero-stage{grid-template-areas:"copy figure" "copy figure"!important;grid-template-columns:5fr 6fr!important;align-content:center}.hero h1{font-size:64px!important}.bv{max-height:none!important}')
    og.wait_for_timeout(900)
    og.screenshot(path=str(ROOT / 'public/og.png'))
    icon = browser.new_page(viewport={'width': 180, 'height': 180})
    svg = (ROOT / 'public/favicon.svg').read_text()
    icon.set_content(f'<body style="margin:0;background:#eeece6">{svg.replace("<svg", "<svg width=180 height=180", 1)}</body>')
    icon.screenshot(path=str(ROOT / 'public/apple-touch-icon.png'))
    browser.close()
subprocess.run([FFMPEG, '-loglevel', 'error', '-y', '-i', '/tmp/bracket-poster.png', '-vf', 'scale=1200:-2', '-c:v', 'libwebp', '-quality', '82', str(ROOT / 'public/media/bracket-poster.webp')], check=True)
print('poster, og.png and apple-touch-icon.png written')
