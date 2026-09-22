"""Read Stage 4 reference pages without changing the supplied PDF."""
from pathlib import Path
import sys
from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
out = Path(__file__).resolve().parents[1] / "reference" / "stage4"
out.mkdir(parents=True, exist_ok=True)
for index in range(17, min(21, len(reader.pages))):
    page = reader.pages[index]
    print(f"\nPAGE {index + 1}\n{page.extract_text()}")
    for number, item in enumerate(page.images):
        if item.image.width >= 900:
            filename = out / f"page-{index + 1}-{number}.png"
            item.image.save(filename)
            print(f"Scene: {filename} ({item.image.width} x {item.image.height})")
