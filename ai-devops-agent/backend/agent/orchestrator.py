from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes.repo_analyzer import repo_analyzer
from agent.nodes.language_detector import language_detector
from agent.nodes.test_runner import test_runner
from agent.nodes.failure_classifier import failure_classifier
from agent.nodes.fix_generator import fix_generator
from agent.nodes.patch_applier import patch_applier
from agent.nodes.git_commit import git_commit
from agent.nodes.create_pull_request import create_pull_request
from agent.nodes.ci_monitor import ci_monitor
from agent.nodes.finalize import finalize


# ---------------------------------------------------------------------------
# Conditional edge routers
# ---------------------------------------------------------------------------

def route_after_repo(state: AgentState) -> str:
    if state.final_status == "FAILED" or not state.repo_path:
        return "final"
    return "detect_lang"


def route_after_ci(state: AgentState) -> str:
    if state.final_status == "PASSED":
        return "final"
    if state.final_status == "FAILED":
        return "final"
    return "test"


def route_after_initial_test(state: AgentState) -> str:
    if state.test_passed:
        return "ci"
    return "classify"


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    # --- Register all nodes ---
    g.add_node("repo",      repo_analyzer)
    g.add_node("detect_lang", language_detector)
    g.add_node("test",      test_runner)
    g.add_node("classify",  failure_classifier)
    g.add_node("fix",       fix_generator)
    g.add_node("patch",     patch_applier)
    g.add_node("commit",    git_commit)
    g.add_node("create_pr", create_pull_request)   # ← NEW
    g.add_node("ci",        ci_monitor)
    g.add_node("final",     finalize)

    # --- Entry point ---
    g.set_entry_point("repo")

    # repo → abort if failed, else detect language
    g.add_conditional_edges(
        "repo",
        route_after_repo,
        {"final": "final", "detect_lang": "detect_lang"},
    )

    # language detection → initial test run
    g.add_edge("detect_lang", "test")

    # After initial test: pass → ci, fail → classify
    g.add_conditional_edges(
        "test",
        route_after_initial_test,
        {"ci": "ci", "classify": "classify"},
    )

    # Fix pipeline: classify → fix → patch → commit → create_pr → ci
    g.add_edge("classify",  "fix")
    g.add_edge("fix",       "patch")
    g.add_edge("patch",     "commit")
    g.add_edge("commit",    "create_pr")   # ← commit goes to PR first
    g.add_edge("create_pr", "ci")          # ← then ci_monitor

    # After ci_monitor: loop back to test or finalize
    g.add_conditional_edges(
        "ci",
        route_after_ci,
        {"final": "final", "test": "test"},
    )

    # Final node → END
    g.add_edge("final", END)

    return g.compile()


# ---------------------------------------------------------------------------
# Public runner
# ---------------------------------------------------------------------------

def run_agent(
    repo_url: str,
    team_name: str,
    team_leader: str,
    github_token: str = None,
    max_iterations: int = 5,
) -> AgentState:

    initial_state = AgentState(
        repo_url=repo_url,
        team_name=team_name,
        team_leader=team_leader,
        github_token=github_token,
        max_iterations=max_iterations,
    )

    graph = build_graph()
    result = graph.invoke(initial_state)

    if isinstance(result, dict):
        return AgentState(**result)
    return result
