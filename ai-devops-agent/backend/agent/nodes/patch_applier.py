import os
import subprocess
from agent.state import AgentState, Fix


def patch_applier(state: AgentState) -> AgentState:
    if not state.fixes:
        return state

    for fix in state.fixes:
        if fix.status == "FAILED":
            # Already marked failed by fix_generator — skip
            print(f"[DEBUG] patch_applier: {fix.file} | pre-marked FAILED — skipping")
            continue

        file_path = os.path.join(state.repo_path, fix.file)

        if not os.path.exists(file_path):
            fix.status = "FAILED"
            fix.diff = "File not found"
            print(f"[DEBUG] patch_applier: {fix.file} | FILE NOT FOUND")
            continue

        # Check git status — covers both staged and unstaged changes
        has_changes = _has_any_changes(state.repo_path, fix.file)
        print(f"[DEBUG] patch_applier: {fix.file} | has_changes={has_changes} | status={fix.status}")

        if has_changes:
            fix.status = "FIXED"
            if not fix.diff:
                fix.diff = _get_git_diff(state.repo_path, fix.file)
        else:
            fix.status = "FAILED"
            fix.diff = "No changes detected by git"

    return state


def _has_any_changes(repo_path: str, file_path: str) -> bool:
    """Checks git status for both staged and unstaged changes."""
    try:
        # Check unstaged changes
        result = subprocess.run(
            ["git", "diff", "--", file_path],
            cwd=repo_path, capture_output=True, text=True, timeout=10
        )
        if result.stdout.strip():
            return True

        # Check staged changes (already added but not committed)
        result2 = subprocess.run(
            ["git", "diff", "--cached", "--", file_path],
            cwd=repo_path, capture_output=True, text=True, timeout=10
        )
        return bool(result2.stdout.strip())
    except Exception:
        return False


def _get_git_diff(repo_path: str, file_path: str) -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--", file_path],
            cwd=repo_path, capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() or "(diff not available)"
    except Exception:
        return "(diff not available)"
