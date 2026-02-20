import os
import re
import subprocess
from git import Repo, GitCommandError, InvalidGitRepositoryError
from agent.state import AgentState, Fix


def git_commit(state: AgentState) -> AgentState:
    if state.read_only:
        state.push_attempted = False
        return state

    new_fixes = [f for f in state.fixes if f.status == "FIXED"]
    if not new_fixes:
        state.push_attempted = False
        return state

    try:
        repo = Repo(state.repo_path)
    except InvalidGitRepositoryError as e:
        _mark_fixes_failed(new_fixes, f"Invalid git repo: {e}")
        state.push_attempted = False
        return state

    # Branch management
    try:
        if state.iteration <= 1:
            try:
                repo.git.checkout("-b", state.branch_name)
            except GitCommandError:
                repo.git.checkout(state.branch_name)
        else:
            repo.git.checkout(state.branch_name)
    except GitCommandError as e:
        _mark_fixes_failed(new_fixes, f"Branch checkout failed: {e}")
        state.push_attempted = False
        return state

    # Stage all changes
    repo.git.add(A=True)

    if not repo.is_dirty(index=True):
        state.push_attempted = False
        return state

    # Commit
    primary_msg = _build_primary_message(new_fixes)
    try:
        commit = repo.index.commit(primary_msg)
        state.commits.append(commit.hexsha)
        for fix in new_fixes:
            fix.commit_message = f"[AI-AGENT] Fix {fix.bug_type} in {fix.file} line {fix.line}"
    except GitCommandError as e:
        _mark_fixes_failed(new_fixes, f"Commit failed: {e}")
        state.push_attempted = False
        return state

    # Push with token
    push_success = _push_to_remote(repo, state.branch_name, state.github_token)
    state.push_attempted = push_success
    return state


def _build_primary_message(fixes: list[Fix]) -> str:
    if len(fixes) == 1:
        f = fixes[0]
        return f"[AI-AGENT] Fix {f.bug_type} in {f.file} line {f.line}"
    return f"[AI-AGENT] Fix {len(fixes)} issues across {len(set(f.file for f in fixes))} files"


def _push_to_remote(repo, branch_name: str, github_token: str = None) -> bool:
    repo_path = repo.working_dir

    if not github_token:
        print("[AI-AGENT] WARNING: No GITHUB_TOKEN provided — skipping push")
        return False

    try:
        # Always build the push URL from scratch — ignore whatever origin has
        # Extract just the repo path (owner/repo) from any URL format
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=repo_path, capture_output=True, text=True
        )
        origin_url = result.stdout.strip()

        # Extract owner/repo from URL regardless of embedded credentials
        match = re.search(r'github\.com[/:]([^/]+/[^/\s]+?)(?:\.git)?$', origin_url)
        if not match:
            print(f"[AI-AGENT] ERROR: Cannot parse GitHub repo from URL: {origin_url}")
            return False

        repo_path_str = match.group(1)  # e.g. "rahulkpr2510/ai-agent-test-repo"

        push_url = f"https://{github_token}@github.com/{repo_path_str}.git"
        print(f"[DEBUG] git_commit: push_url=https://***@github.com/{repo_path_str}.git")

        push_result = subprocess.run(
            ["git", "push", push_url, f"HEAD:{branch_name}", "--set-upstream", "--force"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=60,
            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
        )

        if push_result.returncode == 0:
            print(f"[AI-AGENT] ✓ Pushed to origin/{branch_name}")
            return True
        else:
            err = push_result.stderr
            if github_token:
                err = err.replace(github_token, "***")
            print(f"[AI-AGENT] ERROR: Push failed — {err.strip()}")
            return False

    except Exception as e:
        print(f"[AI-AGENT] ERROR: Push exception — {e}")
        return False


def _mark_fixes_failed(fixes: list[Fix], reason: str) -> None:
    for fix in fixes:
        fix.status = "FAILED"
        fix.diff = reason
