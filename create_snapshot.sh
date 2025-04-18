#!/bin/bash
# -----------------------------------------------------------------------------
# Script Name: create_snapshot.sh
# Description: Scans a Git repository, extracts content from text files and
#              paths of image/other files, ignores specified directories/files,
#              and consolidates the information into a single snapshot file
#              in the project root, prepended with an AI context instruction.
#              Finally, attempts to reveal the snapshot file in the default
#              file manager (opens folder, selects file where possible).
# Usage:       Place this script anywhere. Run it from within a Git repository
#              or any subdirectory. It will automatically find the root.
#              ./create_snapshot.sh
# Output:      Creates/overwrites 'project_snapshot.txt' in the Git repo root.
#              Opens the project root folder in the default file manager,
#              attempting to select 'project_snapshot.txt'.
# Requirements: bash, git, find, file (core utilities), and potentially
#               xdg-utils (Linux), wslpath (WSL), specific file managers
#               (nautilus, dolphin, thunar) on Linux, or appropriate commands
#               for your OS.
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
OUTPUT_FILE="$OUTPUT_FILENAME" # This is just the filename, relative to PROJECT_ROOT
# Get the absolute path to the output file for file manager commands
ABSOLUTE_OUTPUT_FILE="$PWD/$OUTPUT_FILENAME"


echo "INFO: Ignoring directories/files: ${IGNORED_ITEMS[*]}"
echo "INFO: Output file set to: $OUTPUT_FILE (relative to project root)"

# --- 4. Prepare Output File & Add Header ---
# Write the AI context header to the output file.
# This command uses '>' which creates the file or overwrites it if it exists.
echo "INFO: Writing AI context header to '$OUTPUT_FILE'..."
echo "# AI Context Reference: Please analyze the following project snapshot thoroughly to understand the codebase structure and content." > "$OUTPUT_FILE"
# Any subsequent writes to the file in this script MUST use '>>' (append).

# --- 5. Find and Process Files ---
echo "INFO: Scanning files and generating snapshot content..."

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

# --- 7. Append Output to File ---
# Find files, excluding specified items, and pipe to the processing loop.
# The redirection '>> "$OUTPUT_FILE"' at the end APPENDS the output of the
# 'while' loop to the file already created/cleared in Step 4.
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

done >> "$OUTPUT_FILE" # Step 7 Implementation: APPEND loop output here.

# --- 8. Final Touches & Testing ---
# Final confirmation message. Testing steps are performed manually by the user.
echo "INFO: Snapshot generation complete."
echo "INFO: Output written to: $PROJECT_ROOT/$OUTPUT_FILE"


# --- 9. Reveal Snapshot File in File Manager ---
echo "INFO: Attempting to reveal '$OUTPUT_FILE' in the default file manager..."
# Goal: Open the containing folder ($PROJECT_ROOT) and select the file.
# This works reliably via specific commands on macOS and Windows.
# On Linux, we attempt specific file manager commands known to support selection,
# falling back to opening the folder if none are found or if the file is missing.

# We are in PROJECT_ROOT. Use ABSOLUTE_OUTPUT_FILE for commands needing it.

case "$(uname -s)" in
    Darwin)
        # macOS: Use 'open -R' which reveals (opens folder and selects) the file in Finder.
        if [ -f "$OUTPUT_FILE" ]; then
            open -R "$OUTPUT_FILE" && echo "INFO: Revealed '$OUTPUT_FILE' in Finder (opened folder and selected file)." || echo "WARN: Failed to reveal file using 'open -R'."
        else
            echo "WARN: Output file '$OUTPUT_FILE' not found. Cannot select it. Opening folder instead."
            open . && echo "INFO: Opened folder using 'open .'" || echo "WARN: Failed to open folder using 'open .'."
        fi
        ;;
    Linux)
        # Linux: Check for WSL first
        if [[ -f /proc/version ]] && grep -qiE "(Microsoft|WSL)" /proc/version &> /dev/null ; then
            # WSL: Use explorer.exe /select which reveals the file in Windows Explorer.
            if command -v wslpath &> /dev/null; then
                if [ -f "$OUTPUT_FILE" ]; then
                    WIN_PATH=$(wslpath -w "$ABSOLUTE_OUTPUT_FILE") # Use absolute path for wslpath
                    explorer.exe /select,"$WIN_PATH" && echo "INFO: Revealed '$OUTPUT_FILE' in Windows Explorer (opened folder and selected file)." || echo "WARN: Failed to reveal file using 'explorer.exe /select'. Ensure explorer.exe is accessible."
                else
                    echo "WARN: Output file '$OUTPUT_FILE' not found. Cannot select it. Opening folder instead."
                    explorer.exe . && echo "INFO: Opened folder in Windows Explorer using 'explorer.exe .'" || echo "WARN: Failed to open folder using 'explorer.exe .'."
                fi
            else
                echo "WARN: 'wslpath' command not found. Cannot determine Windows path to select file. Opening folder instead."
                explorer.exe . && echo "INFO: Opened folder in Windows Explorer using 'explorer.exe .'" || echo "WARN: Failed to open folder using 'explorer.exe .'."
            fi
        else
            # Standard Linux: Try specific file managers known to support selection.
            revealed=false
            if [ ! -f "$OUTPUT_FILE" ]; then
                 echo "WARN: Output file '$OUTPUT_FILE' not found. Cannot select it."
                 # Proceed to fallback (xdg-open .) below
            else
                # Try Nautilus (GNOME, Ubuntu default)
                if command -v nautilus &> /dev/null; then
                    echo "INFO: Found Nautilus. Attempting reveal using 'nautilus --select'..."
                    # Run in background, suppress output
                    nautilus --select "$ABSOLUTE_OUTPUT_FILE" &> /dev/null &
                    revealed=true
                    echo "INFO: Requested reveal via Nautilus."
                fi

                # Try Dolphin (KDE) if not already revealed
                if [ "$revealed" = false ] && command -v dolphin &> /dev/null; then
                    echo "INFO: Found Dolphin. Attempting reveal using 'dolphin --select'..."
                    dolphin --select "$ABSOLUTE_OUTPUT_FILE" &> /dev/null &
                    revealed=true
                    echo "INFO: Requested reveal via Dolphin."
                fi

                # Try Thunar (XFCE) if not already revealed
                # Thunar often selects when given the direct path, but less guaranteed.
                if [ "$revealed" = false ] && command -v thunar &> /dev/null; then
                    echo "INFO: Found Thunar. Attempting reveal by opening file path (may select file)..."
                    thunar "$ABSOLUTE_OUTPUT_FILE" &> /dev/null &
                    revealed=true
                    echo "INFO: Requested reveal via Thunar (behavior might vary)."
                fi
            fi

            # Fallback: If no specific manager was found/used or file was missing, use xdg-open to open the folder.
            if [ "$revealed" = false ]; then
                if command -v xdg-open &> /dev/null; then
                    echo "INFO: No specific file manager found or file missing. Falling back to opening the containing folder using 'xdg-open .'."
                    xdg-open . &> /dev/null
                    if [ $? -eq 0 ]; then
                        echo "INFO: Successfully requested opening current folder via 'xdg-open .'."
                    else
                        echo "WARN: Fallback 'xdg-open .' failed."
                    fi
                else
                    echo "WARN: No specific file manager found, and fallback 'xdg-open' command not found. Cannot automatically open folder. Please install xdg-utils or a supported file manager (Nautilus, Dolphin, Thunar)."
                fi
            fi
        fi
        ;;
    CYGWIN*|MINGW*|MSYS*)
        # Windows environments (Git Bash, etc.): Use explorer.exe /select which reveals the file.
         if [ -f "$OUTPUT_FILE" ]; then
            # Using the relative filename works because we are in the correct CWD ($PROJECT_ROOT).
            explorer.exe /select,"$OUTPUT_FILE" && echo "INFO: Revealed '$OUTPUT_FILE' in Windows Explorer (opened folder and selected file)." || echo "WARN: Failed to reveal file using 'explorer.exe /select'."
         else
            echo "WARN: Output file '$OUTPUT_FILE' not found. Cannot select it. Opening folder instead."
            explorer.exe . && echo "INFO: Opened folder in Windows Explorer using 'explorer.exe .'" || echo "WARN: Failed to open folder using 'explorer.exe .'."
         fi
        ;;
    *)
        # Unsupported OS
        echo "WARN: Unsupported OS '$(uname -s)'. Cannot automatically reveal the file."
        ;;
esac

echo "INFO: Script finished."
# --- End of Script ---