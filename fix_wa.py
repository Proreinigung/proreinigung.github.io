#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, os

BASE = r'C:\Users\nabil\Desktop\Projet'
PAGES = ['services.html','about.html','blog.html','careers.html','contact.html','quote.html']

for filename in PAGES:
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Remove leftover <a class="whatsapp-btn">...</a>\n</div> pattern
    html = re.sub(
        r'\s*<a href="https://wa\.me/[^"]*"[^>]*class="whatsapp-btn"[^>]*>[\s\S]*?</a>\s*</div>',
        '',
        html
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  Fixed: {filename}')

print('Done.')
