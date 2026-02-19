import re
import os
from typing import Literal

BugType = Literal["LINTING", "SYNTAX", "LOGIC", "TYPE_ERROR", "IMPORT", "INDENTATION"]


def apply_fix_for_bug_type(
    lines: list[str],
    line_idx: int,
    bug_type: BugType,
    description: str,
) -> list[str]:
    fixed = list(lines)  # Always work on a copy

    if bug_type == "IMPORT":
        fixed = fix_import(fixed, line_idx, description)
    elif bug_type == "SYNTAX":
        fixed = fix_syntax(fixed, line_idx, description)
    elif bug_type == "INDENTATION":
        fixed = fix_indentation(fixed, line_idx, description)
    elif bug_type == "LINTING":
        fixed = fix_linting(fixed, line_idx, description)
    elif bug_type == "TYPE_ERROR":
        fixed = fix_type_error(fixed, line_idx, description)
    elif bug_type == "LOGIC":
        fixed = fix_logic(fixed, line_idx, description)

    return fixed


def fix_import(lines: list[str], idx: int, description: str) -> list[str]:
    """Removes unused import line cleanly."""
    if 0 <= idx < len(lines):
        line = lines[idx].strip()
        if line.startswith("import ") or line.startswith("from "):
            lines.pop(idx)
    return lines


def fix_syntax(lines: list[str], idx: int, description: str) -> list[str]:
    """Fixes common syntax errors — missing colons."""
    if not (0 <= idx < len(lines)):
        return lines

    line = lines[idx]
    stripped = line.rstrip()

    # E999 SyntaxError from flake8 — check if our agent introduced a "-" prefix
    # This happens when fix_linting incorrectly modifies a line
    if stripped.lstrip().startswith("- "):
        # Remove the erroneous "- " prefix our agent added
        indent = len(line) - len(line.lstrip())
        lines[idx] = " " * indent + stripped.lstrip()[2:] + "\n"
        return lines

    # Missing colon after def/class/if/for/while/else/elif/try/except/with
    if re.search(r'^\s*(def |class |if |for |while |else\b|elif |try:|except|with )', stripped):
        if not stripped.rstrip().endswith(":"):
            lines[idx] = stripped.rstrip() + ":\n"

    return lines


def fix_indentation(lines: list[str], idx: int, description: str) -> list[str]:
    """Fixes indentation by inferring correct level from surrounding lines."""
    if not (0 <= idx < len(lines)):
        return lines

    prev_indent = 0
    for i in range(idx - 1, -1, -1):
        if lines[i].strip():
            prev_indent = len(lines[i]) - len(lines[i].lstrip())
            if lines[i].rstrip().endswith(":"):
                prev_indent += 4
            break

    lines[idx] = " " * prev_indent + lines[idx].lstrip()
    return lines


def fix_linting(lines: list[str], idx: int, description: str) -> list[str]:
    """Fixes linting issues. Description always contains error code like 'E302 ...'"""
    if not (0 <= idx < len(lines)):
        return lines

    import re

    # Extract error code from description — e.g. "E302 expected 2 blank lines"
    code_match = re.match(r'^([A-Z]\d+)', description.strip())
    code = code_match.group(1) if code_match else ""

    # E302 / E303 — blank lines before function/class
    if code == "E302":
        insert_at = idx
        while insert_at > 0 and lines[insert_at - 1].strip() == "":
            lines.pop(insert_at - 1)
            insert_at -= 1
        lines.insert(insert_at, "\n")
        lines.insert(insert_at, "\n")
        print(f"[DEBUG] E302: inserted 2 blank lines before line {idx+1}")
        return lines

    if code == "E303":
        if idx > 0 and lines[idx - 1].strip() == "":
            lines.pop(idx - 1)
        return lines

    # W391 — blank line at end of file
    if code == "W391":
    # Work on full content string — more reliable than line list manipulation
        content = "".join(lines)
        # Strip ALL trailing whitespace and newlines, then add exactly one newline
        new_content = content.rstrip() + "\n"
        if new_content == content:
            # File already correct — return unchanged so fix_generator detects no change
            return lines
        result = new_content.splitlines(keepends=True)
        print(f"[DEBUG] W391: fixed trailing blank lines")
        return result



    # W292 — no newline at end of file
    if code == "W292":
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        return lines

    # W291 / W293 — trailing whitespace
    if code in ("W291", "W293"):
        lines[idx] = lines[idx].rstrip() + "\n"
        return lines

    # E712 — comparison to True/False
    if code == "E712":
        print(f"[DEBUG] E712 fix: applying to line: {repr(lines[idx])}")
        line = lines[idx]
        line = re.sub(r'==\s*True\b',  'is True',     line)
        line = re.sub(r'==\s*False\b', 'is False',    line)
        line = re.sub(r'!=\s*True\b',  'is not True', line)
        line = re.sub(r'!=\s*False\b', 'is not False', line)
        lines[idx] = line
        return lines

    # E711 — comparison to None
    if code == "E711":
        line = lines[idx]
        line = re.sub(r'==\s*None\b', 'is None',     line)
        line = re.sub(r'!=\s*None\b', 'is not None', line)
        lines[idx] = line
        return lines

    # E501 — line too long
    if code == "E501":
        line = lines[idx].rstrip()
        if len(line) > 120:
            lines[idx] = line[:120] + "  # noqa: E501\n"
        return lines

    # F841 — local variable assigned but never used
    if code == "F841":
        lines[idx] = re.sub(r'^(\s*)(\w+)(\s*=)', r'\1_\2\3', lines[idx], count=1)
        return lines

    # E401 — multiple imports on one line
    if code == "E401":
        line = lines[idx].strip()
        if line.startswith("import ") and "," in line:
            imports = [i.strip() for i in line[7:].split(",")]
            new_lines = [f"import {imp}\n" for imp in imports]
            lines[idx:idx+1] = new_lines
        return lines

    return lines


def fix_type_error(lines: list[str], idx: int, description: str) -> list[str]:
    """Adds # type: ignore as safe fallback for type errors."""
    if 0 <= idx < len(lines):
        line = lines[idx].rstrip()
        if "# type: ignore" not in line:
            lines[idx] = line + "  # type: ignore\n"
    return lines


def fix_logic(lines: list[str], idx: int, description: str) -> list[str]:
    import re
    if not (0 <= idx < len(lines)):
        return lines

    # Handle E712 — comparison to True/False (sometimes classified as LOGIC)
    code_match = re.match(r'^([A-Z]\d+)', description.strip())
    code = code_match.group(1) if code_match else ""
    if code == "E712":
        line = lines[idx]
        line = re.sub(r'==\s*True\b',  'is True',      line)
        line = re.sub(r'==\s*False\b', 'is False',     line)
        line = re.sub(r'!=\s*True\b',  'is not True',  line)
        line = re.sub(r'!=\s*False\b', 'is not False', line)
        lines[idx] = line
        return lines

    # Only fix return/assignment lines for operator logic bugs
    if not re.search(r'(return\s+|^\s*\w+\s*=\s*)', lines[idx]):
        return lines

    line = lines[idx]
    for pattern, replacement in [
        (r'(?<![=!<>*])\*(?![*=])', '/'),
        (r'(?<![*])/(?!=)',          '*'),
        (r'(?<![<>!= ])-(?![\-=])',  '+'),
    ]:
        new_line = re.sub(pattern, replacement, line, count=1)
        if new_line != line:
            lines[idx] = new_line
            return lines

    return lines
