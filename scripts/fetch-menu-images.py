#!/usr/bin/env python3
"""Fetch one product photo per menu item and emit the lookup map + attribution.

Sources (all freely licensed):
  - Open Food Facts (CC BY-SA) for branded bottles/cans
  - Wikimedia Commons (CC BY / CC BY-SA / public domain) for cocktails + fallback

Usage:
  python3 scripts/fetch-menu-images.py            # fetch missing only
  python3 scripts/fetch-menu-images.py --rebuild  # refetch everything

Outputs (committed):
  public/menu/<cat>-<nn>.webp   512px product photos
  src/lib/menu-images.json      {"<catId>::<item name>": "/menu/<file>"} (EL + EN names)
  public/menu/ATTRIBUTION.md    source URL per photo (license compliance)

Rerunnable: existing .webp files are kept, so `main` merges stay cheap.
To add a photo for a new CMS product, drop the file in public/menu/ and add
two lines (EL + EN name) to src/lib/menu-images.json — no code changes.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_EL = os.path.join(ROOT, "src/lib/menu-seed.json")
SEED_EN = os.path.join(ROOT, "src/lib/menu-seed-en.json")
OUT_DIR = os.path.join(ROOT, "public/menu")
MAP_PATH = os.path.join(ROOT, "src/lib/menu-images.json")
SIDECAR_PATH = os.path.join(OUT_DIR, ".sources.json")
ATTR_PATH = os.path.join(OUT_DIR, "ATTRIBUTION.md")
UA = {"User-Agent": "BelfastMenu/1.0 (catalogue photos; contact: admin@belfast.pub)"}

# Open Food Facts barcodes for items where search ranking picks the wrong
# variant (e.g. peach Coke for regular Coke). key -> barcode.
OFF_CODE_OVERRIDES: dict[str, str] = {
    "beverages::ARIZONA ΛΕΜΟΝΙ 330ml": "0613008730697",
    "beverages::ARIZONA ΡΟΔΙ 330ml": "0613008753351",
    "beverages::ΣΟΔΑ SCHWEPPES 250ml": "5449000233417",
    "beverages::FANTA ΠΟΡΤΟΚΑΛΙ 250ml": "5449000011527",
    "beverages::FANTA ΛΕΜΟΝΑΔΑ 250ml": "5449000286932",
    "beers::Carlsberg Draught 500ml": "3080216008622",
    "beers::Carlsberg Draught 330ml": "3080216008622",
    "whiskeys::Tullamore XO": "5011026108019",
    "beers::Fix Άνευ 500ml": "5200334250033",
    "whiskeys::Nikka From The Barrel": "4904230100683",
    "whiskeys::Dalwhinnie": "5000281005423",
    "gin::Bombay": "5010677716000",
    "whiskeys::Ballantine's": "5010106111956",
    "whiskeys::Jack Daniel's": "5099873089798",
    "whiskeys::Canadian Club": "9300624031406",
    "whiskeys::Tullamore Dew": "5011026108019",
    "whiskeys::Teeling": "5391523270021",
    "gin::The Botanist": "5055807402040",
}


def off_product(code: str):
    """Front photo for an explicit OFF barcode, or None."""
    url = f"https://world.openfoodfacts.org/api/v0/product/{code}.json"
    try:
        data = http_json(url)
    except Exception as e:  # noqa: BLE001
        print(f"    OFF product error for {code}: {e}")
        return None
    time.sleep(0.3)
    p = data.get("product") or {}
    img = p.get("image_front_url") or p.get("image_url")
    if not img:
        return None
    return img, f"https://world.openfoodfacts.org/product/{code}"
def _twe(code: str) -> str:
    return f"https://img.thewhiskyexchange.com/540/{code}.jpg"


def _twe_src(terms: str) -> str:
    return "https://www.thewhiskyexchange.com/search?q=" + urllib.parse.quote(terms)


# The Whisky Exchange packshots (clean white-background product shots).
# value: (image_url, source_page_url)
TWE_OVERRIDES: dict[str, tuple[str, str]] = {
    "whiskeys::Jameson": (_twe("irish_jam1"), _twe_src("jameson")),
    "whiskeys::Jameson Black Barrel": (_twe("irish_jam19"), _twe_src("jameson black barrel")),
    "whiskeys::Jameson Caskmates": (_twe("irish_jam49"), _twe_src("jameson caskmates")),
    "whiskeys::Bushmills Black Bush": (_twe("irish_bus44"), _twe_src("bushmills black bush")),
    "whiskeys::Johnnie Black": (_twe("blend_joh1"), _twe_src("johnnie walker black label")),
    "whiskeys::Nikka From The Barrel": (_twe("japan_nik10"), _twe_src("nikka from the barrel")),
    "gin::Bombay": (_twe("gin_bom3"), _twe_src("bombay sapphire")),
    "vodka::Absolut": (_twe("vodka_abs1"), _twe_src("absolut vodka")),
    "vodka::Grey Goose": (_twe("vodka_gre1"), _twe_src("grey goose vodka")),
    "rum::Kingston": (_twe("rum_kin5"), _twe_src("kingston 62 rum")),
    "rum::Flor De Cana 12yr": (_twe("rum_flo12"), _twe_src("flor de cana")),
    "rum::Bayou Spiced": (_twe("rum_bay6"), _twe_src("bayou rum")),
    "whiskeys::Bushmills Black Bush": (_twe("irish_bus44"), _twe_src("bushmills black bush")),
    "whiskeys::The Glenallachie 12yr": (_twe("mini_sm_gle12yo"), _twe_src("glenallachie 12")),
    "cognac::Metaxa 5*": (_twe("brandy_met5"), _twe_src("metaxa 5")),
}


def _fp(name: str) -> str:
    return (
        "https://commons.wikimedia.org/wiki/Special:FilePath/"
        + urllib.parse.quote(name)
        + "?width=900"
    )


_OVERRIDES_RAW: dict[str, tuple[str, str]] = {
    "whiskeys::Evan Williams": (
        _fp("Evan Williams white label and black label whiskey bottles.jpg"),
        "https://commons.wikimedia.org/wiki/File:Evan_Williams_white_label_and_black_label_whiskey_bottles.jpg",
    ),
    "cognac::Metaxa 7*": (
        _fp("Metaxa 7 star amphora.jpg"),
        "https://commons.wikimedia.org/wiki/File:Metaxa_7_star_amphora.jpg",
    ),
    "cognac::Metaxa 12*": (
        _fp("METAXA 12 stars.JPG"),
        "https://commons.wikimedia.org/wiki/File:METAXA_12_stars.JPG",
    ),
    "rum::Havana": (
        _fp("Havana Club 7 anos.jpeg"),
        "https://commons.wikimedia.org/wiki/File:Havana_Club_7_anos.jpeg",
    ),
    "rum::Appleton": (
        _fp("Appleton Estate V-X Jamaica Rum-with glass.jpg"),
        "https://commons.wikimedia.org/wiki/File:Appleton_Estate_V-X_Jamaica_Rum-with_glass.jpg",
    ),
    "rum::Barcelo": (
        _fp("Ron Barcelo rum.jpg"),
        "https://commons.wikimedia.org/wiki/File:Ron_Barcelo_rum.jpg",
    ),
    "beverages::ΣΠΙΤΙΚΗ ΛΕΜΟΝΑΔΑ": (
        _fp("Glass of lemonade.jpg"),
        "https://commons.wikimedia.org/wiki/File:Glass_of_lemonade.jpg",
    ),
    "beverages::COCA COLA ZERO 250ml": (
        "https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca_Cola_Zero_bottle.png",
        "https://commons.wikimedia.org/wiki/File:Coca_Cola_Zero_bottle.png",
    ),
    "beverages::THREE CENTS PINK SODA 200ml": (
        "https://threecents.com/wp-content/uploads/2020/06/pink_grapefruit-soda-1.png",
        "https://threecents.com/drinks/pink-grapefruit-soda/",
    ),
    "beverages::THREE CENTS AEGEAN TONIC 200ml": (
        "https://threecents.com/wp-content/uploads/2020/06/aegean_tonic-1.png",
        "https://threecents.com/drinks/aegean-tonic/",
    ),
    "beers::Guinness 330ml": (
        "https://upload.wikimedia.org/wikipedia/commons/0/02/Guinness_bottle.jpg",
        "https://commons.wikimedia.org/wiki/File:Guinness_bottle.jpg",
    ),
    # OFF 9311493002220 default front (en) is a dark-room snap; the fr pick
    # is a single isolated stubby (white via the cutout script). Pinned
    # direct: official bundaberg.com og:image shows two bottles + garnish.
    "beverages::BUNDABERG GINGER BEER 375ml": (
        "https://images.openfoodfacts.org/images/products/931/149/300/2220/front_fr.38.400.jpg",
        "https://world.openfoodfacts.org/product/9311493002220",
    ),
    "beverages::SPRITE 250ml": (
        "https://upload.wikimedia.org/wikipedia/commons/c/c4/Bouteille_de_sprite_en_2025.jpg",
        "https://commons.wikimedia.org/wiki/File:Bouteille_de_sprite_en_2025.jpg",
    ),
    "beverages::COCA COLA 250ml": (
        "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.400.jpg",
        "https://world.openfoodfacts.org/product/5449000000996",
    ),
    "beers::Άλφα 330ml": (
        "https://athenianbrewery.gr/wp-content/uploads/2021/11/ALFA.png",
        "https://athenianbrewery.gr/products/beers/alfa/",
    ),
    "beers::Amstel Radler 330ml": (
        "https://athenianbrewery.gr/wp-content/uploads/2025/06/%CE%91%CE%9C%CE%A3%CE%A4%CE%95%CE%9B-Radler-Lemon_NEW.png",
        "https://athenianbrewery.gr/products/beers/amstel/",
    ),
    "beers::Μάμος 330ml": (
        "https://athenianbrewery.gr/wp-content/uploads/2021/11/MAMOS.png",
        "https://athenianbrewery.gr/products/beers/mamos/",
    ),
    "beers::Βεργίνα Weiss 500ml": (
        "https://www.verginabeer.com/wp-content/uploads/2026/05/11.png",
        "https://www.verginabeer.com/beer/vergina-weiss/",
    ),
    "beers::Kaiser 330ml": (
        "https://static.ab.gr/medias/sys_master/products/hb1/h78/10600077557790.jpg",
        "https://www.ab.gr/el/eshop/Kava-anapsyktika-nera-xiroi-karpoi/Mpyres/Mpyres-Pils/Mpyra-Koyti-500ml/p/7091737",
    ),
    "beers::Νύμφη 330ml": (
        "https://athenianbrewery.gr/wp-content/uploads/2026/01/NYMFH_FINAL.png",
        "https://athenianbrewery.gr/products/beers/nymfi/",
    ),
    # OFF 5200334250033 front_en is a landscape wide shot; the fr pick is
    # the single upright bottle (portrait). Pinned direct.
    "beers::Fix Άνευ 500ml": (
        "https://static.ab.gr/medias/sys_master/h9f/hd3/10126339473438.jpg",
        "https://www.ab.gr/el/eshop/Kava-anapsyktika-nera-xiroi-karpoi/Mpyres/Mpyres-Lager/Mpyra-Aney-Alkool-Koyti-330ml/p/7308212",
    ),
    "beers::Stella Artois 330ml": (
        "https://static.ab.gr/medias/sys_master/h04/hd2/9998501314590.jpg",
        "https://www.ab.gr/el/eshop/Kava-anapsyktika-nera-xiroi-karpoi/Mpyres/Mpyres-Lager/Mpyra-Fiali-330ml/p/7087333",
    ),
    # GROUP D (02-BEERS): isolated single bottle/can on white, 512px catalog.
    # Carlsberg front_fr is a giant label close-up crop; raw 5/6 uploads
    # (uploader org-brasseries-kronenbourg) are full single-product whites.
    # 500ml pins the larger square pick (5), 330ml the taller narrow pick (6).
    "beers::Carlsberg Draught 500ml": (
        "https://images.openfoodfacts.org/images/products/308/021/600/8622/5.jpg",
        "https://world.openfoodfacts.org/product/3080216008622",
    ),
    "beers::Carlsberg Draught 330ml": (
        "https://images.openfoodfacts.org/images/products/308/021/600/8622/6.jpg",
        "https://world.openfoodfacts.org/product/3080216008622",
    ),
    # Marmita RED: page og:image is RedaleBox (bottle + box); Redale.jpg is
    # the official single-bottle white, same pattern as Apa.jpg reference.
    "beers::Marmita RED Draught 330ml": (
        "https://marmitabeer.com/wp-content/uploads/2021/01/Redale.jpg",
        "https://marmitabeer.com/product/marmita-red-ale-330-ml-pack/",
    ),
    # 03-CRAFT: official Marmita single + beer24 white singles. The old
    # 038/039 files showed the wrong product entirely (Samuel Adams
    # Utopias decanter); Babylon was cut out from its red eshop backdrop.
    "craft::Marmita Red 330ml": (
        "https://marmitabeer.com/wp-content/uploads/2021/01/Redale.jpg",
        "https://marmitabeer.com/product/marmita-red-ale-330-ml-pack/",
    ),
    "craft::Utopia Babylon IPA 330ml": (
        "https://beer24.gr/b/9627-large_default/utopia-babylon-033lt.jpg",
        "https://beer24.gr/b/brand/355-utopia",
    ),
    "craft::Utopia Eden IPL 330ml": (
        "https://beer24.gr/b/4999-large_default/utopia-eden-ipl-033lt.jpg",
        "https://beer24.gr/b/brand/355-utopia",
    ),
    "whiskeys::Teeling": (
        "https://aem.lcbo.com/content/dam/lcbo/products/6/4/4/2/644237.jpg.thumb.1280.1280.jpg",
        "https://www.lcbo.com/en/teeling-small-batch-irish-whiskey-644237",
    ),
    "whiskeys::Canadian Club": (
        "https://aem.lcbo.com/content/dam/lcbo/products/0/0/0/0/000042.jpg.thumb.1280.1280.jpg",
        "https://www.lcbo.com/en/canadian-club-whisky-42",
    ),
    "whiskeys::Redbreast 12yr": (
        "https://aem.lcbo.com/content/dam/lcbo/products/6/3/6/8/636845.jpg.thumb.1280.1280.jpg",
        "https://www.lcbo.com/en/redbreast-12-year-old-irish-whiskey-636845",
    ),
    "whiskeys::Grants 12yr": (
        "https://upload.wikimedia.org/wikipedia/commons/f/f5/Grant%27s_Whisky_01.jpg",
        "https://commons.wikimedia.org/wiki/File:Grant%27s_Whisky_01.jpg",
    ),
    "whiskeys::Nikka From The Barrel": (
        "https://upload.wikimedia.org/wikipedia/commons/2/25/Nikka_Whisky_From_the_Barrel%2C_Japan.jpg",
        "https://commons.wikimedia.org/wiki/File:Nikka_Whisky_From_the_Barrel%2C_Japan.jpg",
    ),
    "cocktails::Mai Tai": (
        _fp("Mai Tai (16304400706).jpg"),
        "https://commons.wikimedia.org/wiki/File:Mai_Tai_(16304400706).jpg",
    ),
    "cocktails::Cuba Libre": (
        _fp("Bebida Cuba Libre.jpg"),
        "https://commons.wikimedia.org/wiki/File:Bebida_Cuba_Libre.jpg",
    ),
    "cocktails::Mojito (f)": (
        _fp("Marina Beach Club - Mojito.jpg"),
        "https://commons.wikimedia.org/wiki/File:Marina_Beach_Club_-_Mojito.jpg",
    ),
    "cocktails::Aperol Spritz": (
        _fp("Aperol Spritz (Aperol Spritz Original Bar) (42171686322).jpg"),
        "https://commons.wikimedia.org/wiki/File:Aperol_Spritz_(Aperol_Spritz_Original_Bar)_(42171686322).jpg",
    ),
    "gin::Votanikon": (
        "https://aem.lcbo.com/content/dam/lcbo/products/0/4/3/4/043432.jpg.thumb.1280.1280.jpg",
        "https://www.lcbo.com/en/votanikon-greek-botanicals-gin-43432",
    ),
}
OVERRIDES: dict[str, tuple[str, str]] = _OVERRIDES_RAW

# Product/shop pages whose og:image is the product shot (resolved at fetch time).
# key: "<catId>::<EL name>" -> page URL
PAGE_OVERRIDES: dict[str, str] = {
    "beverages::ΞΙΝΟ ΝΕΡΟ ΦΛΩΡΙΝΑΣ 250ml": "https://www.biologikoxorio.gr/xyno-nero-florinas",
    "beverages::ΚΕΡΑΣΑΔΑ GIA_GIAMAS": "https://www.coffees.gr/giagiamas-cherry-1300g/",
    "beverages::ΡΟΖ ΛΕΜΟΝΑΔΑ GIA-GIAMAS SUGARFREE": "https://www.coffees.gr/giagiamas-strawberry-lemonade-1300g/",
    "beverages::ΛΕΜΟΝΑΔΑ GIA_GIAMAS SUGARFREE": "https://www.coffees.gr/giagiamas-lemonade-1300g/",
    "beers::Marmita RED Draught 330ml": "https://marmitabeer.com/product/marmita-red-ale-330-ml-pack/",
    "craft::Marmita Red 330ml": "https://marmitabeer.com/product/marmita-red-ale-330-ml-pack/",
    "craft::Marmita American Pale Ale 330ml": "https://greekbeershop.gr/product/marmita-apa/",
    "craft::Marmita Stout 330ml": "https://greekbeershop.gr/product/marmita-stout/",
    "craft::Marmita POW WOW IPA 330ml": "https://www.thedistiller.gr/p/marmita-powwow-ipa-byra-330ml",
    "craft::ΚΥΡΙΑ ΤΟΥΛΑ NIPA (Sourmena Brew) 330ml": "https://charitakis.com/product/bira-kyria-toula-sourmena-brew-alc-6-vol-fiali-330ml/",
    "craft::JASMINE IPA (Strange Brew) 330ml": "https://www.untappd.com/b/strange-brew-jasmine-ipa/2092288",
    "whiskeys::Roe & Co": "https://www.vineyardbelfast.co.uk/products/roe-co-signature-40-abv-700ml",
    "rum::Chairman's Spiced": "https://rumshopboy.com/2020/12/20/chairmans-reserve-original/",
    "rum::Chairman's": "https://rumshopboy.com/2020/12/20/chairmans-reserve-original/",
    "rum::Kingston": "https://www.jacquesscott.com/ky/appleton-kingston-62-cayman-islands/",
    "rum::Bayou Spiced": "https://www.bayourum.com/",
    "rum::Plantation Dark": "https://rumx.com/en/rums/75/plantation-original-dark/",
    "rum::Tamboo": "https://www.quick-spirits.com/angostura-tamboo-spiced-rum-70cl",
    "whiskeys::Four Roses": "https://fourrosesbourbon.com/",
    "whiskeys::Teeling": "https://www.masterofmalt.com/whiskies/teeling/teeling-small-batch-whiskey/",
    "whiskeys::Redbreast 12yr": "https://www.masterofmalt.com/whiskies/redbreast/redbreast-12-year-old-whiskey/",
    "whiskeys::Grants 12yr": "https://www.masterofmalt.com/distilleries/grants/",
    "gin::Oyster": "https://oystergin.com/",
    "gin::Canaima": "https://latitudewine.co.uk/products/canaima-small-batch-gin",
    "craft::ΜΠΕΛΑ Pilsner (Sourmena Brew X 608) 330ml": "https://greekbeershop.gr/product/608-brewing-co-x-sourmena-brew-bela-pilsner/",
    "vodka::Crystal Head": "https://www.crystalheadvodka.com/product/crystal-head-original-vodka-750ml-with-2-10oz-glasses/",
}

VOL_RE = re.compile(r"\s*\d+\s*ml\s*$", re.IGNORECASE)
AGE_RE = re.compile(r"\b\d+\s*(yr|yrs|year|years|yo|ans)\b", re.IGNORECASE)


def base_name(name: str) -> str:
    n = VOL_RE.sub("", name).strip()
    n = n.replace("(f)", "").replace("(F)", "").replace("*", "").strip()
    n = re.sub(r"\s+", " ", n)
    return n


def http_json(url: str, timeout: int = 25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.load(res)


def off_search(query: str):
    """Best Open Food Facts front photo for a query, or None."""
    q = urllib.parse.quote(query)
    url = (
        "https://world.openfoodfacts.org/cgi/search.pl"
        f"?search_terms={q}&search_simple=1&action=process&json=1&page_size=8"
    )
    try:
        data = http_json(url)
    except Exception as e:  # noqa: BLE001 - network flakiness, fall through
        # OFF throttles aggressively: back off and retry a few times.
        data = None
        if "503" in str(e) or "429" in str(e):
            for wait in (5, 15, 30):
                time.sleep(wait)
                try:
                    data = http_json(url)
                    break
                except Exception:
                    continue
        if data is None:
            print(f"    OFF error for {query!r}: {e}")
            return None
    tokens = [t.lower() for t in re.findall(r"[a-z0-9']+", query.lower()) if len(t) > 2]
    # Age statements differ in spelling ("16yr" vs "16 Year Old") — don't
    # require them, but require EVERYTHING else ("Fanta Lemon" must not
    # match a Tops lemon soda that merely contains "lemon").
    required = [t for t in tokens if not AGE_RE.fullmatch(t)]
    best, best_score = None, -1
    for p in data.get("products", []):
        img = p.get("image_front_url") or p.get("image_url")
        if not img:
            continue
        hay = f"{p.get('product_name') or ''} {p.get('brands') or ''}".lower()
        score = sum(1 for t in tokens if t in hay)
        if required and score < len(required):
            continue
        if score > best_score:
            best, best_score = (p, img), score
    time.sleep(0.4)
    if best and best_score > 0:
        p, img = best
        return img, f"https://world.openfoodfacts.org/product/{p.get('code', '')}"
    return None


def commons_search(query: str, min_token_len: int = 4, must_contain: str | None = None):
    """Best Commons JPEG photo for a query, or None.

    Commons full-text search matches OCR inside scanned books/newspapers, so
    candidates are restricted to JPEGs whose *title* contains a query token.
    """
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrnamespace": "6",
        "gsrlimit": "15",
        "prop": "imageinfo",
        "iiprop": "url|size",
        "iiurlwidth": "512",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    try:
        data = http_json(url)
    except Exception as e:  # noqa: BLE001
        print(f"    Commons error for {query!r}: {e}")
        return None
    time.sleep(0.2)
    pages = (data.get("query") or {}).get("pages", {}).values()
    tokens = [t for t in re.findall(r"[a-z0-9']+", query.lower()) if len(t) >= min_token_len]
    cands = []
    for pg in pages:
        title = pg.get("title") or ""
        low = title.lower()
        if not low.endswith((".jpg", ".jpeg")):
            continue
        if any(b in low for b in ("icon", "drawing", "logo", "diagram", "screenshot")):
            continue
        hits = sum(1 for t in tokens if t in low)
        if hits == 0:
            continue
        # Multi-word queries must match on ≥2 tokens ("Red Bull" must not
        # match "Red Stripe"; single-word queries keep the ≥1 rule).
        if len(tokens) >= 2 and hits < 2:
            continue
        info = (pg.get("imageinfo") or [{}])[0]
        img = info.get("thumburl") or info.get("url")
        if not img:
            continue
        img = img.split("?")[0]
        width = info.get("width") or 0
        if width and width < 300:
            continue
        if must_contain and must_contain.lower() not in low:
            continue
        # More token hits first, then prefer mid-size photos over giant scans.
        cands.append((hits, -abs(width - 1200), title, img))
    if not cands:
        return None
    cands.sort(reverse=True)
    _, _, title, img = cands[0]
    page = "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))
    return img, page


def _safe_url(url: str) -> str:
    """Percent-encode non-ASCII path/query (some shops use Greek filenames)."""
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(parts.path, safe="/%")
    query = urllib.parse.quote(parts.query, safe="=&%")
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, query, parts.fragment))


def resolve_page_image(page_url: str):
    """Extract a page's og:image (product shot on shops, distilleries, Untappd...)."""
    try:
        req = urllib.request.Request(page_url, headers={**UA, "Accept-Language": "en"})
        with urllib.request.urlopen(req, timeout=30) as res:
            html = res.read().decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        print(f"    page fetch failed {page_url[:80]}: {e}")
        return None
    for pat in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
    ):
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            return m.group(1), page_url
    return None


def download(url: str, dest: str) -> bool:
    """Download + normalize to 512px-max WebP (keeps the repo small)."""
    return download_normalized(url, dest)


def download_normalized(url: str, dest: str) -> bool:
    tmp = dest + ".orig"
    try:
        req = urllib.request.Request(_safe_url(url), headers=UA)
        with urllib.request.urlopen(req, timeout=40) as res, open(tmp, "wb") as f:
            f.write(res.read())
        from PIL import Image  # local import: only needed for the fetch script

        with Image.open(tmp) as im:
            if im.mode in ("RGBA", "LA") or (
                im.mode == "P" and "transparency" in im.info
            ):
                rgba = im.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
                im = Image.alpha_composite(bg, rgba).convert("RGB")
            else:
                im = im.convert("RGB")
            im.thumbnail((512, 512), Image.LANCZOS)
            im.save(dest, "WEBP", quality=72, method=6)
        os.remove(tmp)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"    download failed {url[:80]}: {e}")
        for p in (tmp,):
            if os.path.exists(p):
                os.remove(p)
        return False


def dhash(path: str) -> int:
    """64-bit difference hash (perceptual) for near-duplicate detection."""
    from PIL import Image

    with Image.open(path).convert("L") as im:
        im = im.resize((9, 8), Image.LANCZOS)
        px = [im.getpixel((x, y)) for y in range(8) for x in range(9)]
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[y * 9 + x] > px[y * 9 + x + 1] else 0)
    return bits


def dhamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def looks_same(file_a: str, file_b: str, tolerance: int = 10) -> bool:
    try:
        return dhamming(dhash(file_a), dhash(file_b)) <= tolerance
    except Exception:
        return False


QUERY_SUFFIX = {
    "beverages": "",
    "beers": " beer",
    "craft": " beer",
    "whiskeys": " whisky",
    "rum": " rum",
    "gin": " gin",
    "vodka": " vodka",
    "cognac": " cognac",
    "cocktails": " cocktail",
}


# Items with no acceptable photo found anywhere: keep them unmapped so the
# frontend renders its elegant no-photo state. Send the owner a photo instead.
BLOCKLIST: set[str] = {
    "craft::ΤΑΩΣ Brewing Sauvignon IPA 330ml",
    "craft::ΤΑΩΣ Lager 330ml",
    "craft::JASMINE IPA (Strange Brew) 330ml",
    "craft::ΜΠΕΛΑ Pilsner (Sourmena Brew X 608) 330ml",
    "gin::Grace",
    "gin::Amazoni Brazilian Gin",
    # Only resolvable sources are a text card (RumX og) / antique bottles
    # (Commons) — owner snaps the bar bottle instead.
    "rum::Plantation Dark",
    "gin::Old Sport",
    # Untappd widget banner, not a product photo.
    "craft::JASMINE IPA (Strange Brew) 330ml",
}


def resolve_item(cid: str, name_en: str, key_el: str):
    """Resolve (image_url, source_url) for an item via tables then searches."""
    base = base_name(name_en)
    found = None
    suffix = ""
    if key_el in OVERRIDES:
        return OVERRIDES[key_el]
    if key_el in TWE_OVERRIDES:
        return TWE_OVERRIDES[key_el]
    if key_el in OFF_CODE_OVERRIDES:
        found = off_product(OFF_CODE_OVERRIDES[key_el])
    if not found and key_el in PAGE_OVERRIDES:
        found = resolve_page_image(PAGE_OVERRIDES[key_el])
    if not found and cid == "cocktails":
        found = commons_search(f"{base} cocktail", min_token_len=3)
    if not found and cid != "cocktails":
        suffix = QUERY_SUFFIX[cid]
        found = off_search(base + suffix)
    if not found:
        # Retry with age statements stripped ("Lagavulin 16yr" -> "Lagavulin").
        short = AGE_RE.sub("", base).strip()
        short = re.sub(
            r"\b(XO|Black Barrel|Caskmates|Double Cask|From The Barrel)\b",
            "",
            short,
            flags=re.IGNORECASE,
        ).strip()
        short = re.sub(r"\s+", " ", short)
        if short and short.lower() != base.lower():
            found = off_search(short + suffix)
    if not found:
        brand = base.split()[0]
        found = commons_search(f"{brand} {suffix.strip()} bottle", must_contain=brand)
    return found


def main() -> None:
    rebuild = "--rebuild" in sys.argv
    relink = "--relink" in sys.argv
    # --relink-fast: relink only table-pinned sources (no search APIs).
    relink_fast = "--relink-fast" in sys.argv
    if relink_fast:
        relink = True
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(SEED_EL, encoding="utf-8") as f:
        el = json.load(f)
    with open(SEED_EN, encoding="utf-8") as f:
        en = json.load(f)

    mapping: dict[str, str] = {}
    if os.path.exists(MAP_PATH) and not rebuild:
        try:
            with open(MAP_PATH, encoding="utf-8") as f:
                mapping = json.load(f)
        except (json.JSONDecodeError, OSError):
            mapping = {}
    # Sidecar: fname -> source URL. Single source of truth for attribution
    # (survives map rewrites; never parsed from markdown).
    sources: dict[str, str] = {}
    if os.path.exists(SIDECAR_PATH):
        try:
            with open(SIDECAR_PATH, encoding="utf-8") as f:
                sources = json.load(f)
        except (json.JSONDecodeError, OSError):
            sources = {}
    misses: list[str] = []
    done = 0
    n = 0
    for cat_el, cat_en in zip(el, en):
        cid = cat_el["id"]
        for s_el, s_en in zip(cat_el["subcategories"], cat_en["subcategories"]):
            for i_el, i_en in zip(s_el["items"], s_en["items"]):
                n += 1
                name_el, name_en = i_el["name"], i_en["name"]
                key_el, key_en = f"{cid}::{name_el}", f"{cid}::{name_en}"
                fname = f"{cid}-{n:03d}.webp"
                dest = os.path.join(OUT_DIR, fname)
                if key_el in BLOCKLIST:
                    if os.path.exists(dest):
                        os.remove(dest)
                    continue
                # Disk is the source of truth: an existing file (re)maps its
                # item even if menu-images.json was lost or pruned wrongly.
                # In relink mode, files that already have a sidecar source
                # need no work at all.
                if os.path.exists(dest) and not rebuild:
                    if relink and fname in sources:
                        mapping[key_el] = f"/menu/{fname}"
                        mapping[key_en] = f"/menu/{fname}"
                        done += 1
                        continue
                    if not relink:
                        mapping[key_el] = f"/menu/{fname}"
                        mapping[key_en] = f"/menu/{fname}"
                        done += 1
                        continue
                base = base_name(name_en)
                print(f"[{n}] {cid} :: {base}")
                if relink_fast and key_el not in (
                    {**OVERRIDES, **TWE_OVERRIDES, **OFF_CODE_OVERRIDES, **PAGE_OVERRIDES}
                ):
                    continue
                found = resolve_item(cid, name_en, key_el)
                if relink and found:
                    # Verify-only: download candidate to temp and compare
                    # perceptually with the existing file. Never modifies it.
                    img_url, src_url = found
                    tmp = dest + ".relink"
                    try:
                        if download_normalized(img_url, tmp) and looks_same(tmp, dest):
                            sources[fname] = src_url
                            print(f"    relinked: {src_url[:80]}")
                        else:
                            print("    relink: candidate differs, trying next strategy...")
                            found = None
                    finally:
                        if os.path.exists(tmp):
                            os.remove(tmp)
                        with open(SIDECAR_PATH, "w", encoding="utf-8") as f:
                            json.dump(sources, f, ensure_ascii=False, indent=2, sort_keys=True)
                            f.write("\n")
                    if not found:
                        misses.append(f"{cid} :: {name_el} / {name_en} (relink unverified)")
                        continue
                    mapping[key_el] = f"/menu/{fname}"
                    mapping[key_en] = f"/menu/{fname}"
                    done += 1
                    continue
                if not found:
                    misses.append(f"{cid} :: {name_el} / {name_en}")
                    print("    MISS")
                    continue
                img_url, src_url = found
                print(f"    {img_url[:90]}")
                if not download(img_url, dest):
                    misses.append(f"{cid} :: {name_el} / {name_en} (dl fail)")
                    continue
                mapping[key_el] = f"/menu/{fname}"
                mapping[key_en] = f"/menu/{fname}"
                sources[fname] = src_url
                done += 1
                with open(SIDECAR_PATH, "w", encoding="utf-8") as f:
                    json.dump(sources, f, ensure_ascii=False, indent=2, sort_keys=True)
                    f.write("\n")

    with open(MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    # Prune: drop map keys + attribution rows whose files no longer exist
    # (e.g. a previous garbage pick was deleted and the refetch missed).
    # NOTE: map values are URL paths ("/menu/x.webp") — prefix with public/.
    def _exists(url_path: str) -> bool:
        return os.path.exists(os.path.join(ROOT, "public", url_path.lstrip("/")))

    pruned = [k for k, v in mapping.items() if not _exists(v)]
    for k in pruned:
        del mapping[k]
    if pruned:
        print(f"Pruned {len(pruned)} stale map keys (files missing)")
        with open(MAP_PATH, "w", encoding="utf-8") as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write("\n")

    with open(SIDECAR_PATH, "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    # Attribution derives from the sidecar (never parsed from markdown).
    with open(ATTR_PATH, "w", encoding="utf-8") as f:
        f.write("# Menu photo attribution\n\n")
        f.write("Product photos: Open Food Facts (CC BY-SA), Wikimedia Commons\n")
        f.write("(CC BY / CC BY-SA / public domain), brand/shop press shots\n")
        f.write("(see per-file source). One row per file in this folder.\n\n")
        f.write("| file | source |\n| --- | --- |\n")
        for fname in sorted(sources):
            if os.path.exists(os.path.join(OUT_DIR, fname)):
                f.write(f"| `{fname}` | {sources[fname]} |\n")

    print(f"\nDone: {done} items mapped, {len(misses)} misses")
    for m in misses:
        print("  MISS:", m)


if __name__ == "__main__":
    main()
