#!/bin/bash

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Not in a Git repository. Skipping." >&2
  exit 0
fi

REQUIRED_COMMANDS=("qwen" "glow")

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    command -v "$cmd" >/dev/null 2>&1 || {
        echo "$cmd not found. Install it first." >&2
        exit 1
    }
done

EXCLUDE_PATTERNS=(
  "*-lock.json"
  "*.po"
  "*.svg"
  "*.png"
  "*.jpg"
  "*.jpeg"
  "*.gif"
  "*.webp"
  "*.ico"
)
EXCLUDE_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS+=(":(exclude)$pattern")
done

CHANGED_FILES=$(git diff --cached --name-only -- . "${EXCLUDE_ARGS[@]}")

if [ -z "$CHANGED_FILES" ]; then
  echo "No relevant changed files found. Skipping." >&2
  exit 0
fi

echo -e "============================================================"
echo -e "Staged Files for Review:"
echo "$CHANGED_FILES"
echo -e "============================================================"
echo -e "\n⏳ AI is analyzing your code... (this may take a moment)\n"

PROMPT="Review these uncommitted changes with the following context:

## Changed Files
$CHANGED_FILES

## Instructions
Review for general best practices, security issues, and code quality.

Provide:
1. A brief summary of changes
2. Key findings (potential issues, security concerns, suggestions)
3. Positive observations (good practices, improvements)
4. Specific actionable recommendations

Format as markdown suitable for a GitHub pull request comment."

export NODE_OPTIONS="--max-old-space-size=8192 --no-warnings" 

git diff --cached -U3 -- . "${EXCLUDE_ARGS[@]}" | qwen --prompt "$PROMPT" | glow -
