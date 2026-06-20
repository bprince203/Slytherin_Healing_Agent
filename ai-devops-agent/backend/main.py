from datetime import datetime, timezone
from threading import Lock, Thread
from uuid import uuid4
import re
import subprocess
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator
import os
from dotenv import load_dotenv
from agent.orchestrator import run_agent
from agent.config import validate_config, API_HOST, API_PORT, DEFAULT_MAX_ITERATIONS

load_dotenv()
validate_config()

app = FastAPI(title="CI/CD Healing Agent", version="1.0.0")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunAgentRequest(BaseModel):
    repo_url: str | None = None
    repository_url: str | None = None
    team_name: str
    team_leader: str | None = None
    team_leader_name: str | None = None
    mode: str = "run-agent"
    authorize_write: bool = False
    github_token: str | None = None
    max_iterations: int = DEFAULT_MAX_ITERATIONS

    @model_validator(mode="after")
    def normalize_payload(self):
        if not self.repo_url and self.repository_url:
            self.repo_url = self.repository_url
        if not self.team_leader and self.team_leader_name:
            self.team_leader = self.team_leader_name
        if not self.repo_url:
            raise ValueError("repo_url/repository_url is required")
        if not self.team_leader:
            raise ValueError("team_leader/team_leader_name is required")
        return self


class RunStartResponse(BaseModel):
    run_id: str
    final_status: str


class RunStatusResponse(BaseModel):
    run_id: str
    mode: str
    repository_url: str
    team_name: str
    team_leader_name: str
    branch_name: str
    pr_url: str
    total_failures_detected: int
    total_fixes_applied: int
    final_status: str
    started_at: str | None
    finished_at: str | None
    total_time_taken: str | None
    ci_timeline: list
    logs: list
    fixes: list
    results_json: dict | None


RUNS: dict[str, dict] = {}
RUNS_LOCK = Lock()

PIPELINE_STEPS = [
    "Clone Repo",
    "Install Dependencies",
    "Run Tests",
    "Detect Errors",
    "Generate Fix",
    "Apply Fix",
    "Re-run Tests",
    "Create Branch",
    "Done",
]

NODE_STEP_MAP = {
    "repo": "Clone Repo",
    "detect_lang": "Install Dependencies",
    "test": "Run Tests",
    "classify": "Detect Errors",
    "fix": "Generate Fix",
    "patch": "Apply Fix",
    "commit": "Create Branch",
    "create_pr": "Create Branch",
    "ci": "Re-run Tests",
    "final": "Done",
}

GITHUB_REPO_URL_RE = re.compile(r"^https://github\.com/[^/\s]+/[^/\s]+/?$")
GITHUB_OWNER_REPO_RE = re.compile(r"^https://github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$")


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _format_duration(seconds: float | None) -> str | None:
    if seconds is None:
        return None
    minutes = int(seconds // 60)
    remaining = int(seconds % 60)
    return f"{minutes}m {remaining:02d}s"


def _append_log(run_id: str, level: str, text: str) -> None:
    with RUNS_LOCK:
        run = RUNS.get(run_id)
        if not run:
            return
        run["logs"].append({"ts": _now_iso(), "level": level, "text": text})


def _append_log_chunk(run_id: str, level: str, lines: list[str], limit: int = 6) -> None:
    clean_lines = [line.strip() for line in lines if line and line.strip()]
    for line in clean_lines[:limit]:
        _append_log(run_id, level, line)


def _split_diff_before_after(diff_text: str | None) -> tuple[str, str]:
    if not diff_text:
        return "(No original snippet captured)", "(No updated snippet captured)"

    diff_lines = diff_text.splitlines()
    before_lines: list[str] = []
    after_lines: list[str] = []

    for line in diff_lines:
        if line.startswith("diff --git") or line.startswith("index ") or line.startswith("@@"):
            continue
        if line.startswith("---") or line.startswith("+++"):
            continue
        if line.startswith("-"):
            before_lines.append(line[1:])
            continue
        if line.startswith("+"):
            after_lines.append(line[1:])
            continue
        if line.startswith(" "):
            context_line = line[1:]
            before_lines.append(context_line)
            after_lines.append(context_line)

    before_text = "\n".join(before_lines).strip()
    after_text = "\n".join(after_lines).strip()

    if not before_text and not after_text:
        clean = diff_text.strip()
        return "(No original snippet captured)", clean or "(No updated snippet captured)"

    if not before_text:
        before_text = "(No original snippet captured)"
    if not after_text:
        after_text = "(No updated snippet captured)"

    return before_text, after_text


def _set_step(run_id: str, step_name: str, status: str, detail: str = "") -> None:
    with RUNS_LOCK:
        run = RUNS.get(run_id)
        if not run:
            return
        for step in run["ci_timeline"]:
            if step["name"] == step_name:
                step["status"] = status
                if detail:
                    step["detail"] = detail
                break


def _seed_run(request: RunAgentRequest) -> dict:
    return {
        "run_id": str(uuid4()),
        "mode": request.mode,
        "repository_url": request.repo_url,
        "team_name": request.team_name,
        "team_leader_name": request.team_leader,
        "branch_name": "",
        "pr_url": "",
        "total_failures_detected": 0,
        "total_fixes_applied": 0,
        "final_status": "RUNNING",
        "started_at": _now_iso(),
        "finished_at": None,
        "total_time_taken": None,
        "ci_timeline": [{"name": name, "status": "pending", "detail": ""} for name in PIPELINE_STEPS],
        "logs": [],
        "fixes": [],
        "results_json": None,
    }


def _is_read_only_mode(mode: str) -> bool:
    return mode == "analyze-repository"


def _extract_owner_repo(repo_url: str) -> tuple[str, str] | None:
    match = GITHUB_OWNER_REPO_RE.match(repo_url)
    if not match:
        return None
    return match.group(1), match.group(2)


def _validate_write_permission_or_raise(repo_url: str, github_token: str) -> None:
    owner_repo = _extract_owner_repo(repo_url)
    if not owner_repo:
        raise HTTPException(status_code=400, detail="Invalid repository URL for permission check")

    owner, repo = owner_repo
    try:
        response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10,
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to verify repository permissions. Check network and token validity.",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=403,
            detail="Repository not accessible with this token. You need collaborator/member access for write operations.",
        )

    if not response.ok:
        raise HTTPException(
            status_code=400,
            detail=f"Permission check failed with GitHub API status {response.status_code}.",
        )

    payload = response.json()
    permissions = payload.get("permissions") or {}
    has_write = any(
        bool(permissions.get(key))
        for key in ("admin", "maintain", "push")
    )

    if not has_write:
        raise HTTPException(
            status_code=403,
            detail="Write permission missing for this repository. Ask for collaborator write access or use analyze-repository mode.",
        )

def _resolve_github_token(request_token: str | None) -> str:
    return (request_token or os.getenv("GITHUB_TOKEN") or "").strip()


def _validate_mode_auth_or_raise(mode: str, authorize_write: bool, repo_url: str, github_token: str) -> None:
    if _is_read_only_mode(mode):
        return
    if not authorize_write:
        raise HTTPException(
            status_code=400,
            detail="Write authorization is required for run-agent mode. Confirm write access or use analyze-repository.",
        )
    if not github_token:
        raise HTTPException(
            status_code=400,
            detail="GitHub token is required for write mode (run-agent). Provide it in the form or backend .env GITHUB_TOKEN. Use analyze-repository for read-only mode.",
        )

    _validate_write_permission_or_raise(repo_url, github_token)


def _build_results_payload(state) -> dict:
    return {
        "run_summary": {
            "repo_url": state.repo_url,
            "team_name": state.team_name,
            "team_leader": state.team_leader,
            "branch_name": state.branch_name,
            "total_failures_detected": len(state.failures),
            "total_fixes_applied": len([fix for fix in state.fixes if fix.status == "FIXED"]),
            "final_ci_status": state.final_status,
            "start_time": state.start_time,
            "end_time": state.end_time,
            "total_time_seconds": state.total_time_seconds,
        },
        "score_breakdown": {
            "base_score": state.score.base_score,
            "speed_bonus": state.score.speed_bonus,
            "efficiency_penalty": state.score.efficiency_penalty,
            "final_score": state.score.final_score,
            "total_commits": len(state.commits),
        },
        "fixes": [
            {
                "file": fix.file,
                "bug_type": fix.bug_type,
                "line_number": fix.line,
                "commit_message": fix.commit_message,
                "status": fix.status,
                "diff": fix.diff,
            }
            for fix in state.fixes
        ],
        "ci_timeline": [
            {
                "iteration": run.iteration,
                "status": run.status,
                "timestamp": run.timestamp,
                "iteration_label": f"{run.iteration}/{state.max_iterations}",
            }
            for run in state.ci_runs
        ],
        "agent_output": [failure.to_agent_output() for failure in state.failures],
    }


def _validate_repo_url_or_raise(repo_url: str) -> None:
    if not GITHUB_REPO_URL_RE.match(repo_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Use format: https://github.com/<owner>/<repo>",
        )

    try:
        check = subprocess.run(
            ["git", "ls-remote", "--heads", repo_url],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to verify repository URL. Please check repository access and URL.",
        )

    if check.returncode != 0:
        stderr = (check.stderr or "").strip().splitlines()
        reason = stderr[-1] if stderr else "Repository not found or inaccessible"
        raise HTTPException(
            status_code=400,
            detail=f"Repository validation failed: {reason}",
        )


def _run_agent_worker(run_id: str, request: RunAgentRequest) -> None:
    try:
        def on_node_event(payload: dict) -> None:
            event = payload.get("event")
            node = payload.get("node", "")
            iteration = payload.get("iteration", 0)
            step_name = NODE_STEP_MAP.get(node)
            if not step_name:
                return

            if event == "node_start":
                _set_step(step_name=step_name, run_id=run_id, status="running", detail=f"{node} started (iteration {iteration})")
                _append_log(run_id, "info", f"[{node}] started (iteration {iteration})")
                return

            if event == "node_end":
                final_status = str(payload.get("final_status", "RUNNING")).upper()
                read_only = bool(payload.get("read_only", False))
                push_attempted = bool(payload.get("push_attempted", False))
                latest_commit = payload.get("latest_commit")
                latest_fix = payload.get("latest_fix") or {}
                latest_fix_status = str(latest_fix.get("status", "")).upper()
                failures_count = int(payload.get("failures_count") or 0)
                fixes_count = int(payload.get("fixes_count") or 0)
                pr_url = str(payload.get("pr_url") or "")

                status = "success"
                if node == "test" and not payload.get("test_passed", False):
                    status = "failed"
                elif node == "ci" and final_status == "FAILED":
                    status = "failed"
                elif node == "final" and final_status == "FAILED":
                    status = "failed"
                elif node in ("fix", "patch"):
                    if latest_fix_status == "FAILED":
                        status = "failed"
                    elif failures_count > 0 and fixes_count == 0:
                        status = "failed"
                elif node == "commit":
                    if read_only:
                        status = "pending"
                    elif latest_commit:
                        status = "success"
                    elif fixes_count > 0:
                        status = "failed"
                    else:
                        status = "pending"
                elif node == "create_pr":
                    if read_only:
                        status = "pending"
                    elif pr_url:
                        status = "success"
                    elif push_attempted:
                        status = "failed"
                    else:
                        status = "pending"

                detail_parts = [f"{node} finished", f"iteration {iteration}"]
                if payload.get("failures_count") is not None:
                    detail_parts.append(f"failures={payload.get('failures_count')}")
                if payload.get("fixes_count") is not None:
                    detail_parts.append(f"fixes={payload.get('fixes_count')}")
                if node in ("commit", "create_pr") and read_only:
                    detail_parts.append("read-only mode: skipped")
                if node == "create_pr" and pr_url:
                    detail_parts.append("pr_created=true")
                detail = " | ".join(detail_parts)

                _set_step(step_name=step_name, run_id=run_id, status=status, detail=detail)
                log_level = "success" if status == "success" else "error" if status == "failed" else "info"
                _append_log(run_id, log_level, f"[{node}] {detail}")

                output_tail = (payload.get("raw_test_output_tail") or "").strip()
                if node in ("test", "ci") and output_tail:
                    tail_lines = output_tail.splitlines()
                    excerpt = [f"[{node}] output: {line[:280]}" for line in tail_lines[-4:]]
                    _append_log_chunk(run_id, "info", excerpt, limit=4)

                latest_failure = payload.get("latest_failure") or {}
                if node == "classify" and latest_failure:
                    _append_log_chunk(
                        run_id,
                        "warn",
                        [
                            f"[classify] file={latest_failure.get('file', 'unknown')} line={latest_failure.get('line', '?')}",
                            f"[classify] type={latest_failure.get('bug_type', 'UNKNOWN')}",
                            f"[classify] issue={str(latest_failure.get('description', 'n/a'))[:280]}",
                        ],
                    )

                if node in ("fix", "patch") and latest_fix:
                    _append_log_chunk(
                        run_id,
                        "info",
                        [
                            f"[{node}] target={latest_fix.get('file', 'unknown')}:{latest_fix.get('line', '?')}",
                            f"[{node}] fix_type={latest_fix.get('bug_type', 'UNKNOWN')} status={latest_fix.get('status', 'UNKNOWN')}",
                            f"[{node}] message={str(latest_fix.get('commit_message', 'n/a'))[:280]}",
                        ],
                    )

                latest_commit = payload.get("latest_commit")
                if node == "commit" and latest_commit:
                    _append_log(run_id, "success", f"[commit] created {str(latest_commit)[:280]}")

                pr_url = payload.get("pr_url")
                if node == "create_pr" and pr_url:
                    _append_log(run_id, "success", f"[create_pr] {str(pr_url)[:280]}")

        github_token = _resolve_github_token(request.github_token)
        state = run_agent(
            repo_url=request.repo_url,
            team_name=request.team_name,
            team_leader=request.team_leader,
            github_token=github_token or None,
            max_iterations=request.max_iterations,
            read_only=_is_read_only_mode(request.mode),
            observer=on_node_event,
        )

        failures = state.total_failures
        fixes_applied = state.total_fixes_applied
        passed = state.final_status == "PASSED"

        _set_step(run_id, "Run Tests", "success" if passed else "failed", "Initial test execution complete")

        if failures == 0:
            _set_step(run_id, "Detect Errors", "pending", "No failures detected")
            _set_step(run_id, "Generate Fix", "pending", "No fixes needed")
            _set_step(run_id, "Apply Fix", "pending", "No fixes applied")
            if passed:
                _set_step(run_id, "Re-run Tests", "success", "No fix cycle required")

        if state.branch_name:
            _set_step(run_id, "Create Branch", "success", f"Branch prepared: {state.branch_name}")
        _set_step(run_id, "Done", "success" if passed else "failed", "Run finished")

        with RUNS_LOCK:
            run = RUNS.get(run_id)
            if not run:
                return
            mapped_fixes = []
            for fix in state.fixes:
                before_text, after_text = _split_diff_before_after(fix.diff)
                mapped_fixes.append(
                    {
                        "file": fix.file,
                        "error": f"{fix.bug_type} issue at line {fix.line}",
                        "explanation": fix.commit_message,
                        "before": before_text,
                        "after": after_text,
                    }
                )

            run["branch_name"] = state.branch_name
            run["pr_url"] = state.pr_url or ""
            run["total_failures_detected"] = failures
            run["total_fixes_applied"] = fixes_applied
            run["final_status"] = state.final_status
            run["finished_at"] = _now_iso()
            run["total_time_taken"] = _format_duration(state.total_time_seconds)
            run["results_json"] = _build_results_payload(state)
            run["fixes"] = mapped_fixes

        _append_log(run_id, "success" if passed else "error", f"[final] Run completed with status: {state.final_status}")
    except Exception as exc:
        with RUNS_LOCK:
            run = RUNS.get(run_id)
            if not run:
                return
            run["final_status"] = "FAILED"
            run["finished_at"] = _now_iso()
            run["total_time_taken"] = None
            for step in run["ci_timeline"]:
                if step["status"] == "running":
                    step["status"] = "failed"
            for step in run["ci_timeline"]:
                if step["name"] == "Done":
                    step["status"] = "failed"
                    step["detail"] = "Run crashed"
                    break
        _append_log(run_id, "error", f"[error] {str(exc)}")


@app.post("/api/run", response_model=RunStartResponse)
async def start_run_endpoint(request: RunAgentRequest):
    github_token = _resolve_github_token(request.github_token)
    _validate_repo_url_or_raise(request.repo_url)
    _validate_mode_auth_or_raise(request.mode, request.authorize_write, request.repo_url, github_token)

    run = _seed_run(request)
    run_id = run["run_id"]

    with RUNS_LOCK:
        RUNS[run_id] = run

    worker = Thread(target=_run_agent_worker, args=(run_id, request), daemon=True)
    worker.start()

    return RunStartResponse(run_id=run_id, final_status="RUNNING")


@app.get("/api/run/{run_id}", response_model=RunStatusResponse)
async def get_run_endpoint(run_id: str):
    with RUNS_LOCK:
        run = RUNS.get(run_id)

    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return RunStatusResponse(**run)


@app.post("/api/run-sync")
async def run_agent_sync_endpoint(request: RunAgentRequest):
    """
    Main endpoint — triggers the CI/CD healing agent.
    Called by the React dashboard's 'Run Agent' button.
    """
    try:
        github_token = _resolve_github_token(request.github_token)
        _validate_repo_url_or_raise(request.repo_url)
        _validate_mode_auth_or_raise(request.mode, request.authorize_write, request.repo_url, github_token)

        state = run_agent(
            repo_url=request.repo_url,
            team_name=request.team_name,
            team_leader=request.team_leader,
            github_token=github_token or None,
            max_iterations=request.max_iterations,
            read_only=_is_read_only_mode(request.mode),
        )

        return {
            "final_status": state.final_status,
            "branch_name": state.branch_name,
            "total_failures": state.total_failures,
            "total_fixes_applied": state.total_fixes_applied,
            "total_time_seconds": state.total_time_seconds,
            "score": state.score.model_dump(),
            "fixes": [f.model_dump() for f in state.fixes],
            "ci_timeline": [r.model_dump() for r in state.ci_runs],
            "agent_output": [f.to_agent_output() for f in state.failures],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
