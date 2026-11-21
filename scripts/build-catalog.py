#!/usr/bin/env python3
"""Turn SpoolmanDB filament files into Phil-ament's seed catalog.

Reads every filaments/*.json from SPOOLMAN_DIR (default /tmp/spoolmandb)
and writes src/lib/server/catalog/catalog-data.json plus NOTICE.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src" / "lib" / "server" / "catalog"
SOURCE_COMMIT = "8e391c16be4bfde29dfc184e2f0b9a8d154ab550"
SOURCE_RETRIEVED = "2026-11-20"

# Product-line words hobbyists treat as a material variant. Longer keys first.
FINISHES = [
    ("silk+", "Silk+"),
    ("silk", "Silk"),
    ("matte", "Matte"),
    ("marble", "Marble"),
    ("metallic", "Metallic"),
    ("metal", "Metallic"),
    ("glow", "Glow"),
    ("wood", "Wood"),
    ("sparkle", "Sparkle"),
    ("galaxy", "Galaxy"),
    ("glitter", "Glitter"),
    ("translucent", "Translucent"),
    ("transparent", "Transparent"),
]


def prettify_material(code: str) -> str:
    # TPU-95A -> TPU 95A, the form shown in the app.
    return re.sub(r"-(?=\d{2}[ADad]\b)", " ", code.strip())


def find_finish(product_name: str) -> tuple[str | None, str | None, str]:
    label = re.sub(r"\s+", " ", product_name.replace("{color_name}", " ")).strip(" -")
    low = label.lower()
    for key, pretty in FINISHES:
        if re.search(rf"(^|[^a-z0-9+]){re.escape(key)}([^a-z0-9+]|$)", low):
            return key, pretty, label
    return None, None, label


def strip_token(label: str, key: str) -> str:
    out = re.sub(
        rf"(?i)(^|[^a-z0-9+]){re.escape(key)}([^a-z0-9+]|$)",
        lambda match: f"{match.group(1)} {match.group(2)}",
        label,
        count=1,
    )
    out = re.sub(r"\s+", " ", out).strip(" -|")
    return out.strip()


def material_and_color(material_code: str, product_name: str, color_name: str) -> tuple[str, str]:
    base = prettify_material(material_code)
    key, pretty, label = find_finish(product_name)
    material = base
    if pretty and pretty.lower() not in base.lower():
        material = f"{base} {pretty}"
    leftover = strip_token(label, key) if key else label
    if leftover:
        if product_name.strip().startswith("{color_name}"):
            name = f"{color_name} {leftover}".strip()
        else:
            name = f"{leftover} {color_name}".strip()
    else:
        name = color_name.strip()
    name = re.sub(r"\s+", " ", name).strip()
    return material, name


def normalize_hex(raw: str) -> str:
    hex_value = raw.strip().lstrip("#").upper()
    if not re.fullmatch(r"[0-9A-F]{6}([0-9A-F]{2})?", hex_value):
        return "#888888"
    return f"#{hex_value}"


def color_hex(entry: dict) -> str:
    if "hex" in entry and entry["hex"]:
        parts = [entry["hex"]]
    else:
        parts = list(entry.get("hexes") or [])
    if not parts:
        parts = ["888888"]
    return ",".join(normalize_hex(part) for part in parts)


def temps(filament: dict) -> tuple[int | None, int | None, int | None]:
    temp = filament.get("extruder_temp")
    if isinstance(temp, bool) or not isinstance(temp, int):
        temp = None
    rng = filament.get("extruder_temp_range")
    tmin = tmax = None
    if isinstance(rng, list) and len(rng) == 2 and all(isinstance(n, int) for n in rng):
        tmin, tmax = rng
    return temp, tmin, tmax


def build(source: Path) -> dict:
    brands: list[str] = []
    materials: set[str] = set()
    colors: list[dict] = []
    seen: set[tuple[str, str, str, str]] = set()
    name_owners: dict[tuple[str, str, str], list[dict]] = {}

    for path in sorted(source.glob("*.json")):
        data = json.loads(path.read_text())
        brand = data["manufacturer"].strip()
        if brand not in brands:
            brands.append(brand)
        for filament in data["filaments"]:
            temp, tmin, tmax = temps(filament)
            for entry in filament["colors"]:
                material, name = material_and_color(
                    filament["material"], filament["name"], entry["name"]
                )
                hex_value = color_hex(entry)
                key = (brand, material, name, hex_value)
                if key in seen:
                    continue
                seen.add(key)
                materials.add(material)
                record = {
                    "b": brand,
                    "m": material,
                    "n": name,
                    "h": hex_value,
                }
                if temp is not None:
                    record["t"] = temp
                if tmin is not None and tmax is not None:
                    record["tmin"] = tmin
                    record["tmax"] = tmax
                colors.append(record)
                name_owners.setdefault((brand, material, name), []).append(record)

    # Same display name with different swatches: keep both, and disambiguate.
    for group in name_owners.values():
        if len(group) < 2:
            continue
        for record in group:
            record["n"] = f"{record['n']} {record['h'][:7]}"

    colors.sort(key=lambda row: (row["b"].lower(), row["m"].lower(), row["n"].lower(), row["h"]))
    return {
        "source": {
            "name": "SpoolmanDB",
            "url": "https://github.com/Donkie/SpoolmanDB",
            "commit": SOURCE_COMMIT,
            "retrieved": SOURCE_RETRIEVED,
            "license": "MIT",
            "copyright": "Copyright (c) 2024 Donkie",
        },
        "brands": brands,
        "materials": sorted(materials, key=str.lower),
        "colors": colors,
    }


NOTICE = f"""SpoolmanDB catalog data
https://github.com/Donkie/SpoolmanDB
Commit: {SOURCE_COMMIT}
Retrieved: {SOURCE_RETRIEVED}

The file catalog-data.json in this directory is derived from SpoolmanDB
(brands, materials, color names, hex values, and extruder temperatures).
Phil-ament adds a separate Generic brand at seed time; that brand is not
part of SpoolmanDB.

SpoolmanDB is licensed under the MIT License. The copyright and permission
notice follows.

---

MIT License

Copyright (c) 2024 Donkie

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""


def main() -> None:
    source = Path(os.environ.get("SPOOLMAN_DIR", "/tmp/spoolmandb")) / "filaments"
    if not source.is_dir():
        raise SystemExit(f"Missing SpoolmanDB filaments directory: {source}")
    catalog = build(source)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "catalog-data.json").write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")))
    (OUT_DIR / "NOTICE").write_text(NOTICE)
    print(
        f"brands={len(catalog['brands'])} materials={len(catalog['materials'])} colors={len(catalog['colors'])}"
    )


if __name__ == "__main__":
    main()
