# AI DevOps Agent — Project Pitch

## One-liner
AI-powered DevOps Copilot that automatically fixes broken GitHub projects and makes CI/CD pipelines pass without manual debugging.

## Problem
Engineering teams lose time on repetitive CI failures: syntax issues, linting errors, failing tests, and small bugs.

## Solution
Submit a GitHub repo URL and the agent:
1. Clones the repo
2. Runs tests in Docker
3. Analyzes failures with AI
4. Applies fixes
5. Retries until tests pass or retry budget ends
6. Pushes a fix branch and shows results in dashboard

## Why It Matters
- Faster recovery from pipeline failures
- Lower debugging effort
- Improved deployment reliability
- Consistent, auditable fix workflow

## System Design
- Frontend: Next.js dashboard
- Backend: Express orchestration layer
- AI Engine: Python LangChain + LangGraph multi-agent workflow
- Execution: Docker sandbox for safe test runs

## AI Agents
- Repo Analyzer
- Test Runner
- Bug Detector
- Fix Generator
- Verifier
