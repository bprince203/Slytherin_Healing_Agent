import json
import os
from dotenv import load_dotenv
from agent.orchestrator import run_agent
from agent.config import DEFAULT_MAX_ITERATIONS, validate_config

# Load environment variables from .env file
load_dotenv()

# Validate required config before starting
# Will raise ValueError if GITHUB_TOKEN etc. are missing
try:
    validate_config()
except ValueError as e:
    print(e)
    exit(1)


# ---------------------------------------------------------------------------
# Test configuration — edit these for each local test run
# ---------------------------------------------------------------------------
TEST_REPO_URL    = "https://github.com/bprince203/ai-agent-test-repo-pk"
TEST_TEAM_NAME   = "Test Team"
TEST_TEAM_LEADER = "Rahul Kapoor"
GITHUB_TOKEN     = os.getenv("GITHUB_TOKEN")


# ---------------------------------------------------------------------------
# Run the agent
# ---------------------------------------------------------------------------
print("\n" + "="*60)
print("  CI/CD HEALING AGENT — LOCAL TEST RUN")
print("="*60)
print(f"  Repo       : {TEST_REPO_URL}")
print(f"  Team       : {TEST_TEAM_NAME}")
print(f"  Leader     : {TEST_TEAM_LEADER}")
print(f"  Max Iters  : {DEFAULT_MAX_ITERATIONS}")
print("="*60 + "\n")

final_state = run_agent(
    repo_url=TEST_REPO_URL,
    team_name=TEST_TEAM_NAME,
    team_leader=TEST_TEAM_LEADER,
    github_token=GITHUB_TOKEN,
    max_iterations=DEFAULT_MAX_ITERATIONS,
)


# ---------------------------------------------------------------------------
# Print results summary
# ---------------------------------------------------------------------------
print("\n" + "="*60)
print("  AGENT RUN COMPLETE")
print("="*60)
print(f"  Final Status  : {final_state.final_status}")
print(f"  Branch Created: {final_state.branch_name}")
print(f"  Iterations    : {final_state.iteration}/{final_state.max_iterations}")
print(f"  Failures Found: {final_state.total_failures}")
print(f"  Fixes Applied : {final_state.total_fixes_applied}")
print(f"  Fixes Failed  : {final_state.total_fixes_failed}")
print(f"  Total Commits : {len(final_state.commits)}")
print(f"  Time Taken    : {final_state.total_time_seconds:.1f}s")
print(f"  Final Score   : {final_state.score.final_score}")
print("="*60)

# CI Timeline
if final_state.ci_runs:
    print("\n  CI/CD Timeline:")
    for run in final_state.ci_runs:
        badge = "✓ PASSED" if run.status == "PASSED" else "✗ FAILED"
        print(f"    [{run.iteration}/{final_state.max_iterations}] "
              f"{badge} — {run.timestamp}")

# Fixes table
if final_state.fixes:
    print("\n  Fixes Applied:")
    print(f"  {'File':<30} {'Type':<12} {'Line':<6} {'Status'}")
    print(f"  {'-'*30} {'-'*12} {'-'*6} {'-'*8}")
    for fix in final_state.fixes:
        status_icon = "✓" if fix.status == "FIXED" else "✗"
        print(f"  {fix.file:<30} {fix.bug_type:<12} {fix.line:<6} "
              f"{status_icon} {fix.status}")

# Agent output (PS exact-format lines for test case matching)
if final_state.failures:
    print("\n  Agent Output (judge test case format):")
    for failure in final_state.failures:
        print(f"    {failure.to_agent_output()}")

# Results JSON location
results_path = os.path.join(final_state.repo_path or ".", "results.json")
if os.path.exists(results_path):
    print(f"\n  results.json written to: {results_path}")
    with open(results_path) as f:
        data = json.load(f)
    print(f"  Score breakdown: {json.dumps(data['score_breakdown'], indent=4)}")

print()
