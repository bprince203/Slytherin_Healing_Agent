import os
from dotenv import load_dotenv

# Load .env file if present (local development)
load_dotenv()


# ---------------------------------------------------------------------------
# Git / GitHub
# ---------------------------------------------------------------------------
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

# Branch suffix — must end with _AI_Fix exactly (PS requirement)
# Full branch name is dynamically built in AgentState via @model_validator
BRANCH_SUFFIX: str = "AI_Fix"


# ---------------------------------------------------------------------------
# LLM (for fix_generator advanced fix strategies)
# ---------------------------------------------------------------------------
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Which LLM provider to use: "openai" | "gemini" | "none"
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "none")


# ---------------------------------------------------------------------------
# Agent Execution
# ---------------------------------------------------------------------------
DEFAULT_MAX_ITERATIONS: int = int(os.getenv("MAX_ITERATIONS", "5"))

# Timeouts (seconds)
TEST_TIMEOUT: int = int(os.getenv("TEST_TIMEOUT", "120"))
LINT_TIMEOUT: int = int(os.getenv("LINT_TIMEOUT", "60"))
INSTALL_TIMEOUT: int = int(os.getenv("INSTALL_TIMEOUT", "180"))
CLONE_TIMEOUT: int = int(os.getenv("CLONE_TIMEOUT", "60"))

# Speed bonus threshold (seconds) — PS: +10 if < 5 minutes
SPEED_BONUS_THRESHOLD: int = 300


# ---------------------------------------------------------------------------
# Sandboxing (Docker)
# ---------------------------------------------------------------------------
DOCKER_ENABLED: bool = os.getenv("DOCKER_ENABLED", "false").lower() == "true"
DOCKER_IMAGE: str = os.getenv("DOCKER_IMAGE", "python:3.11-slim")
DOCKER_MEMORY_LIMIT: str = os.getenv("DOCKER_MEMORY_LIMIT", "512m")
DOCKER_CPU_LIMIT: str = os.getenv("DOCKER_CPU_LIMIT", "1")


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
RESULTS_FILENAME: str = os.getenv("RESULTS_FILENAME", "results.json")

# API server
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))


# ---------------------------------------------------------------------------
# Startup validation — fail fast if critical config is missing
# ---------------------------------------------------------------------------
def validate_config() -> None:
    """
    Call once at API server startup.
    Raises ValueError if any required env var is missing.
    """
    errors = []

    if not GITHUB_TOKEN:
        errors.append("GITHUB_TOKEN is required (for cloning and pushing to GitHub)")

    if LLM_PROVIDER == "openai" and not OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY is required when LLM_PROVIDER=openai")

    if LLM_PROVIDER == "gemini" and not GEMINI_API_KEY:
        errors.append("GEMINI_API_KEY is required when LLM_PROVIDER=gemini")

    if errors:
        raise ValueError(
            "[AI-AGENT] Configuration errors:\n" +
            "\n".join(f"  - {e}" for e in errors)
        )

    print("[AI-AGENT] Configuration validated ✓")
