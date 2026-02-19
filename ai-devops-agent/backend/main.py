from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    repo_url: str
    team_name: str
    team_leader: str
    max_iterations: int = DEFAULT_MAX_ITERATIONS


class RunAgentResponse(BaseModel):
    final_status: str
    branch_name: str
    total_failures: int
    total_fixes_applied: int
    total_time_seconds: float | None
    score: dict
    fixes: list
    ci_timeline: list
    agent_output: list


@app.post("/api/run", response_model=RunAgentResponse)
async def run_agent_endpoint(request: RunAgentRequest):
    """
    Main endpoint — triggers the CI/CD healing agent.
    Called by the React dashboard's 'Run Agent' button.
    """
    try:
        state = run_agent(
            repo_url=request.repo_url,
            team_name=request.team_name,
            team_leader=request.team_leader,
            github_token=os.getenv("GITHUB_TOKEN"),
            max_iterations=request.max_iterations,
        )

        return RunAgentResponse(
            final_status=state.final_status,
            branch_name=state.branch_name,
            total_failures=state.total_failures,
            total_fixes_applied=state.total_fixes_applied,
            total_time_seconds=state.total_time_seconds,
            score=state.score.model_dump(),
            fixes=[f.model_dump() for f in state.fixes],
            ci_timeline=[r.model_dump() for r in state.ci_runs],
            agent_output=[f.to_agent_output() for f in state.failures],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
