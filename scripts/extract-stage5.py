"""Read Stage 5 reference scenes without changing the supplied PDF."""
from pathlib import Path
import sys
from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
output = Path(__file__).resolve().parents[1] / "reference" / "stage5"
output.mkdir(parents=True, exist_ok=True)
for index in range(21, min(26, len(reader.pages))):
    page = reader.pages[index]
    print(f"\nPAGE {index + 1}\n{page.extract_text()}")
    for number, image in enumerate(page.images):
        if image.image.width >= 900:
            path = output / f"page-{index + 1}-{number}.png"
            image.image.save(path)
            print(f"Scene: {path} ({image.image.width} x {image.image.height})")
