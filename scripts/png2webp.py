#!/usr/bin/env python
"""Lee una imagen (PNG/JPG) por stdin y escribe WebP por stdout.
Uso: png2webp.py [quality] [max_size]   (defaults: 82, 2048)"""
import sys
import io
from PIL import Image

quality = int(sys.argv[1]) if len(sys.argv) > 1 else 82
max_size = int(sys.argv[2]) if len(sys.argv) > 2 else 2048

data = sys.stdin.buffer.read()
im = Image.open(io.BytesIO(data))

# Conserva alfa si la hay; si no, RGB.
im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')

if max_size and (im.width > max_size or im.height > max_size):
    im.thumbnail((max_size, max_size), Image.LANCZOS)

out = io.BytesIO()
im.save(out, 'WEBP', quality=quality, method=6)
sys.stdout.buffer.write(out.getvalue())
