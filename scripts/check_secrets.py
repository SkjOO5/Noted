#!/usr/bin/env python3
import sys
import re
import subprocess
from pathlib import Path

# Pattern matches actual Thinking Machines API keys (tml- followed by 20+ chars)
# Will not false-match short phrases like 'tml-renderers'
KEY_PATTERN = re.compile(r"tml-[A-Za-z0-9_-]{20,}")

def check_tracked_files():
    print("Running Secret Leak & Security Guard...")
    
    # 1. Check if .env is tracked in git
    result = subprocess.run(
        ["git", "ls-files", ".env"],
        capture_output=True,
        text=True,
        check=False
    )
    if result.stdout.strip():
        print("\n[SECURITY ERROR] '.env' file is tracked in git! Untrack it immediately with 'git rm --cached .env'.")
        return 1

    # 2. Get list of all tracked and staged files
    git_files = subprocess.run(
        ["git", "ls-files"],
        capture_output=True,
        text=True,
        check=False
    ).stdout.splitlines()

    staged_files = subprocess.run(
        ["git", "diff", "--name-only", "--cached"],
        capture_output=True,
        text=True,
        check=False
    ).stdout.splitlines()

    files_to_check = set(git_files + staged_files)
    
    violations = []
    
    for filepath_str in files_to_check:
        path = Path(filepath_str)
        if not path.is_file():
            continue
        # Skip checking binary files or images
        if path.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp", ".apk", ".jar", ".ico", ".svg"]:
            continue

        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, start=1):
                    # Exclude the pattern definition itself inside check_secrets.py
                    if "check_secrets.py" in filepath_str and "re.compile" in line:
                        continue
                    if KEY_PATTERN.search(line):
                        violations.append((filepath_str, line_num))
        except Exception as e:
            print(f"Warning: could not read {filepath_str}: {e}")

    if violations:
        print("\n[SECURITY ERROR] Thinking Machines API key pattern detected in the following tracked/staged files:")
        for file, line in violations:
            print(f"  - {file}:{line}")
        print("\nAborting commit. Move secrets exclusively to gitignored .env and Render environment variables.")
        return 1

    print("Secret check passed: 0 secret leaks detected, .env is not tracked.")
    return 0

if __name__ == "__main__":
    sys.exit(check_tracked_files())
