import tempfile
import os
import atexit
import shutil
from git import Repo, GitCommandError, InvalidGitRepositoryError
from agent.state import AgentState

# Directories to exclude from structure analysis
EXCLUDED_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "env", "dist", "build", ".tox", ".mypy_cache",
    ".pytest_cache", "target",
}


def repo_analyzer(state: AgentState) -> AgentState:
    """
    Repo Analyzer Node (first node in pipeline):
    - Records start time for timing/scoring
    - Clones the repository into a temp directory
    - Registers cleanup on process exit
    - Analyzes repo structure for downstream nodes
    - Does NOT do language detection (delegated to language_detector)
    """

    # Record start time — must be first node
    state.record_start()

    # Clone repository
    repo_dir = _clone_repo(state.repo_url, state.github_token)
    if repo_dir is None:
        state.final_status = "FAILED"
        return state

    state.repo_path = repo_dir

    # Register cleanup so temp dir is removed on process exit
    atexit.register(_cleanup_repo, repo_dir)

    # Analyze repo structure — populate structure metadata
    state.repo_structure = _analyze_structure(repo_dir)

    return state


# ---------------------------------------------------------------------------
# Clone
# ---------------------------------------------------------------------------

def _clone_repo(repo_url: str, github_token: str = None) -> str | None:
    """
    Clones the repo into a temp directory.
    Supports token auth for private repos.
    Returns the temp dir path or None on failure.
    """
    repo_dir = tempfile.mkdtemp(prefix="cicd_agent_")

    # Inject token into URL if provided
    # https://github.com/org/repo → https://TOKEN@github.com/org/repo
    if github_token and repo_url.startswith("https://github.com/"):
        auth_url = repo_url.replace(
            "https://github.com/",
            f"https://{github_token}@github.com/"
        )
    else:
        auth_url = repo_url

    try:
        print(f"[AI-AGENT] Cloning {repo_url} ...")
        Repo.clone_from(auth_url, repo_dir, depth=1)  # Shallow clone for speed
        print(f"[AI-AGENT] Clone successful → {repo_dir}")
        return repo_dir

    except GitCommandError as e:
        print(f"[AI-AGENT] ERROR: Clone failed — {e}")
        _cleanup_repo(repo_dir)
        return None
    except Exception as e:
        print(f"[AI-AGENT] ERROR: Unexpected clone error — {e}")
        _cleanup_repo(repo_dir)
        return None


# ---------------------------------------------------------------------------
# Structure Analysis
# ---------------------------------------------------------------------------

def _analyze_structure(repo_dir: str) -> dict:
    """
    Walks the repo and returns a structure summary.
    Used by test_runner and language_detector downstream.
    """
    test_files = []
    source_files = []
    config_files = []

    config_names = {
        "pytest.ini", "setup.cfg", "pyproject.toml",
        "package.json", "tsconfig.json", ".flake8",
        "mypy.ini", "tox.ini", "Makefile", "pom.xml",
    }

    for root, dirs, files in os.walk(repo_dir):
        # Prune excluded dirs in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        rel_root = os.path.relpath(root, repo_dir)

        for filename in files:
            rel_path = os.path.join(rel_root, filename)
            rel_path = rel_path.lstrip("./\\")

            if filename in config_names:
                config_files.append(rel_path)

            # Test file detection — dynamic, no hardcoded paths
            if (
                filename.startswith("test_") or
                filename.endswith("_test.py") or
                filename.endswith(".test.js") or
                filename.endswith(".test.ts") or
                filename.endswith(".spec.js") or
                filename.endswith(".spec.ts") or
                "test" in filename.lower()
            ) and not filename.startswith("."):
                test_files.append(rel_path)
            else:
                source_files.append(rel_path)

    return {
        "test_files": test_files,
        "source_files": source_files,
        "config_files": config_files,
        "total_files": len(test_files) + len(source_files),
    }


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def _cleanup_repo(repo_dir: str) -> None:
    """Removes the temp directory safely."""
    try:
        if os.path.exists(repo_dir):
            shutil.rmtree(repo_dir)
            print(f"[AI-AGENT] Cleaned up temp dir: {repo_dir}")
    except Exception as e:
        print(f"[AI-AGENT] WARNING: Could not clean up {repo_dir}: {e}")
