from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field, model_validator
from datetime import datetime, timezone
from agent.config import DEFAULT_MAX_ITERATIONS, BRANCH_SUFFIX


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Failure(BaseModel):
    file: str
    line: int
    bug_type: Literal["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]
    description: str

    # In state.py — Failure model
    def to_agent_output(self) -> str:
        import re
        code_match = re.match(r'^([A-Z]\d+)', self.description.strip())
        code = code_match.group(1) if code_match else ""
        readable = {
            "E302": "add 2 blank lines before function definition",
            "W391": "remove blank line at end of file",
            "W292": "add newline at end of file",
            "E712": "use 'is True' instead of '== True'",
            "F401": "remove the unused import statement",
            "E999": "fix the syntax error at this line",
            "W291": "remove trailing whitespace",
            "E501": "shorten the line to under 120 characters",
            "F841": "remove or use the assigned variable",
            "E111": "fix indentation to use 4 spaces",
        }.get(code, "fix the linting issue" if self.bug_type == "LINTING" else "fix the logic error")
        return f"{self.bug_type} error in {self.file} line {self.line} → Fix: {readable}"



class Fix(BaseModel):
    file: str
    line: int
    bug_type: Literal["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]
    commit_message: str          # Must always start with [AI-AGENT]
    status: Literal["FIXED", "FAILED"]
    diff: Optional[str] = None


class CIRun(BaseModel):
    iteration: int
    status: Literal["PASSED", "FAILED"]
    timestamp: str


class ScoreBreakdown(BaseModel):
    base_score: int = 100
    speed_bonus: int = 0         # +10 if total_time < 5 minutes (PS rule)
    efficiency_penalty: int = 0  # -2 per commit over 20 (PS rule)
    final_score: int = 100

    def compute(self, total_time_seconds: float, total_commits: int) -> None:
        """Computes final score based on PS scoring rules."""
        if total_time_seconds < 300:
            self.speed_bonus = 10
        excess_commits = max(0, total_commits - 20)
        self.efficiency_penalty = excess_commits * 2
        self.final_score = max(0, self.base_score + self.speed_bonus - self.efficiency_penalty)


# ---------------------------------------------------------------------------
# Main Agent State
# ---------------------------------------------------------------------------

class AgentState(BaseModel):

    # --- Required inputs ---
    repo_url: str
    team_name: str
    team_leader: str

    # --- Optional input ---
    github_token: Optional[str] = None

    # --- Repo analysis outputs (repo_analyzer) ---
    repo_path: Optional[str] = None
    repo_structure: Optional[dict] = None

    # --- Language detection outputs (language_detector) ---
    language: Optional[str] = None
    test_cmd: Optional[str] = None
    lint_cmd: Optional[str] = None

    # --- Branch (auto-generated via validator) ---
    branch_name: Optional[str] = None

    # --- Iteration control ---
    iteration: int = 0
    max_iterations: int = DEFAULT_MAX_ITERATIONS

    # --- Test state ---
    test_passed: bool = False
    raw_test_output: Optional[str] = None
    push_attempted: bool = False
    deps_installed: bool = False        # ← ADDED: prevents reinstalling on every iteration

    # --- Core agent outputs ---
    failures: List[Failure] = Field(default_factory=list)
    fixes: List[Fix] = Field(default_factory=list)
    commits: List[str] = Field(default_factory=list)
    ci_runs: List[CIRun] = Field(default_factory=list)
    pr_url: str = ""

    # --- Timing ---
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_time_seconds: Optional[float] = None

    # --- Scoring ---
    score: ScoreBreakdown = Field(default_factory=ScoreBreakdown)

    # --- Pipeline status ---
    final_status: Literal["RUNNING", "PASSED", "FAILED"] = "RUNNING"

    # ---------------------------------------------------------------------------
    # Validators
    # ---------------------------------------------------------------------------

    @model_validator(mode="after")
    def generate_branch_name(self) -> "AgentState":
        """
        Auto-generates branch name from team + leader names.
        Format: TEAMNAME_LEADERNAME_AI_Fix (exact PS requirement)
        e.g. Code Warriors + John Doe → CODE_WARRIORS_JOHN_DOE_AI_Fix
        """
        if not self.branch_name:
            team = self.team_name.upper().replace(" ", "_")
            leader = self.team_leader.upper().replace(" ", "_")
            self.branch_name = f"{team}_{leader}_{BRANCH_SUFFIX}"
        return self

    # ---------------------------------------------------------------------------
    # Timing helpers
    # ---------------------------------------------------------------------------

    def record_start(self) -> None:
        """Call at the very start of the pipeline (repo_analyzer node)."""
        self.start_time = _utcnow_iso()

    def record_end(self) -> None:
        """Call at finalize node. Computes total_time_seconds."""
        self.end_time = _utcnow_iso()
        if self.start_time:
            start = datetime.fromisoformat(self.start_time.replace("Z", "+00:00"))
            end = datetime.fromisoformat(self.end_time.replace("Z", "+00:00"))
            self.total_time_seconds = (end - start).total_seconds()

    # ---------------------------------------------------------------------------
    # Scoring helper
    # ---------------------------------------------------------------------------

    def finalize_score(self) -> None:
        """Computes final score. Call after record_end() in finalize node."""
        if self.total_time_seconds is not None:
            self.score.compute(self.total_time_seconds, len(self.commits))

    # ---------------------------------------------------------------------------
    # Convenience properties
    # ---------------------------------------------------------------------------

    @property
    def total_failures(self) -> int:
        return len(self.failures)

    @property
    def total_fixes_applied(self) -> int:
        return len([f for f in self.fixes if f.status == "FIXED"])

    @property
    def total_fixes_failed(self) -> int:
        return len([f for f in self.fixes if f.status == "FAILED"])

    @property
    def iterations_remaining(self) -> int:
        return max(0, self.max_iterations - self.iteration)

    @property
    def can_retry(self) -> bool:
        """True if more CI iterations are allowed."""
        return self.iteration < self.max_iterations and not self.test_passed


# ---------------------------------------------------------------------------
# Internal utility
# ---------------------------------------------------------------------------

def _utcnow_iso() -> str:
    """Returns current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
