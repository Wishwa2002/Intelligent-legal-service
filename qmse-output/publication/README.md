# Complete project material publication

This publication includes project source, reports (PDF/DOCX), historical versions, audit scripts, screenshots, logs, native test results and evidence packages, including project files previously omitted by Git ignore patterns.

`publication-manifest.json` records the included paths/checksums and the local exclusions. Private environment/signing files, installed dependencies/SDK caches, compiled build outputs, machine configuration/cache files and runtime sessions/uploaded documents stay local. No application source or report is excluded by those rules. Do not copy private `.env` files into Git; use the committed `.env.example` files on another laptop.

## Large archives

Four large historical evidence ZIPs are stored byte-for-byte as parts of at most 45 MiB to fit normal Git hosting file limits. Their original paths, lengths, complete checksums and each part's checksum are in `archives.json`. Other report/evidence files are available directly in their original directories.

From the repository root, verify all parts:

```sh
python3 scripts/restore-publication-archives.py --verify-only
```

Restore the original ZIP filenames and directories:

```sh
python3 scripts/restore-publication-archives.py
```

The restore command verifies the original complete SHA-256, accepts already restored identical files, and refuses to replace a different existing archive. Historical evidence packages describe their recorded source/date, not necessarily the latest branch commit. Fresh viva instructions are in `docs/viva/README.md`.
