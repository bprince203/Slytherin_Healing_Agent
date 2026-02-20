import subprocess
import shlex
from datetime import datetime, timezone
from agent.state import AgentState, CIRun


def ci_monitor(state: AgentState) -> AgentState:
    state.iteration += 1
    print(f"[AI-AGENT] CI Monitor — iteration {state.iteration}/{state.max_iterations}")

    # Run fresh test to get actual current status
    tests_passed, _ = _run_tests(state.repo_path, state.test_cmd)

    lint_related_types = {"LINTING", "IMPORT", "INDENTATION", "SYNTAX"}
    needs_lint_validation = any(f.bug_type in lint_related_types for f in state.failures)
    lint_passed = True
    if needs_lint_validation and state.lint_cmd:
        lint_passed, _ = _run_lint(state.repo_path, state.lint_cmd)
        if not lint_passed:
            print("[AI-AGENT] Lint validation failed during CI monitor")

    passed = tests_passed and lint_passed

    state.test_passed = passed
    state.push_attempted = False

    ci_status = "PASSED" if passed else "FAILED"
    state.ci_runs.append(CIRun(
        iteration=state.iteration,
        status=ci_status,
        timestamp=_now(),
    ))

    if passed:
        state.final_status = "PASSED"
        print(f"[AI-AGENT] ✓ All tests passing — status: PASSED")
        return state

    # Max iterations reached
    if state.iteration >= state.max_iterations:
        state.final_status = "FAILED"
        print(f"[AI-AGENT] Max iterations reached — final status: FAILED")
        return state

    # Still have iterations — keep running
    state.final_status = "RUNNING"
    print(f"[AI-AGENT] CI status: RUNNING")
    return state


def _run_tests(repo_path: str, test_cmd: str) -> tuple[bool, int]:
    """Runs the test command and returns (passed, exit_code)."""
    if not repo_path:
        return False, 1

    try:
        result = subprocess.run(
            shlex.split(test_cmd),
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=120,
        )
        passed = result.returncode == 0
        return passed, result.returncode
    except subprocess.TimeoutExpired:
        print("[AI-AGENT] WARNING: Test run timed out")
        return False, 1
    except Exception as e:
        print(f"[AI-AGENT] WARNING: Test run error — {e}")
        return False, 1


def _run_lint(repo_path: str, lint_cmd: str) -> tuple[bool, int]:
    if not repo_path or not lint_cmd:
        return True, 0

    try:
        result = subprocess.run(
            shlex.split(lint_cmd),
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=90,
        )
        passed = result.returncode == 0
        return passed, result.returncode
    except subprocess.TimeoutExpired:
        print("[AI-AGENT] WARNING: Lint run timed out")
        return False, 1
    except Exception as e:
        print(f"[AI-AGENT] WARNING: Lint run error — {e}")
        return False, 1


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
