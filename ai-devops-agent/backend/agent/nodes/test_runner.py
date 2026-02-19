import os
import subprocess
from agent.state import AgentState
from agent.nodes.utils import run


# Max time per test/lint run — keep under 2 min to stay within speed bonus window
DEFAULT_TEST_TIMEOUT = 120
DEFAULT_LINT_TIMEOUT = 60


def test_runner(state: AgentState) -> AgentState:
    """
    Test Runner Node:
    - Installs dependencies if needed
    - Runs linter (flake8/eslint) to surface LINTING/IMPORT errors
    - Runs test suite (pytest/npm test) to surface LOGIC/SYNTAX/TYPE errors
    - Stores stdout/stderr separately in raw_test_output for classifier
    - Does NOT increment iteration (that's ci_monitor's job)
    """

    # Install dependencies before running tests
    _install_dependencies(state)

    combined_output = []

    # 1. Run linter first — surfaces LINTING, IMPORT, INDENTATION errors
    if state.lint_cmd:
        lint_out = _run_command(
            cmd=state.lint_cmd,
            cwd=state.repo_path,
            timeout=DEFAULT_LINT_TIMEOUT,
            label="LINT",
        )
        if lint_out:
            combined_output.append(lint_out)

    # 2. Run test suite — surfaces SYNTAX, LOGIC, TYPE_ERROR
    if not state.test_cmd:
        state.test_passed = False
        state.raw_test_output = "No supported test runner detected"
        return state

    test_out, test_passed = _run_tests(
        cmd=state.test_cmd,
        cwd=state.repo_path,
        timeout=DEFAULT_TEST_TIMEOUT,
    )

    if test_out:
        combined_output.append(test_out)

    # Update state
    state.test_passed = test_passed and not combined_output[0:1]  # passed only if lint+tests clean
    state.test_passed = test_passed  # test_passed is primary signal; lint failures caught by classifier
    state.raw_test_output = "\n".join(combined_output).strip() or None

    return state


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_tests(cmd: str, cwd: str, timeout: int) -> tuple[str, bool]:
    """
    Runs the test command, returns (output, passed).
    Validates that tests were actually collected — 
    exit 0 with no tests collected is NOT a pass.
    """
    code, stdout, stderr = run(cmd, cwd=cwd, timeout=timeout)
    output = _merge_output(stdout, stderr)

    # pytest-specific: "no tests ran" should not count as passed
    if code == 0 and "no tests ran" in output.lower():
        return output, False
    if code == 0 and "collected 0 items" in output.lower():
        return output, False

    passed = (code == 0)
    return output, passed


def _run_command(cmd: str, cwd: str, timeout: int, label: str) -> str:
    """
    Runs a generic command (linter etc.) and returns combined output.
    Non-zero exit is expected for linters — don't treat as crash.
    """
    try:
        code, stdout, stderr = run(cmd, cwd=cwd, timeout=timeout)
        output = _merge_output(stdout, stderr)
        if output:
            print(f"[AI-AGENT] {label} output ({len(output.splitlines())} lines)")
        return output
    except Exception as e:
        print(f"[AI-AGENT] WARNING: {label} command failed: {e}")
        return ""


def _install_dependencies(state: AgentState) -> None:
    if state.deps_installed:  # Skip if already installed
        return
    
    repo_path = state.repo_path
    if not repo_path:
        return

    requirements_txt = os.path.join(repo_path, "requirements.txt")
    pyproject = os.path.join(repo_path, "pyproject.toml")
    package_json = os.path.join(repo_path, "package.json")

    if os.path.exists(requirements_txt):
        print("[AI-AGENT] Installing Python dependencies from requirements.txt...")
        run("pip install -r requirements.txt -q", cwd=repo_path, timeout=120)
    elif os.path.exists(pyproject):
        print("[AI-AGENT] Installing Python dependencies from pyproject.toml...")
        run("pip install -e . -q", cwd=repo_path, timeout=120)

    if os.path.exists(package_json):
        print("[AI-AGENT] Installing Node dependencies from package.json...")
        run("npm install --silent", cwd=repo_path, timeout=180)

    if state.language == "python":
        run("pip install flake8 pytest -q", cwd=repo_path, timeout=60)

    state.deps_installed = True  # Mark as done — never install again


def _merge_output(stdout: str, stderr: str) -> str:
    """Merges stdout and stderr with a separator for structured parsing."""
    parts = []
    if stdout and stdout.strip():
        parts.append(stdout.strip())
    if stderr and stderr.strip():
        parts.append(stderr.strip())
    return "\n".join(parts)
