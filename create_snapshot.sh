#!/bin/bash
set -e
set -o pipefail

# --- 1. Script Setup (Implicit) ---

# --- 2. Identify Git Workspace Root ---
echo "Identifying Git repository root..."
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Error: Not inside a Git repository (or git command not found)." >&2
  exit 1
}

echo "Found project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"
echo "Changed directory to project root."

# --- 3. Define Ignored Directories and Output File ---
# Array of directory names to ignore. Add more as needed.
# IMPORTANT: .git is crucial to prevent scanning the git history itself.
IGNORED_DIRS=( ".git" "node_modules" "vendor" "dist" "build" "target" "out" ".venv" "venv" "__pycache__" )

# Define the name of the output snapshot file.
OUTPUT_FILENAME="project_snapshot.txt"
# Since we've cd'd to the PROJECT_ROOT, the output file path is relative to it.
OUTPUT_FILE="$OUTPUT_FILENAME"

echo "Ignoring directories: ${IGNORED_DIRS[*]}"
echo "Output file set to: $OUTPUT_FILE (relative to project root)"

# Script content will continue here...