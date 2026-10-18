"""Verify or restore byte-identical report archives distributed in Git-sized parts.

python3 scripts/restore-publication-archives.py --verify-only
python3 scripts/restore-publication-archives.py
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "qmse-output/publication/archives.json"


def local_path(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Archive manifest path escapes the repository")
    return path


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while data := stream.read(1024 * 1024):
            digest.update(data)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    archives = json.loads(MANIFEST.read_text())["archives"]
    for archive in archives:
        digest = hashlib.sha256()
        size = 0
        for part in archive["parts"]:
            path = local_path(part["path"])
            if path.stat().st_size != part["size"] or digest_file(path) != part["sha256"]:
                raise ValueError(f"Part verification failed: {part['path']}")
            with path.open("rb") as stream:
                while data := stream.read(1024 * 1024):
                    digest.update(data)
                    size += len(data)
        if size != archive["size"] or digest.hexdigest() != archive["sha256"]:
            raise ValueError(f"Archive verification failed: {archive['original_path']}")
        destination = local_path(archive["original_path"])
        if args.verify_only:
            print(f"Verified: {archive['original_path']}")
            continue
        if destination.exists():
            if destination.stat().st_size == archive["size"] and digest_file(destination) == archive["sha256"]:
                print(f"Already restored: {archive['original_path']}")
                continue
            raise FileExistsError(f"Refusing to replace a different existing file: {destination}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(destination.name + ".restoring")
        created = False
        try:
            with temporary.open("xb") as output:
                created = True
                for part in archive["parts"]:
                    with local_path(part["path"]).open("rb") as stream:
                        while data := stream.read(1024 * 1024):
                            output.write(data)
            if temporary.stat().st_size != archive["size"] or digest_file(temporary) != archive["sha256"]:
                raise ValueError("Restored archive checksum mismatch")
            temporary.rename(destination)
        except Exception:
            # A pre-existing .restoring file belongs to an earlier attempt; leave it untouched.
            if created and temporary.exists():
                temporary.unlink()
            raise
        print(f"Restored: {archive['original_path']}")


if __name__ == "__main__":
    main()
