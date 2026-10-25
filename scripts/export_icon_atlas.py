#!/usr/bin/env python3
"""Optional asset extraction. Does NOT run in production or change map logic.
Requires Pillow (pip install pillow). This reads committed 6x3 atlas and writes
one transparent 48px PNG per icon. High-resolution 96px crops and full
original source image were delivered in the ChatGPT conversation ZIP.
"""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1] / "assets" / "icons"
manifest = json.loads((root / "icon-pack-18.manifest.json").read_text(encoding="utf-8"))
atlas = Image.open(root / manifest["atlas"]).convert("RGBA")
assert tuple(atlas.size) == tuple(manifest["atlasSize"])
dst = root / "individual"
dst.mkdir(exist_ok=True)
for item in manifest["icons"]:
    x,y,w,h = item["rectangle"]
    file = dst / (item["key"] + ".png")
    atlas.crop((x,y,x+w,y+h)).save(file,optimize=True)
print(f"Exported {len(manifest['icons'])} icons to {dst}")
