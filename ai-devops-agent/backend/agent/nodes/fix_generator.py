import os
import re
import difflib
from agent.state import AgentState, Fix
from agent.nodes.fix_strategies import apply_fix_for_bug_type


def fix_generator(state: AgentState) -> AgentState:
    new_fixes: list[Fix] = []

    # ALWAYS check for pytest logic bugs first — independent of state.failures
    pytest_fixes = _detect_pytest_logic_bugs(state)
    new_fixes.extend(pytest_fixes)

    # Then process flake8/linting failures
    # Sort by file and descending line number so edits do not shift upcoming target lines.
    ordered_failures = sorted(
        state.failures,
        key=lambda failure: (failure.file.replace("\\", "/"), -failure.line),
    )

    for failure in ordered_failures:
        clean_file = failure.file.replace("\\", "/").lstrip("./").lstrip("/")
        file_path = os.path.join(state.repo_path, clean_file)

        if not os.path.exists(file_path):
            new_fixes.append(_failed_fix(failure, clean_file, f"File not found: {file_path}"))
            continue

        try:
            with open(file_path, "r") as f:
                original_lines = f.readlines()
        except Exception as e:
            new_fixes.append(_failed_fix(failure, clean_file, f"Read error: {e}"))
            continue

        original_content = "".join(original_lines)

        try:
            fixed_lines = apply_fix_for_bug_type(
                lines=list(original_lines),
                line_idx=failure.line - 1,
                bug_type=failure.bug_type,
                description=failure.description,
            )
        except Exception as e:
            new_fixes.append(_failed_fix(failure, clean_file, f"Strategy error: {e}"))
            continue

        fixed_content = "".join(fixed_lines)

        if fixed_content == original_content:
            print(f"[DEBUG] fix_generator: {clean_file} line {failure.line} ({failure.bug_type}) — NO CHANGE PRODUCED")
            new_fixes.append(_failed_fix(failure, clean_file, "Fix strategy produced no changes"))
            continue

        try:
            with open(file_path, "w") as f:
                f.write(fixed_content)
            print(f"[DEBUG] fix_generator: WROTE {clean_file} ({failure.bug_type} line {failure.line})")
        except Exception as e:
            new_fixes.append(_failed_fix(failure, clean_file, f"Write error: {e}"))
            continue

        diff = "".join(difflib.unified_diff(
            original_lines, fixed_lines,
            fromfile=f"a/{clean_file}",
            tofile=f"b/{clean_file}",
            lineterm="",
        ))

        new_fixes.append(Fix(
            file=clean_file,
            line=failure.line,
            bug_type=failure.bug_type,
            commit_message=f"[AI-AGENT] Fix {failure.bug_type} in {clean_file} line {failure.line}",
            status="FIXED",
            diff=diff,
        ))

    state.fixes = new_fixes
    return state


# ---------------------------------------------------------------------------
# Pytest logic bug detection
# ---------------------------------------------------------------------------

def _detect_pytest_logic_bugs(state: AgentState) -> list[Fix]:
    """
    Scans raw_test_output for pytest assert failures,
    finds the source function, and fixes the wrong operator.
    Runs every iteration regardless of state.failures.
    """
    fixes = []
    raw = state.raw_test_output or ""

    if "assert" not in raw or "FAILED" not in raw:
        return fixes

    lines = raw.splitlines()

    for i, line in enumerate(lines):
        # Match test assert lines like: "    assert divide(10, 2) == 5"
        assert_match = re.match(r'^\s+assert\s+(\w+)\(([^)]*)\)\s*==\s*(.+)', line)
        if not assert_match:
            continue

        func_name = assert_match.group(1)
        func_args  = assert_match.group(2)
        expected   = assert_match.group(3).strip()

        # Get actual result from the E assert line below
        actual = None
        for j in range(i + 1, min(i + 5, len(lines))):
            e_match = re.match(r'^E\s+assert\s+(\S+)\s+==', lines[j])
            if e_match:
                actual = e_match.group(1)
                break

        if actual is None or actual == expected:
            continue

        print(f"[DEBUG] pytest_logic: {func_name}({func_args}) returned {actual}, expected {expected}")

        # Find source file containing this function
        src_file, src_line = _find_function_in_repo(state.repo_path, func_name)
        if not src_file:
            print(f"[DEBUG] pytest_logic: cannot find {func_name}() in repo — skipping")
            continue

        print(f"[DEBUG] pytest_logic: found {func_name}() in {src_file}:{src_line}")

        file_path = os.path.join(state.repo_path, src_file)
        try:
            with open(file_path, "r") as f:
                src_lines = f.readlines()
        except Exception as e:
            print(f"[DEBUG] pytest_logic: read error — {e}")
            continue

        original_content = "".join(src_lines)
        fixed_lines = fix_logic_in_source(src_lines, src_line - 1, expected, actual, func_name)

        if "".join(fixed_lines) == original_content:
            print(f"[DEBUG] pytest_logic: no change produced for {src_file}")
            continue

        try:
            with open(file_path, "w") as f:
                f.writelines(fixed_lines)
            print(f"[DEBUG] pytest_logic: WROTE {src_file} (LOGIC line {src_line})")
        except Exception as e:
            print(f"[DEBUG] pytest_logic: write error — {e}")
            continue

        fixes.append(Fix(
            file=src_file,
            line=src_line,
            bug_type="LOGIC",
            commit_message=f"[AI-AGENT] Fix LOGIC in {src_file} line {src_line}",
            status="FIXED",
            diff=f"Fixed {func_name}(): returned {actual}, expected {expected}",
        ))

    return fixes


def fix_logic_in_source(lines: list[str], idx: int, expected: str, actual: str, func: str) -> list[str]:
    """Fixes wrong arithmetic operator in source function body."""
    fixed = list(lines)
    start = max(0, idx - 1)
    end   = min(len(lines), idx + 10)

    operator_swaps = [
        (r'(?<![*=])\*(?![*=])', '/'),              # * → /  (e.g. multiply instead of divide)
        (r'(?<!/)\/(?![/=])',     '*'),              # / → *
        (r'(?<![<>!=+\-])\+(?![+=])', '-'),         # + → -
        (r'(?<![a-zA-Z0-9_])-(?![->=])', '+'),      # - → +
        (r'(?<![<>!])//',        '**'),             # // → **
    ]

    for i in range(start, end):
        line = fixed[i]

        # Only touch return statements or assignments
        if "return" not in line and not re.match(r'^\s+\w+\s*[+\-*/]=?\s*', line):
            continue

        for pattern, replacement in operator_swaps:
            new_line = re.sub(pattern, replacement, line, count=1)
            if new_line != line:
                fixed[i] = new_line
                print(f"[DEBUG] fix_logic_source: {func}() line {i+1}: '{line.strip()}' → '{new_line.strip()}'")
                return fixed

    return fixed


def _find_function_in_repo(repo_path: str, func_name: str) -> tuple[str, int]:
    """Scans src/ and root for a function definition, returns (rel_path, line_number)."""
    src_dir = os.path.join(repo_path, "src")
    search_dirs = [src_dir, repo_path]

    for search_dir in search_dirs:
        if not os.path.exists(search_dir):
            continue
        try:
            entries = sorted(os.listdir(search_dir))
        except Exception:
            continue
        for fname in entries:
            if not fname.endswith(".py") or fname.startswith("test_"):
                continue
            fpath = os.path.join(search_dir, fname)
            try:
                with open(fpath, "r") as f:
                    file_lines = f.readlines()
                for i, line in enumerate(file_lines):
                    if re.match(rf'^\s*def\s+{func_name}\s*\(', line):
                        rel = os.path.relpath(fpath, repo_path)
                        rel = rel.replace("\\", "/")
                        return rel, i + 1
            except Exception:
                continue

    return "", 0


def _failed_fix(failure, clean_file: str, reason: str) -> Fix:
    return Fix(
        file=clean_file,
        line=failure.line,
        bug_type=failure.bug_type,
        commit_message=f"[AI-AGENT] Fix {failure.bug_type} in {clean_file} line {failure.line}",
        status="FAILED",
        diff=reason,
    )
