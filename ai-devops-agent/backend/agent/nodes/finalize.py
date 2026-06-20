import json
import os
from datetime import datetime
from agent.state import AgentState


# Output file location — written next to repo or in a configured results dir
RESULTS_FILENAME = "results.json"


def finalize(state: AgentState) -> AgentState:
    """
    Finalize Node:
    - Records end time and computes total duration
    - Computes final score (speed bonus, efficiency penalty)
    - Writes structured results.json for the React dashboard
    - Does NOT override final_status (already set by ci_monitor)
    """

    # 1. Record end time and compute duration
    state.record_end()

    # 2. Compute score now that timing and commit count are known
    state.finalize_score()

    # 3. Safety net: if final_status is still RUNNING, resolve it
    if state.final_status == "RUNNING":
        state.final_status = "PASSED" if state.test_passed else "FAILED"

    # 4. Build structured output for React dashboard
    results = _build_results(state)

    # 5. Determine output path
    output_path = _resolve_output_path(state)

    # 6. Write results.json safely
    try:
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)
    except OSError as e:
        # Log but don't crash — agent completed, just couldn't write file
        print(f"[AI-AGENT] WARNING: Could not write results.json: {e}")

    return state


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_results(state: AgentState) -> dict:
    """
    Builds the structured results dict matching the React dashboard schema.
    All fields map directly to a dashboard section.
    """
    return {
        # --- Run Summary Card ---
        "run_summary": {
            "repo_url": state.repo_url,
            "team_name": state.team_name,
            "team_leader": state.team_leader,
            "branch_name": state.branch_name,
            "total_failures_detected": len(state.failures),
            "total_fixes_applied": len([f for f in state.fixes if f.status == "FIXED"]),
            "final_ci_status": state.final_status,   # "PASSED" / "FAILED"
            "start_time": state.start_time,
            "end_time": state.end_time,
            "total_time_seconds": state.total_time_seconds,
        },

        # --- Score Breakdown Panel ---
        "score_breakdown": {
            "base_score": state.score.base_score,
            "speed_bonus": state.score.speed_bonus,
            "efficiency_penalty": state.score.efficiency_penalty,
            "final_score": state.score.final_score,
            "total_commits": len(state.commits),
        },

        # --- Fixes Applied Table ---
        # Each entry maps to: File | Bug Type | Line | Commit Message | Status
        "fixes": [
            {
                "file": fix.file,
                "bug_type": fix.bug_type,
                "line_number": fix.line,
                "commit_message": fix.commit_message,
                "status": fix.status,       # "FIXED" or "FAILED"
                "diff": fix.diff,
            }
            for fix in state.fixes
        ],

        # --- CI/CD Status Timeline ---
        "ci_timeline": [
            {
                "iteration": run.iteration,
                "status": run.status,
                "timestamp": run.timestamp,
                "iteration_label": f"{run.iteration}/{state.max_iterations}",
            }
            for run in state.ci_runs
        ],

        # --- Exact PS-format agent output for test case matching ---
        # Judges evaluate exact line-by-line match against this
        "agent_output": [
            failure.to_agent_output()
            for failure in state.failures
        ],
    }


def _resolve_output_path(state: AgentState) -> str:
    """
    Resolves where to write results.json.
    Prefers repo_path directory, falls back to cwd.
    """
    if state.repo_path and os.path.isdir(state.repo_path):
        return os.path.join(state.repo_path, RESULTS_FILENAME)
    return RESULTS_FILENAME
