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
from typing import Callable, Any


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

def _emit(observer: Callable[[dict[str, Any]], None] | None, payload: dict[str, Any]) -> None:
    if observer is None:
        return
    try:
        observer(payload)
    except Exception:
        pass


def _wrap_node(node_name: str, node_fn, observer: Callable[[dict[str, Any]], None] | None):
    def wrapped(state: AgentState) -> AgentState:
        _emit(
            observer,
            {
                "event": "node_start",
                "node": node_name,
                "iteration": state.iteration,
                "final_status": state.final_status,
            },
        )

        next_state = node_fn(state)

        _emit(
            observer,
            {
                "event": "node_end",
                "node": node_name,
                "iteration": next_state.iteration,
                "final_status": next_state.final_status,
                "test_passed": next_state.test_passed,
                "failures_count": next_state.total_failures,
                "fixes_count": next_state.total_fixes_applied,
                "commits_count": len(next_state.commits),
                "read_only": next_state.read_only,
                "push_attempted": next_state.push_attempted,
                "latest_failure": next_state.failures[-1].model_dump() if next_state.failures else None,
                "latest_fix": next_state.fixes[-1].model_dump() if next_state.fixes else None,
                "latest_commit": next_state.commits[-1] if next_state.commits else None,
                "pr_url": next_state.pr_url,
                "raw_test_output_tail": (next_state.raw_test_output or "")[-1200:],
            },
        )
        return next_state

    return wrapped


def build_graph(observer: Callable[[dict[str, Any]], None] | None = None) -> StateGraph:
    g = StateGraph(AgentState)

    # --- Register all nodes ---
    g.add_node("repo", _wrap_node("repo", repo_analyzer, observer))
    g.add_node("detect_lang", _wrap_node("detect_lang", language_detector, observer))
    g.add_node("test", _wrap_node("test", test_runner, observer))
    g.add_node("classify", _wrap_node("classify", failure_classifier, observer))
    g.add_node("fix", _wrap_node("fix", fix_generator, observer))
    g.add_node("patch", _wrap_node("patch", patch_applier, observer))
    g.add_node("commit", _wrap_node("commit", git_commit, observer))
    g.add_node("create_pr", _wrap_node("create_pr", create_pull_request, observer))
    g.add_node("ci", _wrap_node("ci", ci_monitor, observer))
    g.add_node("final", _wrap_node("final", finalize, observer))

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
    read_only: bool = False,
    observer: Callable[[dict[str, Any]], None] | None = None,
) -> AgentState:

    initial_state = AgentState(
        repo_url=repo_url,
        team_name=team_name,
        team_leader=team_leader,
        github_token=github_token,
        read_only=read_only,
        max_iterations=max_iterations,
    )

    graph = build_graph(observer=observer)
    result = graph.invoke(initial_state)

    if isinstance(result, dict):
        return AgentState(**result)
    return result
