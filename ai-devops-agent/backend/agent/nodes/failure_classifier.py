import re
from agent.state import AgentState, Failure
from typing import Literal

BugType = Literal["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]


def _classify_bug_type(code: str, msg: str = "") -> str:
    code = code.upper().strip()
    if code in ("F401", "F811", "F821", "E401"):
        return "IMPORT"
    elif code == "E999":
        return "SYNTAX"
    elif code.startswith("E1"):
        return "INDENTATION"
    elif code.startswith("E") or code.startswith("W") or code.startswith("F"):
        return "LINTING"
    elif "syntax" in msg.lower():
        return "SYNTAX"
    elif "indent" in msg.lower():
        return "INDENTATION"
    elif "import" in msg.lower():
        return "IMPORT"
    else:
        return "LINTING"


def _human_readable(code: str, msg: str, bug_type: str) -> str:
    """
    Returns a short human-readable fix string for agent output display.
    Used only in to_agent_output() — NOT stored as description (which must have error code).
    """
    readable_map = {
        "E302": "add 2 blank lines before function definition",
        "E303": "remove extra blank lines",
        "W391": "remove blank line at end of file",
        "W292": "add newline at end of file",
        "W291": "remove trailing whitespace",
        "W293": "remove trailing whitespace",
        "E712": "use 'is True' instead of '== True'",
        "E711": "use 'is None' instead of '== None'",
        "F401": "remove the unused import statement",
        "E501": "shorten the line to under 120 characters",
        "E999": "fix the syntax error at this line",
        "F841": "remove or use the assigned variable",
        "E401": "split into separate import statements",
        "E111": "fix indentation to use 4 spaces",
        "E117": "fix over-indented code",
    }
    # Extract code from msg if code is "LOGIC"
    code_match = re.match(r'^([A-Z]\d+)', msg.strip())
    lookup_code = code_match.group(1) if code_match else code
    if lookup_code in readable_map:
        return readable_map[lookup_code]

    msg_lower = msg.lower()
    if bug_type == "IMPORT":
        return "remove the import statement"
    if bug_type == "SYNTAX":
        return "fix the syntax error at this line"
    if bug_type == "INDENTATION":
        return "correct the indentation"
    if bug_type == "LOGIC":
        return "fix the logic error"
    if "blank line" in msg_lower:
        return "fix the blank line spacing"
    if "unused" in msg_lower:
        return "remove the unused import statement"
    return "fix the linting issue"


def _parse_flake8_output(output: str) -> list:
    """Returns list of (file, lineno, code, full_description)."""
    results = []
    pattern = re.compile(r"([\w./\\-]+\.py):(\d+):\d+:\s*([A-Z]\d+)\s+(.+)")
    for line in output.splitlines():
        match = pattern.search(line)
        if match:
            file, lineno, code, msg = match.groups()
            file = file.replace("\\", "/").lstrip("./").lstrip("/").strip()
            full_description = f"{code} {msg.strip()}"   # e.g. "E302 expected 2 blank lines, found 1"
            results.append((file, int(lineno), code, full_description))
    return results


def _parse_pytest_output(output: str) -> list:
    """
    Parses pytest --tb=short output for source-file logic bugs.
    Returns list of (file, lineno, code, description).
    """
    results = []
    lines = output.splitlines()
    print(f"[DEBUG] pytest_parser: scanning {len(lines)} lines")

    # Find start of FAILURES section
    failure_section_start = -1
    for i, line in enumerate(lines):
        if "=== FAILURES ===" in line or line.strip().startswith("FAILED "):
            failure_section_start = i
            break

    if failure_section_start == -1:
        print(f"[DEBUG] pytest_parser: no FAILURES section found, returning 0 issues")
        return results

    tb_pattern = re.compile(r'^\s*([\w./\\-]+\.py):(\d+):\s+in\s+(\w+)')

    for i in range(failure_section_start, len(lines)):
        line = lines[i]
        m = tb_pattern.match(line)
        if not m:
            continue

        file, lineno, func = m.groups()
        file = file.replace("\\", "/").lstrip("./").lstrip("/").strip()

        # Only source files — skip test files
        if "test_" in file or file.startswith("tests/"):
            continue

        error_msg = f"LOGIC assert error in {func}"
        for j in range(i + 1, min(i + 8, len(lines))):
            em = re.match(r'^E\s+(.+)', lines[j])
            if em:
                error_msg = f"LOGIC {em.group(1).strip()}"
                break

        print(f"[DEBUG] pytest_parser: found source bug → {file}:{lineno} in {func}()")
        results.append((file, int(lineno), "LOGIC", error_msg))

    print(f"[DEBUG] pytest_parser: returning {len(results)} issues")
    return results


def _parse_mypy_output(output: str) -> list:
    """Parses mypy output. Returns list of (file, lineno, code, description)."""
    results = []
    pattern = re.compile(r"([\w/\\.\-]+\.py):(\d+):\s*error:\s*(.+)")
    for line in output.splitlines():
        match = pattern.search(line)
        if match:
            file, lineno, msg = match.groups()
            file = file.replace("\\", "/").lstrip("./").lstrip("/").strip()
            results.append((file, int(lineno), "TYPE_ERROR", f"TYPE_ERROR {msg.strip()}"))
    return results


# ---------------------------------------------------------------------------
# Main node
# ---------------------------------------------------------------------------

def failure_classifier(state: AgentState) -> AgentState:
    raw_output = state.raw_test_output
    print(f"[DEBUG] failures before classify: {len(state.failures)}")

    if state.test_passed or not raw_output:
        print(f"[DEBUG] SKIP classify: test_passed={state.test_passed}")
        return state

    # Parse all tool outputs — call each parser ONCE
    flake8_raw  = _parse_flake8_output(raw_output)
    pytest_raw  = _parse_pytest_output(raw_output)
    mypy_raw    = _parse_mypy_output(raw_output)

    print(f"[DEBUG] flake8 parsed: {len(flake8_raw)} issues")
    print(f"[DEBUG] pytest parsed: {len(pytest_raw)} issues")
    print(f"[DEBUG] mypy   parsed: {len(mypy_raw)} issues")

    # Merge all — flake8 first, then pytest, then mypy
    all_raw = flake8_raw + pytest_raw + mypy_raw

    # Deduplicate by (file, line) — keep first occurrence
    seen: set[tuple[str, int]] = set()
    new_failures: list[Failure] = []

    for file, line_no, code, msg in all_raw:
        key = (file, line_no)
        if key in seen:
            continue
        seen.add(key)

        bug_type = _classify_bug_type(code, msg)

        new_failures.append(Failure(
            file=file,
            line=line_no,
            bug_type=bug_type,
            description=msg,          # Raw message WITH error code — used by fix_strategies
        ))

    state.failures = new_failures
    return state
