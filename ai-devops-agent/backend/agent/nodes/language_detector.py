import os
from agent.state import AgentState

# Directories to skip during walking
EXCLUDED_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "env", ".env", "dist", "build", ".tox", ".mypy_cache",
    ".pytest_cache", "target",  # Java/Maven build dir
}

# Extension → language mapping
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",
}

# Language → test command mapping
TEST_COMMANDS = {
    "python": "python -m pytest --tb=short -q -x --maxfail=1",
    "javascript": "npm test -- --runInBand --watch=false --bail=1",
    "typescript": "npm test -- --runInBand --watch=false --bail=1",
    "java": "mvn test -q",
}

# Language → linter command mapping (for failure_classifier input)
LINT_COMMANDS = {
    "python": "python -m flake8 . --format=default --max-line-length=120",
    "javascript": "npx eslint . --format=compact",
    "typescript": "npx eslint . --format=compact",
    "java": None,
}


def language_detector(state: AgentState) -> AgentState:
    """
    Language Detector Node:
    - Walks repo excluding vendor/cache dirs
    - Counts files per language for confidence scoring
    - Stores language and test_cmd in correct state fields
    - Handles multi-language repos by picking dominant language
    """
    file_counts: dict[str, int] = {}

    for root, dirs, files in os.walk(state.repo_path):
        # Prune excluded directories in-place (prevents os.walk from descending)
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in LANGUAGE_MAP:
                lang = LANGUAGE_MAP[ext]
                file_counts[lang] = file_counts.get(lang, 0) + 1

    if not file_counts:
        state.language = "unknown"
        state.test_cmd = None
        state.lint_cmd = None
        return state

    # Pick dominant language by file count
    # Tie-break: python > typescript > javascript > java (judge repo bias)
    priority = ["python", "typescript", "javascript", "java"]
    dominant = max(
        file_counts,
        key=lambda lang: (file_counts[lang], -priority.index(lang) if lang in priority else -99)
    )

    state.language = dominant
    state.test_cmd = TEST_COMMANDS.get(dominant)
    state.lint_cmd = LINT_COMMANDS.get(dominant)

    # Log detection result
    print(f"[AI-AGENT] Detected language: {dominant} "
          f"({file_counts[dominant]} files) | "
          f"test_cmd: {state.test_cmd}")

    return state
