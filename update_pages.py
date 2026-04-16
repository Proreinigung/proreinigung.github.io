#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply new Proreinigung design to all public pages.
Run: python update_pages.py
"""

import re, os

BASE = r'C:\Users\nabil\Desktop\Projet'

# ── Shared HTML blocks ──────────────────────────────────────────────────────

def make_navbar(active):
    links = [
        ('index.html',    'Startseite'),
        ('services.html', 'Leistungen'),
        ('about.html',    'Über uns'),
        ('blog.html',     'Blog'),
        ('careers.html',  'Karriere'),
        ('contact.html',  'Kontakt'),
    ]
    items = ''
    for href, label in links:
        key = href.replace('.html','')
        cls = ' active' if key == active else ''
        items += f'\n      <a href="{href}" class="nav-link-item{cls}">{label}</a>'
    return f'''<nav id="pr-navbar" class="transparent">
  <div class="pr-nav-inner">
    <a href="index.html">
      <img src="assets/images/logo.png" alt="Proreinigung" style="height:90px;width:auto;display:block">
    </a>
    <div class="pr-nav-links">{items}
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <a href="login.html" class="nav-login-link">Anmelden</a>
      <a href="quote.html" class="pr-btn pr-btn-yellow" style="padding:10px 20px;font-size:.82rem">
        Angebot anfragen
        <span class="arrow" style="width:26px;height:26px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </a>
    </div>
    <button class="pr-hamburger" id="pr-ham" aria-label="Menü">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile menu -->
<div class="pr-mobile-menu" id="pr-mobile">
  <a href="index.html">Startseite</a>
  <a href="services.html">Leistungen</a>
  <a href="about.html">Über uns</a>
  <a href="blog.html">Blog</a>
  <a href="careers.html">Karriere</a>
  <a href="contact.html">Kontakt</a>
  <div class="pr-mobile-actions">
    <a href="login.html" class="pr-btn pr-btn-outline-white">Anmelden</a>
    <a href="quote.html" class="pr-btn pr-btn-yellow">Angebot anfragen <span class="arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg></span></a>
  </div>
</div>'''

NEW_CTA = '''<section id="pr-cta">
  <div class="pr-container">
    <div class="pr-cta-inner">
      <div class="pr-cta-text sr">
        <strong>Bereit für makellose Sauberkeit?<br>Jetzt Angebot anfordern.</strong>
        <p>Kontaktieren Sie uns — Ihr Angebot ist kostenlos und unverbindlich.</p>
      </div>
      <div class="pr-cta-actions sr sr-d1">
        <a href="quote.html" class="pr-btn pr-btn-blue">
          Kostenloses Angebot
          <span style="width:28px;height:28px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </a>
        <a href="tel:+4906548796557" class="pr-btn" style="background:var(--pr-dark);color:#fff">
          <i class="fas fa-phone" style="font-size:.85rem"></i> Jetzt anrufen
        </a>
      </div>
    </div>
  </div>
</section>'''

NEW_FOOTER = '''<footer id="pr-footer">
  <div class="pr-container">
    <div class="pr-footer-grid">
      <div class="pr-footer-brand">
        <img src="assets/images/logo.png" alt="Proreinigung" style="height:90px;width:auto">
        <p>Ihr zuverlässiger Reinigungspartner in Deutschland. Professionell, nachhaltig und effizient — seit über 15 Jahren.</p>
        <div class="pr-footer-social">
          <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
          <a href="#" aria-label="XING"><i class="fab fa-xing"></i></a>
        </div>
      </div>
      <div class="pr-footer-col">
        <h4>Leistungen</h4>
        <ul>
          <li><a href="services.html">Büroreinigung</a></li>
          <li><a href="services.html">Industriereinigung</a></li>
          <li><a href="services.html">Glasreinigung</a></li>
          <li><a href="services.html">Grundreinigung</a></li>
          <li><a href="services.html">Fassadenreinigung</a></li>
          <li><a href="services.html">Teppichreinigung</a></li>
          <li><a href="services.html">Parkhausreinigung</a></li>
          <li><a href="services.html">Krankenhausreinigung</a></li>
        </ul>
      </div>
      <div class="pr-footer-col">
        <h4>Unternehmen</h4>
        <ul>
          <li><a href="about.html">Über uns</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="careers.html">Karriere</a></li>
          <li><a href="quote.html">Angebot anfragen</a></li>
          <li><a href="contact.html">Kontakt</a></li>
          <li><a href="login.html">Mein Konto</a></li>
        </ul>
      </div>
      <div class="pr-footer-col">
        <h4>Kontakt</h4>
        <div class="pr-footer-contact">
          <div class="pr-footer-contact-item">
            <div class="ic"><i class="fab fa-whatsapp"></i></div>
            <div class="tx"><a href="https://wa.me/4906548796557">+49 06548 796557</a></div>
          </div>
          <div class="pr-footer-contact-item">
            <div class="ic"><i class="fas fa-envelope"></i></div>
            <div class="tx"><a href="mailto:Proreinigung@gmail.com">Proreinigung@gmail.com</a></div>
          </div>
          <div class="pr-footer-contact-item">
            <div class="ic"><i class="fas fa-map-marker-alt"></i></div>
            <div class="tx">Musterstraße 1<br>80331 München</div>
          </div>
          <div class="pr-footer-contact-item">
            <div class="ic"><i class="fas fa-clock"></i></div>
            <div class="tx">Mo–Fr: 07:00–18:00<br>Sa: 08:00–14:00</div>
          </div>
        </div>
      </div>
    </div>
    <div class="pr-footer-bottom">
      <p>© 2026 Proreinigung GmbH. Alle Rechte vorbehalten.</p>
      <div class="pr-footer-legal">
        <a href="#">Impressum</a>
        <a href="#">Datenschutz</a>
        <a href="#">AGB</a>
      </div>
    </div>
  </div>
</footer>'''

NEW_WA = '''<div class="wa-float">
  <a href="https://wa.me/4906548796557" target="_blank" class="wa-btn" aria-label="WhatsApp">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>
</div>'''

NEW_SCRIPTS = '''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
<script src="js/auth.js"></script>
<script src="js/db.js"></script>
<script src="js/realtime.js"></script>
<script src="js/main.js"></script>
<script>
// Navbar scroll
const navbar = document.getElementById('pr-navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('solid', window.scrollY > 60);
    navbar.classList.toggle('transparent', window.scrollY <= 60);
    const bt = document.getElementById('back-top');
    if (bt) bt.classList.toggle('show', window.scrollY > 400);
  });
}
// Mobile menu
const ham = document.getElementById('pr-ham');
const mob = document.getElementById('pr-mobile');
if (ham && mob) {
  ham.addEventListener('click', () => mob.classList.toggle('open'));
  mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mob.classList.remove('open')));
}
// Scroll reveal
const srObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); srObs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.sr,.sr-left,.sr-right').forEach(el => srObs.observe(el));
// Auth link
(async () => {
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      document.querySelectorAll('a[href="login.html"]').forEach(el => { el.href = 'dashboard.html'; el.textContent = 'Mein Konto'; });
    }
  } catch(e) {}
})();
</script>'''

BACK_TOP = '''<button class="back-top" id="back-top" aria-label="Nach oben" onclick="window.scrollTo({top:0,behavior:'smooth'})">
  <i class="fas fa-arrow-up"></i>
</button>'''

# ── Page configs ────────────────────────────────────────────────────────────

PAGES = {
    'services.html': 'services',
    'about.html':    'about',
    'blog.html':     'blog',
    'careers.html':  'careers',
    'contact.html':  'contact',
    'quote.html':    'quote',
}

# ── Helper: transform page-hero section ─────────────────────────────────────

def transform_hero(html):
    """Replace old .page-hero with new .pr-page-hero keeping inner content."""
    pattern = re.compile(
        r'<section class="page-hero">\s*<div class="container">(.*?)</div>\s*</section>',
        re.DOTALL
    )
    def replacer(m):
        inner = m.group(1)
        # eyebrow: section-label span → .eyebrow span
        inner = re.sub(
            r'<span class="section-label"[^>]*>(.*?)</span>',
            r'<span class="eyebrow">\1</span>',
            inner, flags=re.DOTALL
        )
        # subtitle p → p.sub
        inner = re.sub(r'<p>(.*?)</p>', r'<p class="sub">\1</p>', inner, count=1, flags=re.DOTALL)
        # breadcrumb div
        inner = inner.replace('<div class="breadcrumb">', '<div class="pr-breadcrumb">')
        # strip color on breadcrumb span
        inner = re.sub(r'<span style="color:#fff">(.*?)</span>', r'<span>\1</span>', inner)
        return f'<section class="pr-page-hero">\n  <div class="pr-page-hero-inner">{inner}  </div>\n</section>'
    return pattern.sub(replacer, html)

# ── Helper: replace old script block ────────────────────────────────────────

def replace_scripts(html):
    """Remove all old script tags + toast-container line, add new block before </body>."""
    # Remove existing script src lines (supabase, auth, db, realtime, main)
    html = re.sub(r'<script src="https://cdn\.jsdelivr\.net[^"]*"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script src="supabase\.js"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script src="js/auth\.js"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script src="js/db\.js"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script src="js/realtime\.js"[^>]*></script>\s*', '', html)
    html = re.sub(r'<script src="js/main\.js"[^>]*></script>\s*', '', html)
    # Remove existing inline <script>...</script> blocks that contain navbar/mobile logic
    html = re.sub(r'<script>\s*(?:const navbar|document\.getElementById\(\'hamburger\')[\s\S]*?</script>', '', html)
    # Clean up toast-container / back-to-top lines
    html = re.sub(r'<div class="toast-container"[^>]*></div>\s*', '', html)
    html = re.sub(r'<button class="back-to-top"[^>]*>.*?</button>\s*', '', html, flags=re.DOTALL)
    html = re.sub(r'<button class="back-top"[^>]*>[\s\S]*?</button>\s*', '', html)
    # Add new scripts before </body>
    html = html.replace('</body>', f'\n<div class="toast-container"></div>\n{BACK_TOP}\n{NEW_SCRIPTS}\n</body>')
    return html

# ── Helper: replace old navbar + mobile menu ────────────────────────────────

def replace_navbar(html, active):
    # Old nav id="navbar" + mobile-menu div
    html = re.sub(
        r'<nav id="navbar">[\s\S]*?</nav>\s*<div class="mobile-menu"[\s\S]*?</div>',
        make_navbar(active),
        html
    )
    return html

# ── Helper: replace old CTA ─────────────────────────────────────────────────

def replace_cta(html):
    if '<section id="cta">' not in html:
        return html
    return re.sub(
        r'<section id="cta">[\s\S]*?</section>',
        NEW_CTA,
        html
    )

# ── Helper: replace old footer ───────────────────────────────────────────────

def replace_footer(html):
    html = re.sub(
        r'<footer id="footer"[\s\S]*?</footer>',
        NEW_FOOTER,
        html
    )
    return html

# ── Helper: replace old WhatsApp float ──────────────────────────────────────

def replace_wa(html):
    # Old class: whatsapp-float
    html = re.sub(
        r'<div class="whatsapp-float">[\s\S]*?</div>\s*(?=<)',
        NEW_WA + '\n',
        html
    )
    return html

# ── Helper: add shared.css to head ──────────────────────────────────────────

def add_shared_css(html):
    if 'shared.css' in html:
        return html
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        '<link rel="stylesheet" href="css/style.css">\n<link rel="stylesheet" href="css/shared.css">'
    )
    return html

# ── Process each page ────────────────────────────────────────────────────────

for filename, active in PAGES.items():
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f'  SKIP (not found): {filename}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    html = add_shared_css(html)
    html = replace_navbar(html, active)
    html = transform_hero(html)
    html = replace_cta(html)
    html = replace_footer(html)
    html = replace_wa(html)
    html = replace_scripts(html)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'  OK: {filename}')

print('\nDone.')
