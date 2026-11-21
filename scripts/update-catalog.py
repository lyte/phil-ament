#!/usr/bin/env python3
"""Clone the latest SpoolmanDB and rebuild Phil-ament's bundled catalog.

The running app never contacts SpoolmanDB. This command is for maintainers
and for the monthly GitHub Actions workflow. When the latest commit is the
one already recorded in catalog-data.json, the files are left untouched so
the retrieval date does not change on its own.

Generic and the pinned brand order live in the app, not in the snapshot.
This script refuses to write a snapshot that drops those pinned brands or
that stores Generic itself.
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "src" / "lib" / "server" / "catalog" / "catalog-data.json"
REPO_URL = "https://github.com/Donkie/SpoolmanDB.git"
DEFAULT_BODY = Path("/tmp/philament-catalog-pr-body.md")


def run(args: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(args, check=True, **kwargs)
    except FileNotFoundError as exc:
        raise SystemExit(f"Required command not found: {args[0]}") from exc
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"Command failed ({exc.returncode}): {' '.join(args)}") from exc


def load_catalog(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or not isinstance(data.get("colors"), list):
        return None
    return data


def recorded_commit(catalog: dict | None) -> str | None:
    if not catalog:
        return None
    source = catalog.get("source")
    if not isinstance(source, dict):
        return None
    commit = source.get("commit")
    if isinstance(commit, str) and re.fullmatch(r"[0-9a-f]{40}", commit):
        return commit
    return None


def clone_spoolmandb(dest: Path) -> str:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    print("Cloning SpoolmanDB...", flush=True)
    run(
        ["git", "clone", "--quiet", "--depth", "1", REPO_URL, str(dest)],
        env=env,
    )
    commit = run(
        ["git", "-C", str(dest), "rev-parse", "HEAD"],
        env=env,
        text=True,
        capture_output=True,
    ).stdout.strip()
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise SystemExit(f"Unexpected SpoolmanDB commit {commit!r}")
    return commit


def rebuild(spoolman_dir: Path, commit: str, retrieved: str) -> None:
    env = os.environ.copy()
    env["SPOOLMAN_DIR"] = str(spoolman_dir)
    env["SPOOLMAN_COMMIT"] = commit
    env["SPOOLMAN_RETRIEVED"] = retrieved
    run([sys.executable, str(ROOT / "scripts" / "build-catalog.py")], cwd=ROOT, env=env)


def set_output(key: str, value: str) -> None:
    if "\n" in value or "\r" in value:
        raise SystemExit(f"{key} must be a single line")
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(f"{key}={value}\n")


def step_summary(text: str) -> None:
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(text)
        if not text.endswith("\n"):
            handle.write("\n")


def body_path() -> Path:
    raw = os.environ.get("CATALOG_PR_BODY", "").strip()
    return Path(raw) if raw else DEFAULT_BODY


def color_identity(row: dict) -> tuple[str, str, str, str]:
    return (row["b"], row["m"], row["n"], row["h"])


def color_temps(row: dict) -> tuple:
    return (row.get("t"), row.get("tmin"), row.get("tmax"))


def catalog_changes(old: dict, new: dict) -> dict:
    old_colors = {color_identity(row): color_temps(row) for row in old.get("colors") or []}
    new_colors = {color_identity(row): color_temps(row) for row in new.get("colors") or []}
    return {
        "added_brands": sorted(set(new.get("brands") or []) - set(old.get("brands") or []), key=str.lower),
        "removed_brands": sorted(set(old.get("brands") or []) - set(new.get("brands") or []), key=str.lower),
        "added_materials": sorted(
            set(new.get("materials") or []) - set(old.get("materials") or []), key=str.lower
        ),
        "removed_materials": sorted(
            set(old.get("materials") or []) - set(new.get("materials") or []), key=str.lower
        ),
        "added_colors": sum(1 for key in new_colors if key not in old_colors),
        "removed_colors": sum(1 for key in old_colors if key not in new_colors),
        "updated_colors": sum(
            1 for key, temps in new_colors.items() if key in old_colors and old_colors[key] != temps
        ),
    }


def name_list(names: list[str]) -> str:
    shown = names[:12]
    text = ", ".join(shown)
    extra = len(names) - len(shown)
    if extra:
        text += f", and {extra} more"
    return text


def count_phrase(added: list[str], removed: list[str]) -> str:
    phrase = f"{len(added)} added, {len(removed)} removed"
    parts = []
    if added:
        parts.append(f"added {name_list(added)}")
    if removed:
        parts.append(f"removed {name_list(removed)}")
    if not parts:
        return phrase
    return phrase + " (" + "; ".join(parts) + ")"


def temperature_clause(count: int) -> str:
    if count == 0:
        return ""
    verb = "has" if count == 1 else "have"
    return f", and {count} now {verb} a different hot-end temperature"


def commit_url(commit: str) -> str:
    return f"https://github.com/Donkie/SpoolmanDB/commit/{commit}"


def render_body(old: dict | None, new: dict) -> str:
    new_source = new["source"]
    new_commit = new_source["commit"]
    new_short = new_commit[:7]
    lines = []
    changes = None
    if old is None or "source" not in old:
        lines.append(
            f"Rebuilt the bundled SpoolmanDB snapshot at [{new_short}]({commit_url(new_commit)}) "
            f"(retrieved {new_source['retrieved']})."
        )
    else:
        old_source = old["source"]
        old_commit = old_source["commit"]
        old_short = old_commit[:7]
        lines.append(
            "The bundled SpoolmanDB snapshot moved from "
            f"[{old_short}]({commit_url(old_commit)}) (retrieved {old_source['retrieved']}) to "
            f"[{new_short}]({commit_url(new_commit)}) (retrieved {new_source['retrieved']})."
        )
        changes = catalog_changes(old, new)
        lines.append("")
        lines.append(f"- Brands: {count_phrase(changes['added_brands'], changes['removed_brands'])}")
        lines.append(
            "- Filament colors: "
            f"{changes['added_colors']} added, {changes['removed_colors']} removed"
            f"{temperature_clause(changes['updated_colors'])}"
        )
        lines.append(f"- Materials: {count_phrase(changes['added_materials'], changes['removed_materials'])}")
        if not any(
            (
                changes["added_brands"],
                changes["removed_brands"],
                changes["added_materials"],
                changes["removed_materials"],
                changes["added_colors"],
                changes["removed_colors"],
                changes["updated_colors"],
            )
        ):
            lines.append("")
            lines.append(
                "SpoolmanDB's latest commit changed, and the filament lists are the same. "
                "This pull request records the new commit."
            )
    lines.extend(
        [
            "",
            "Phil-ament still adds its own Generic brand when it creates a database. "
            "Those colors are the plain ones (white, black, grey, red, and so on) and they have "
            "no hot-end temperature. Generic is not part of SpoolmanDB.",
            "",
            "Brand pickers still list Bambu Lab, Sunlu, eSun, Ziro, Overture, and Creality first, "
            "then Generic, then every other brand.",
            "",
            "The running app does not download this data. This pull request only replaces the "
            "snapshot in the repository.",
            "",
            "CI does not start by itself when the pull request is opened with the default GitHub "
            "Actions token. Close the pull request and reopen it to run CI. If this repository has "
            "a `CATALOG_SYNC_TOKEN` secret, CI should already be queued.",
            "",
        ]
    )
    return "\n".join(lines)


def load_builder():
    path = ROOT / "scripts" / "build-catalog.py"
    spec = importlib.util.spec_from_file_location("build_catalog", path)
    if spec is None or spec.loader is None:
        raise SystemExit("Could not load build-catalog.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expect_exit(fn, text: str) -> None:
    try:
        fn()
    except SystemExit as exc:
        if text not in str(exc):
            raise SystemExit(f"expected {text!r} in {exc}") from exc
        return
    raise SystemExit(f"expected failure containing {text!r}")


def self_test() -> None:
    old = {
        "source": {"commit": "a" * 40, "retrieved": "2026-01-01"},
        "brands": ["Bambu Lab", "Sunlu", "eSun", "ZIRO 3D", "Overture", "Creality", "Polymaker"],
        "materials": ["PLA", "PETG"],
        "colors": [
            {"b": "Bambu Lab", "m": "PLA", "n": "Black", "h": "#000000", "t": 220},
            {"b": "Sunlu", "m": "PETG", "n": "Red", "h": "#FF0000", "tmin": 230, "tmax": 250},
        ],
    }
    new = {
        "source": {"commit": "b" * 40, "retrieved": "2026-02-01"},
        "brands": ["Bambu Lab", "Sunlu", "eSun", "ZIRO 3D", "Overture", "Creality", "Prusament"],
        "materials": ["PLA", "ABS"],
        "colors": [
            {"b": "Bambu Lab", "m": "PLA", "n": "Black", "h": "#000000", "t": 215},
            {"b": "Prusament", "m": "PLA", "n": "Galaxy Black", "h": "#111111", "t": 210},
        ],
    }
    changes = catalog_changes(old, new)
    if changes["added_brands"] != ["Prusament"] or changes["removed_brands"] != ["Polymaker"]:
        raise SystemExit(f"brand diff mismatch: {changes}")
    if changes["added_materials"] != ["ABS"] or changes["removed_materials"] != ["PETG"]:
        raise SystemExit(f"material diff mismatch: {changes}")
    if (changes["added_colors"], changes["removed_colors"], changes["updated_colors"]) != (1, 1, 1):
        raise SystemExit(f"color diff mismatch: {changes}")
    body = render_body(old, new)
    expected = [
        "Brands: 1 added, 1 removed (added Prusament; removed Polymaker)",
        "Filament colors: 1 added, 1 removed, and 1 now has a different hot-end temperature",
        "Materials: 1 added, 1 removed (added ABS; removed PETG)",
        "aaaaaaa",
        "bbbbbbb",
        "Generic",
    ]
    missing = [line for line in expected if line not in body]
    if missing:
        raise SystemExit("summary missing: " + "; ".join(missing) + "\n" + body)
    same = json.loads(json.dumps(old))
    same["source"] = {"commit": "c" * 40, "retrieved": "2026-03-01"}
    same_body = render_body(old, same)
    if "filament lists are the same" not in same_body:
        raise SystemExit(same_body)

    builder = load_builder()
    real = load_catalog(CATALOG_PATH)
    if real is None:
        raise SystemExit(f"missing catalog: {CATALOG_PATH}")
    builder.assert_snapshot(real)
    expect_exit(
        lambda: builder.assert_snapshot({"brands": ["Generic"], "materials": [], "colors": []}),
        "Generic",
    )
    expect_exit(
        lambda: builder.assert_snapshot(
            {"brands": ["Sunlu", "eSun", "ZIRO 3D", "Overture", "Creality"], "materials": [], "colors": []}
        ),
        "bambu lab",
    )
    saved_retrieved = os.environ.pop("SPOOLMAN_RETRIEVED", None)
    saved_commit = os.environ.pop("SPOOLMAN_COMMIT", None)
    try:
        if builder.resolve_retrieved(real["source"]["commit"]) != real["source"]["retrieved"]:
            raise SystemExit("an unchanged commit should keep the recorded retrieval date")
        os.environ["SPOOLMAN_RETRIEVED"] = "2026-11-20"
        if builder.resolve_retrieved(real["source"]["commit"]) != "2026-11-20":
            raise SystemExit("SPOOLMAN_RETRIEVED was ignored")
        os.environ["SPOOLMAN_RETRIEVED"] = "nope"
        expect_exit(lambda: builder.resolve_retrieved(real["source"]["commit"]), "YYYY-MM-DD")
        os.environ["SPOOLMAN_RETRIEVED"] = "2026-11-20"
        os.environ["SPOOLMAN_COMMIT"] = real["source"]["commit"]
        if builder.resolve_commit(Path("/tmp")) != real["source"]["commit"]:
            raise SystemExit("SPOOLMAN_COMMIT was ignored")
        os.environ["SPOOLMAN_COMMIT"] = "abc"
        expect_exit(lambda: builder.resolve_commit(Path("/tmp")), "40 lowercase hex")
    finally:
        if saved_retrieved is None:
            os.environ.pop("SPOOLMAN_RETRIEVED", None)
        else:
            os.environ["SPOOLMAN_RETRIEVED"] = saved_retrieved
        if saved_commit is None:
            os.environ.pop("SPOOLMAN_COMMIT", None)
        else:
            os.environ["SPOOLMAN_COMMIT"] = saved_commit
    print("catalog update self-test ok")


def main() -> None:
    old = load_catalog(CATALOG_PATH)
    with tempfile.TemporaryDirectory(prefix="spoolmandb-") as tmp:
        commit = clone_spoolmandb(Path(tmp))
        short = commit[:7]
        if recorded_commit(old) == commit:
            message = f"SpoolmanDB catalog is already current at {commit}."
            print(message)
            set_output("changed", "false")
            set_output("short_sha", short)
            step_summary(message)
            return
        retrieved = datetime.now(timezone.utc).date().isoformat()
        rebuild(Path(tmp), commit, retrieved)
    new = load_catalog(CATALOG_PATH)
    if new is None or recorded_commit(new) != commit:
        raise SystemExit("Catalog rebuild did not write the new SpoolmanDB commit")
    body = render_body(old, new)
    destination = body_path()
    destination.write_text(body, encoding="utf-8", newline="\n")
    print(body, end="" if body.endswith("\n") else "\n")
    set_output("changed", "true")
    set_output("short_sha", short)
    step_summary(body)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        main()
    elif sys.argv[1:] == ["--self-test"]:
        self_test()
    else:
        raise SystemExit("usage: update-catalog.py [--self-test]")
