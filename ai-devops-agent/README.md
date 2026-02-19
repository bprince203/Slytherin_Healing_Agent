# AI DevOps Agent

## Core Idea
We are building an AI DevOps Agent that automatically detects and fixes errors in a GitHub project, then reruns tests until the project works.

In short: an AI Copilot for CI/CD pipelines.

## Problem We Are Solving
Developers spend significant time manually fixing:
- CI/CD pipeline failures
- Syntax errors
- Test failures
- Linting issues
- Small bugs that block delivery

Our system automates this debugging and repair loop.

## What the Project Does
1. User submits a GitHub repository URL.
2. System clones the repository.
3. Tests run inside Docker for safe, isolated execution.
4. If tests fail, AI analyzes logs and errors.
5. AI generates and applies code fixes.
6. Tests run again.
7. On success, system creates a new branch with fixes.
8. Dashboard displays errors, fixes, and final status.

The AI acts like an automated DevOps engineer.

## Architecture

### Frontend (Next.js Dashboard)
- Accepts repository URL input
- Displays job timeline and fix results
- Shows pass/fail progress and final status

### Backend (Express.js)
- Clones repository
- Runs tests in Docker
- Calls AI engine
- Coordinates retries until pass/fail completion
- Pushes fixes to GitHub branch

### AI Engine (LangChain + LangGraph, Python)
Multi-agent workflow with controlled execution and retry loops:
- Repo Analyzer
- Test Runner
- Bug Detector
- Fix Generator
- Verifier

### Docker Sandbox
- Runs untrusted code safely
- Provides reproducible test environment

## Simple Example
Broken code:

```python
print("Hello"
```

Agent flow:
- Detects syntax error
- Fixes to `print("Hello")`
- Reruns tests
- Commits fix in a new branch

## Final Output
- Fixed GitHub branch
- CI/CD passing state
- Dashboard showing issues, applied fixes, and verification timeline

## One-Line Pitch
We are building an AI-powered DevOps Copilot that automatically fixes broken GitHub projects and makes CI/CD pipelines pass without manual debugging.

## Current Repo Stack
- Frontend: Next.js
- Backend: Express.js (Node.js)
- AI Engine: Python with LangChain + LangGraph
