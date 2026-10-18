"""Repeatable SE3110 rehearsal checks. Never starts a live AI provider or uses the app DB.

python3 scripts/viva-check.py --prepare
python3 scripts/viva-check.py --member c1  # c2, c3, c4, all
python3 scripts/viva-check.py --full      # disposable PostgreSQL + all offline suites
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "backend/LegalService.Tests/LegalService.Tests.csproj"
FILTERS = {
    "c1": "FullyQualifiedName~LawyerManagementHttpTests&FullyQualifiedName!~Qmse_LocalEvidenceHost",
    "c2": "FullyQualifiedName~QmseAppointmentTests",
    "c3": "FullyQualifiedName~QmseUploadRegressionTests",
    "c4": "FullyQualifiedName~Qmse_TC_C4_09|FullyQualifiedName~PasswordCurrentContractTests|FullyQualifiedName~SecurityHeaderTests",
}


def environment():
    env = os.environ.copy()
    for key in list(env):
        if key.startswith(("E2E_", "MEMBER1_TEST_", "LAWYER_MOBILE_TEST_", "QMSE_")) or key in (
            "GEMINI_API_KEY", "GOOGLE_API_KEY", "ConnectionStrings__DefaultConnection"
        ):
            env.pop(key, None)
    env.update(PYTHON_DOTENV_DISABLED="1", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1",
               GEMINI_API_KEY="synthetic-only", GOOGLE_API_KEY="synthetic-only")
    return env


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--member", choices=[*FILTERS, "all"], default="all")
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    out = ROOT / "qmse-output" / "viva" / stamp
    out.mkdir(parents=True)
    env, results = environment(), []

    def run(name, command, cwd=ROOT):
        print(f"{name}: running", flush=True)
        start = time.monotonic()
        log = out / f"{name}.log"
        try:
            with log.open("w") as stream:
                proc = subprocess.run(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT)
            code = proc.returncode
        except FileNotFoundError as error:
            log.write_text(str(error))
            code = 127
        results.append({"name": name, "exit_code": code, "seconds": round(time.monotonic() - start, 3),
                        "command": command, "log": str(log.relative_to(ROOT))})
        print(f"{name}: {'PASS' if code == 0 else 'FAIL'} ({log.relative_to(ROOT)})", flush=True)
        return code == 0

    def backend(name, selection):
        return run(name, ["dotnet", "test", PROJECT, "--no-restore", "--filter", selection,
                          "--logger", f"trx;LogFileName={name}.trx", "--results-directory", str(out)])

    pg_dir = None
    pg_ctl = None
    pg_started = False
    try:
        if args.prepare:
            cache = ROOT / "qmse-output/.dotnet/.nuget/packages"
            restore = ["dotnet", "restore", PROJECT]
            if cache.is_dir():
                restore += ["--packages", str(cache)]
            run("prepare-backend", restore)
            run("prepare-mobile", ["flutter", "pub", "get", "--offline"], ROOT / "mobile")
        elif args.full:
            initdb = shutil.which("initdb")
            if not initdb:
                raise RuntimeError("PostgreSQL initdb/pg_ctl must be on PATH for --full.")
            pg_ctl = str(Path(initdb).resolve().with_name("pg_ctl"))
            pg_dir = Path(tempfile.mkdtemp(prefix="gr42-viva-pg-"))
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            if not run("postgres-init", [initdb, "-D", str(pg_dir), "-U", "viva", "-A", "trust", "--no-locale"]):
                raise RuntimeError("Disposable PostgreSQL initialization failed.")
            # Only an owned localhost cluster; its socket and data directory are private.
            with (pg_dir / "postgresql.conf").open("a") as config:
                config.write(f"\nlisten_addresses='127.0.0.1'\nport={port}\nunix_socket_directories='{pg_dir}'\n")
            if not run("postgres-start", [pg_ctl, "-D", str(pg_dir), "-l", str(pg_dir / "server.log"), "start", "-w"]):
                raise RuntimeError("Disposable PostgreSQL could not start.")
            pg_started = True
            connection = f"Host=127.0.0.1;Port={port};Database=postgres;Username=viva"
            env.update(MEMBER1_TEST_POSTGRES=connection, LAWYER_MOBILE_TEST_POSTGRES=connection)
            # Three old cases require a fixed port, seeded database and a dated slot.
            # They remain in source/report and are not relabelled as passing here.
            backend("backend", "FullyQualifiedName!~HistoricalPostgresSetupTests&FullyQualifiedName!~HistoricalSlotConstraintTests")
            for member, selection in FILTERS.items():
                backend(member, selection)
            python = ROOT / "ai-service/.venv/bin/python"
            run("ai", [str(python), "-m", "pytest", "ai-service/tests", "-q", f"--junitxml={out / 'ai.xml'}"])
            run("web-build", ["npm", "run", "build"], ROOT / "frontend")
            run("web-node", ["npm", "run", "test:member1"], ROOT / "frontend")
            # Existing Playwright specs include HTTP fixtures, not a live provider or real UI-to-DB E2E.
            run("web-ui", ["npx", "playwright", "test", "--reporter=line", "--output", str(out / "playwright")], ROOT / "frontend")
            run("mobile", ["flutter", "test", "--no-pub", "--reporter", "expanded"], ROOT / "mobile")
        else:
            for member in FILTERS if args.member == "all" else [args.member]:
                backend(member, FILTERS[member])
        if not args.prepare:
            # Fail if the test runner reports success without actually creating native evidence.
            for result in results:
                if result["name"] in {*FILTERS, "backend"}:
                    trx = out / f"{result['name']}.trx"
                    if not trx.exists():
                        result["exit_code"] = 1
                        result["error"] = "No TRX generated; execution is not verified. Run --prepare first."
                    else:
                        counters = ET.parse(trx).find(".//{*}Counters")
                        result["native_counts"] = counters.attrib if counters is not None else {}
                        if counters is None or int(counters.get("executed", "0")) == 0:
                            result["exit_code"] = 1
                            result["error"] = "Native report contains no executed tests."
    except (RuntimeError, OSError) as error:
        print(str(error), flush=True)
        results.append({"name": "setup", "exit_code": 1, "error": str(error)})
    finally:
        if pg_dir is not None and pg_ctl and pg_started:
            stopped = run("postgres-stop", [pg_ctl, "-D", str(pg_dir), "stop", "-m", "fast", "-w"])
            if stopped:
                shutil.copyfile(pg_dir / "server.log", out / "postgres-server.log")
                shutil.rmtree(pg_dir)
        elif pg_dir is not None:
            shutil.rmtree(pg_dir)
        receipt = {"created_utc": stamp, "ai_assistance": "Codex-assisted; personal execution must be demonstrated by each member",
                   "scope": "Fresh rehearsal evidence; does not overwrite historical acceptance ledger",
                   "excluded_historical_cases": ["HistoricalPostgresSetupTests", "HistoricalSlotConstraintTests"] if args.full else [],
                   "results": results}
        (out / "results.json").write_text(json.dumps(receipt, indent=2) + "\n")
        print(f"Evidence: {out.relative_to(ROOT)}", flush=True)
    return int(any(result["exit_code"] != 0 for result in results))


if __name__ == "__main__":
    raise SystemExit(main())
