"""Inspect Stage 2 pages and extract their supplied scene images, read-only."""
from pathlib import Path
import sys
from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
out = Path(__file__).resolve().parents[1] / "reference" / "stage2"
out.mkdir(parents=True, exist_ok=True)
print(f"Total pages: {len(reader.pages)}")
for index in range(8, min(15, len(reader.pages))):
    page = reader.pages[index]
    print(f"\nPAGE {index + 1}\n{page.extract_text()}")
    for number, item in enumerate(page.images):
        if item.image.width >= 900:
            filename = out / f"page-{index + 1}-{number}.png"
            item.image.save(filename)
            print(f"Scene: {filename} ({item.image.width} x {item.image.height})")
