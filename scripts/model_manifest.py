"""
Generate a manifest JSON for the currently deployed AI model.

Usage:
    python scripts/model_manifest.py

Output:
    src/airsafenet_ai/models/manifest.json
"""

import json
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path

MODEL_DIR = Path("src/airsafenet_ai/models")
OUTPUT    = MODEL_DIR / "manifest.json"

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    model_path = MODEL_DIR / "model.pkl"
    if not model_path.exists():
        print(f"⚠️  Model file not found: {model_path}")
        return

    manifest = {
        "model_file":    "model.pkl",
        "sha256":        sha256(model_path),
        "size_bytes":    model_path.stat().st_size,
        "generated_at":  datetime.now(timezone.utc).isoformat(),
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}",
    }

    meta_path = MODEL_DIR / "metadata.json"
    if meta_path.exists():
        with open(meta_path) as f:
            manifest["metadata"] = json.load(f)

    OUTPUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"✅ Manifest written to {OUTPUT}")
    print(f"   SHA256: {manifest['sha256'][:16]}...")
    print(f"   Size:   {manifest['size_bytes'] / 1024:.1f} KB")

if __name__ == "__main__":
    main()
