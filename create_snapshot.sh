# File: /create_snapshot.sh
#!/bin/bash
# -----------------------------------------------------------------------------
# Script Name: create_snapshot.sh
# Description: Scans a Git repository, extracts content from text files and
#              paths of image files, ignores specified directories/files,
#              and consolidates the information into a single snapshot file
#              in the project root.
# Usage:       Place this script anywhere. Run it from within a Git repository
#              or any subdirectory. It will automatically find the root.
#              ./create_snapshot.sh
# Output:      Creates/overwrites 'project_snapshot.txt' in the Git repo root.
# Requirements: bash, git, find, file (core utilities)
# -----------------------------------------------------------------------------

# --- 1. Script Setup ---
# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting. (Optional but good practice)
# set -u # Uncomment if needed, but ensure all variables are handled.
# Pipe commands should fail if any command in the pipeline fails, not just the last one.
set -o pipefail

# --- 2. Identify Git Workspace Root ---
echo "INFO: Identifying Git repository root..."
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "ERROR: Not inside a Git repository (or git command not found)." >&2
  exit 1
}
echo "INFO: Found project root: $PROJECT_ROOT"
# Change directory to the project root for consistent relative paths
cd "$PROJECT_ROOT"
echo "INFO: Changed directory to project root."

# --- 3. Define Ignored Directories and Output File ---
# Array of directory/file names to ignore. Add more as needed.
# IMPORTANT: .git is crucial to prevent scanning the git history itself.
# Also ignoring the script's own output file.
OUTPUT_FILENAME="project_snapshot.txt"
IGNORED_ITEMS=(
    # Version Control
    ".git"
    # Dependencies
    "node_modules"
    "vendor"
    "bower_components"
    # Common Build/Output Directories
    "dist"
    "build"
    "out"
    "target"
    "public/build" # e.g., Remix, Laravel Mix
    "www"          # e.g., Ionic
    # Framework-Specific Build/Cache
    ".next"        # Next.js
    ".nuxt"        # Nuxt.js
    ".svelte-kit"  # SvelteKit
    ".cache"       # Gatsby, Parcel, etc.
    # Python
    ".venv"
    "venv"
    "env"
    "__pycache__"
    ".pytest_cache"
    ".mypy_cache"
    "htmlcov"
    # Testing
    "coverage"
    # Logs & Temporary Files
    "logs"
    "tmp"
    "temp"
    # IDE & Editor Directories
    ".idea"
    ".vscode"
    ".project"
    ".settings"
    # OS Generated Files
    ".DS_Store"
    "Thumbs.db"
    # This script's output file
    "$OUTPUT_FILENAME"
)


# Define the name of the output snapshot file.
# Since we've cd'd to the PROJECT_ROOT, the output file path is relative to it.
OUTPUT_FILE="$OUTPUT_FILENAME"

echo "INFO: Ignoring directories/files: ${IGNORED_ITEMS[*]}"
echo "INFO: Output file set to: $OUTPUT_FILE (relative to project root)"

# --- 4. Prepare Output File ---
# The requirement to overwrite the output file is handled implicitly by using
# the '>' redirection operator when writing the main content in Step 7.
echo "INFO: Output file '$OUTPUT_FILE' will be overwritten if it exists."

# --- 5. Find and Process Files ---
echo "INFO: Scanning files and generating snapshot..."

# Construct the -prune arguments for find dynamically based on IGNORED_ITEMS
# We need to handle both directories and specific files like the output file.
prune_args=()
if [ ${#IGNORED_ITEMS[@]} -gt 0 ]; then
    prune_args+=("(")
    first=true
    for item in "${IGNORED_ITEMS[@]}"; do
        if [ "$first" = false ]; then
            prune_args+=("-o")
        fi
        # Match by name - works for both files and directories at any depth
        prune_args+=("-name" "$item")
        first=false
    done
    # We want to prune the matching directories or files
    prune_args+=(")" "-prune")
fi

# --- 7. Direct Output to File ---
# Find files, excluding specified items, and pipe to the processing loop.
# The redirection '> "$OUTPUT_FILE"' at the end handles Step 7 and Step 4's
# overwrite requirement. It captures all standard output from the 'while' loop.
find . "${prune_args[@]}" -o -type f -print0 | while IFS= read -r -d $'\0' file; do
    # --- 6. Inside the Loop: Process Each File ---

    # Get Relative Path (remove leading './')
    RELATIVE_PATH="${file#./}"

    # Double-check: Skip the output file itself (prune should handle it, but belt-and-suspenders)
    if [[ "$RELATIVE_PATH" == "$OUTPUT_FILENAME" ]]; then
        continue
    fi

    # Determine File Type using MIME types
    # Use '|| true' to prevent script exit if 'file' command fails (e.g., permission denied)
    MIME_TYPE=$(file --mime-type -b "$file" || echo "unknown/error") # Provide default on error

    # Conditional Processing based on MIME Type
    if [[ "$MIME_TYPE" == "unknown/error" ]]; then
        # Handle cases where file command failed
        echo "--- SKIPPED FILE (Could not determine type): $RELATIVE_PATH ---"
        echo ""
    elif [[ $MIME_TYPE == text/* ]]; then
        # Text File: Print header, content, footer, and newline
        echo "--- START FILE: $RELATIVE_PATH ---"
        # Use cat and handle potential errors reading the file gracefully
        if cat "$file"; then
            : # No-op, cat succeeded
        else
            echo "[Error reading file content for $RELATIVE_PATH]"
        fi
        echo "--- END FILE: $RELATIVE_PATH ---"
        echo "" # Blank line for separation
    elif [[ $MIME_TYPE == image/* ]]; then
        # Image File: Print only the path marker
        echo "--- IMAGE FILE: $RELATIVE_PATH ---"
        echo "" # Blank line for separation
    else
        # Other File Types (e.g., binary, application/*): Print a path marker with MIME type
        echo "--- OTHER FILE ($MIME_TYPE): $RELATIVE_PATH ---"
        echo "" # Blank line for separation
    fi

done > "$OUTPUT_FILE" # Step 7 Implementation: Redirect loop output here.

# --- 8. Final Touches & Testing ---
# Final confirmation message. Testing steps are performed manually by the user.
echo "INFO: Snapshot generation complete."
echo "INFO: Output written to: $PROJECT_ROOT/$OUTPUT_FILE"

# --- End of Script ---