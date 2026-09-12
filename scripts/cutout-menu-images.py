#!/usr/bin/env python3
"""Cut out amateur product photos to clean white-background packshots.

Uses rembg (u2net) to remove busy backgrounds/hands-around-product, then
composites onto white at 512px WebP — the Marmita-APA look, applied
retroactively. Run AFTER fetch (it overwrites public/menu/*.webp in place).

Usage:
  python3 scripts/cutout-menu-images.py            # cut out CUTOUT list
  python3 scripts/cutout-menu-images.py <fname>... # cut out specific files

Only listed files are touched. Review the contact sheets afterwards — glass
and dark-on-dark shots sometimes mask poorly; those go back to sourcing.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public/menu")
SIDECAR_PATH = os.path.join(OUT_DIR, ".sources.json")

# Curated: product is isolated enough for a clean mask (no overlapping hands).
CUTOUT = [
    # beverages
    "beverages-002.webp",  # Fanta orange (table bg)
    "beverages-008.webp",  # Red Bull (garden)
    "beverages-013.webp",  # homemade lemonade (taverna bg)
    # beers
    "beers-023.webp",  # Alfa (outdoors, 2 bottles)
    "beers-024.webp",  # Mamos (table + glass)
    "beers-025.webp",  # Vergina Lager (dark bg)
    "beers-026.webp",  # Vergina Weiss (table + glass)
    "beers-029.webp",  # Fischer (table)
    "beers-030.webp",  # Nymfi (hand beside can)
    "beers-033.webp",  # Stella (hand beside can)
    # craft
    "craft-038.webp",  # Utopia Babylon (table)
    "craft-039.webp",  # Utopia Eden (table)
    # whiskeys
    "whiskeys-055.webp",  # Redbreast (table)
    "whiskeys-056.webp",  # Ballantine's (table)
    "whiskeys-057.webp",  # Cutty Sark (table)
    "whiskeys-060.webp",  # Canadian Club (table)
    "whiskeys-061.webp",  # Haig (outdoors)
    "whiskeys-062.webp",  # Grants (grey bg)
    "whiskeys-063.webp",  # Evan Williams (table, 2 bottles)
    "whiskeys-066.webp",  # Cardhu (table)
    "whiskeys-067.webp",  # Talisker (light bg)
    "whiskeys-069.webp",  # Dalwhinnie (table)
    "whiskeys-071.webp",  # Arran (dark bg)
    "whiskeys-075.webp",  # Kilchoman (light bg)
    "whiskeys-078.webp",  # Bunnahabhain (dark bg)
    "whiskeys-079.webp",  # Dalmore box (table)
    # rum
    "rum-092.webp",  # Diplomatico (grey bg)
    # gin
    "gin-099.webp",  # Bombay (shelf)
    "gin-100.webp",  # Tanqueray (peach bg)
    "gin-104.webp",  # Roku (dark bg)
    "gin-106.webp",  # Mombasa (gift box bg)
    "gin-110.webp",  # Monkey 47 (dark bg)
    "gin-111.webp",  # Botanist (light bg)
    # vodka
    "vodka-114.webp",  # Stolichnaya (blue bg)
    "vodka-115.webp",  # Moskovskaya (table)
    "vodka-117.webp",  # Belvedere (neutral bg)
    "vodka-119.webp",  # Ketel One (table)
    # cognac
    "cognac-120.webp",  # Hennessy (dark bg)
]


def cutout(src_path: str, dest_path: str, session) -> bool:
    from PIL import Image
    from rembg import remove

    with Image.open(src_path).convert("RGB") as im:
        im.thumbnail((900, 900), Image.LANCZOS)
        mask_out = remove(im, session=session)
    if mask_out.mode != "RGBA":
        mask_out = mask_out.convert("RGBA")
    bbox = mask_out.getbbox()
    if not bbox:
        return False
    pad = 12
    l = max(0, bbox[0] - pad)
    t = max(0, bbox[1] - pad)
    r = min(mask_out.width, bbox[2] + pad)
    b = min(mask_out.height, bbox[3] + pad)
    cropped = mask_out.crop((l, t, r, b))
    canvas = Image.new("RGB", (512, 512), "white")
    cropped.thumbnail((496, 496), Image.LANCZOS)
    canvas.paste(cropped, ((512 - cropped.width) // 2, (512 - cropped.height) // 2), cropped)
    canvas.save(dest_path, "WEBP", quality=80, method=6)
    return True


def main() -> None:
    from rembg import new_session

    targets = sys.argv[1:] or CUTOUT
    with open(SIDECAR_PATH, encoding="utf-8") as f:
        sources = json.load(f)
    session = new_session("u2net")
    ok, failed = 0, []
    for fname in targets:
        p = os.path.join(OUT_DIR, fname)
        if not os.path.exists(p):
            print(f"skip (missing): {fname}")
            continue
        try:
            if cutout(p, p, session):
                if fname in sources and "(background removed)" not in sources[fname]:
                    sources[fname] += " (background removed)"
                print(f"cut: {fname}")
                ok += 1
            else:
                failed.append(fname)
                print(f"mask failed: {fname}")
        except Exception as e:  # noqa: BLE001
            failed.append(fname)
            print(f"error {fname}: {e}")
    with open(SIDECAR_PATH, "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    print(f"\nCut out {ok}, failed {len(failed)}")
    for f_ in failed:
        print("  FAILED:", f_)


if __name__ == "__main__":
    main()
