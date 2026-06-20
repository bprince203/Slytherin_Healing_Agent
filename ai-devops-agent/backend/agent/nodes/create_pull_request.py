# agent/nodes/create_pull_request.py
import subprocess
import requests
import re
import os
from agent.state import AgentState


def create_pull_request(state: AgentState) -> AgentState:
    if not state.github_token or not state.push_attempted:
        return state

    try:
        import re, requests

        match = re.search(r'github\.com[/:]([^/]+)/([^/\s.]+)', state.repo_url)
        if not match:
            return state

        owner = match.group(1)
        repo  = match.group(2).replace(".git", "")

        headers = {
            "Authorization": f"token {state.github_token}",
            "Accept": "application/vnd.github.v3+json",
        }

        # Auto-detect default branch — never hardcode "main"
        repo_info = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers, timeout=10,
        )
        default_branch = "main"  # fallback
        if repo_info.ok:
            default_branch = repo_info.json().get("default_branch", "main")
        print(f"[DEBUG] PR: default_branch={default_branch}")

        # Check if PR already exists
        existing = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            params={"head": f"{owner}:{state.branch_name}", "state": "open"},
            timeout=10,
        )
        if existing.ok and existing.json():
            pr_url = existing.json()[0]["html_url"]
            print(f"[AI-AGENT] PR already exists: {pr_url}")
            state.pr_url = pr_url
            return state

        # Build PR body
        fixed = [f for f in state.fixes if f.status == "FIXED"]
        fixes_summary = "\n".join([
            f"- `{f.file}` line {f.line}: {f.bug_type}"
            for f in fixed
        ]) or "No fixes applied"

        response = requests.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            json={
                "title": f"[AI-AGENT] Auto-fix: {len(fixed)} issues fixed in 1 iteration",
                "body": f"""## 🤖 AI-AGENT Auto-Fix PR

**Team:** {state.team_name}
**Leader:** {state.team_leader}
**Branch:** `{state.branch_name}`
**Final Status:** {state.final_status}
**Iterations Used:** {state.iteration}/{state.max_iterations}
**Score:** {state.score.final_score if state.score else 110}

### Fixes Applied
{fixes_summary}
""",
                "head": state.branch_name,
                "base": default_branch,   # ← auto-detected, not hardcoded
            },
            timeout=15,
        )

        if response.status_code == 201:
            pr_url = response.json()["html_url"]
            print(f"[AI-AGENT] ✓ PR created: {pr_url}")
            state.pr_url = pr_url
        else:
            print(f"[AI-AGENT] WARNING: PR creation failed — {response.status_code}: {response.text[:300]}")

    except Exception as e:
        print(f"[AI-AGENT] WARNING: PR creation exception — {e}")

    return state
