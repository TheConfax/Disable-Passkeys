#!/usr/bin/env python3
import subprocess
import zipfile
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
GIT = ROOT / ".git"

DIST.mkdir(exist_ok=True)

version = json.loads((SRC / "manifest.json").read_text(encoding="utf-8"))["version"]
zip_path = DIST / f"Disable-Passkeys-{version}.zip"
if zip_path.exists():
    raise SystemExit(0)

if GIT.is_dir():
    out = subprocess.check_output(
        ["git", "ls-files", "-c", "--exclude-standard", "--", "src"],
        cwd=ROOT,
        text=True
    )
    files = [ROOT / p for p in out.splitlines() if p]
else:
    files = [p for p in SRC.rglob("*") if p.is_file()]

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.write(f, arcname=f.relative_to(SRC).as_posix())