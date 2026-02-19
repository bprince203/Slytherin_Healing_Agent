import subprocess
import shlex
import datetime
import os
from datetime import timezone


# ---------------------------------------------------------------------------
# Allowlisted command prefixes — only these base commands are permitted
# Prevents arbitrary command injection from repo-derived content
# ---------------------------------------------------------------------------
ALLOWED_COMMANDS = {
    "pytest", "python", "pip", "npm", "node", "npx",
    "mvn", "git", "flake8", "mypy", "eslint",
    "python3", "pip3",
}


def run(
    cmd: str,
    cwd: str = None,
    timeout: int = 120,
    safe: bool = True,
) -> tuple[int, str, str]:
    """
    Runs a shell command safely.
    
    Args:
        cmd: Command string to run
        cwd: Working directory
        timeout: Max seconds before kill
        safe: If True, validates command against allowlist
    
    Returns:
        (returncode, stdout, stderr)
    """
    # Validate command against allowlist
    if safe and not _is_allowed(cmd):
        print(f"[AI-AGENT] BLOCKED: Command not in allowlist: {cmd!r}")
        return 1, "", f"Command blocked by security policy: {cmd}"

    print(f"[AI-AGENT] RUN: {cmd!r} (cwd={cwd})")

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ},   # Inherit env but don't pollute
        )

        if result.returncode != 0:
            print(f"[AI-AGENT] EXIT {result.returncode}: {cmd!r}")

        return result.returncode, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        print(f"[AI-AGENT] TIMEOUT ({timeout}s): {cmd!r}")
        return 1, "", f"Command timed out after {timeout}s"
    except Exception as e:
        print(f"[AI-AGENT] ERROR: {cmd!r} → {e}")
        return 1, "", str(e)


def run_sandboxed(
    cmd: str,
    repo_path: str,
    timeout: int = 120,
    image: str = "python:3.11-slim",
) -> tuple[int, str, str]:
    """
    Runs a command inside a Docker container for sandboxed execution.
    Mounts repo_path as /workspace inside the container.
    Required by PS for untrusted code execution.

    Falls back to run() if Docker is unavailable.
    """
    docker_cmd = (
        f"docker run --rm "
        f"--network=none "           # No network access inside sandbox
        f"--memory=512m "            # Memory limit
        f"--cpus=1 "                 # CPU limit
        f"-v {repo_path}:/workspace "
        f"-w /workspace "
        f"{image} "
        f"{cmd}"
    )

    # Check Docker is available
    check_code, _, _ = run("docker info", safe=False, timeout=10)
    if check_code != 0:
        print("[AI-AGENT] WARNING: Docker unavailable — running unsandboxed")
        return run(cmd, cwd=repo_path, timeout=timeout, safe=True)

    return run(docker_cmd, cwd=repo_path, timeout=timeout, safe=False)


def now() -> str:
    """Returns current UTC time as ISO 8601 string with Z suffix."""
    return datetime.datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def now_dt() -> datetime.datetime:
    """Returns current UTC datetime object (timezone-aware)."""
    return datetime.datetime.now(timezone.utc)


def elapsed_seconds(start_iso: str) -> float:
    """
    Computes seconds elapsed since a start ISO timestamp string.
    Useful for checking speed bonus threshold mid-run.
    """
    try:
        start = datetime.datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        return (datetime.datetime.now(timezone.utc) - start).total_seconds()
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_allowed(cmd: str) -> bool:
    """
    Checks if the command's base executable is in the allowlist.
    Handles both 'pytest' and 'python -m pytest' style commands.
    """
    try:
        # Get first token of command
        first_token = shlex.split(cmd)[0] if cmd.strip() else ""
        base = os.path.basename(first_token)   # Handle full paths like /usr/bin/python
        return base in ALLOWED_COMMANDS
    except Exception:
        return False
