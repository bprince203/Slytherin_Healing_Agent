from agents.analyzer_agent import analyze
from agents.debug_agent import detect_bugs
from agents.fix_agent import generate_fixes
from agents.verify_agent import verify


def run_pipeline(repo_path: str):
    analysis = analyze(repo_path)
    bugs = detect_bugs(analysis)
    fixes = generate_fixes(bugs)
    return verify(fixes)


if __name__ == '__main__':
    result = run_pipeline('./workspace')
    print(result)
