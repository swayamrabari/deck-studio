from pathlib import Path
import tiktoken

ROOT = Path(".")
ENCODING = tiktoken.get_encoding("o200k_base")

IGNORED_DIRS = {
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    "coverage",
    ".turbo",
    ".idea",
    ".vscode",
}

IGNORED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".zip",
    ".exe",
    ".dll",
    ".pyc",
    ".lock",
}

total_tokens = 0
total_files = 0

for path in ROOT.rglob("*"):
    if not path.is_file():
        continue

    if any(part in IGNORED_DIRS for part in path.parts):
        continue

    if path.suffix.lower() in IGNORED_EXTENSIONS:
        continue

    try:
        content = path.read_text(encoding="utf-8")
        tokens = len(ENCODING.encode(content))

        total_tokens += tokens
        total_files += 1

    except (UnicodeDecodeError, OSError):
        continue

print(f"Files scanned: {total_files:,}")
print(f"Total source tokens: {total_tokens:,}")
print(f"Estimated 1M context usage: {total_tokens / 1_000_000:.2%}")
