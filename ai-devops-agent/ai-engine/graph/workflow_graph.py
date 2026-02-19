from typing import TypedDict, Any

from langgraph.graph import StateGraph, END

from agents.repo_analyzer import run as repo_analyzer
from agents.test_runner import run as test_runner
from agents.bug_detector import run as bug_detector
from agents.fix_generator import run as fix_generator
from agents.verifier import run as verifier


class WorkflowState(TypedDict, total=False):
    repo_path: str
    analysis: dict[str, Any]
    tests: dict[str, Any]
    issues: list[dict[str, Any]]
    fixes: list[dict[str, Any]]
    verified: bool


def build_graph():
    graph = StateGraph(WorkflowState)
    graph.add_node("repo_analyzer", repo_analyzer)
    graph.add_node("test_runner", test_runner)
    graph.add_node("bug_detector", bug_detector)
    graph.add_node("fix_generator", fix_generator)
    graph.add_node("verifier", verifier)

    graph.set_entry_point("repo_analyzer")
    graph.add_edge("repo_analyzer", "test_runner")
    graph.add_edge("test_runner", "bug_detector")
    graph.add_edge("bug_detector", "fix_generator")
    graph.add_edge("fix_generator", "verifier")
    graph.add_edge("verifier", END)

    return graph.compile()
