"""Extract supplied PDF scene artwork for the local implementation.

Usage: python scripts/extract-reference.py <source-pdf>
The source PDF remains unchanged. Extracted images are reference assets.
"""

from pathlib import Path
import sys
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
output = root / "reference"
output.mkdir(exist_ok=True)
reader = PdfReader(sys.argv[1])
names = {4: "landing", 5: "name-entry", 6: "prologue", 7: "question", 8: "journey"}
for page, name in names.items():
    scene = max(reader.pages[page].images, key=lambda image: image.image.width)
    scene.image.save(output / f"{name}.png")
    print(name, scene.image.size)
