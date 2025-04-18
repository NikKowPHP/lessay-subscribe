# TODO: Create Bash Script for Project Code Snapshot

This script will scan a Git workspace, extract text file contents and image file paths, ignore specified directories, and consolidate the information into a single output file relative to the project root.

## 1. Script Setup
****
-   [x] Create a new bash script file (e.g., `create_snapshot.sh`).
-   [x] Add the shebang line: `#!/bin/bash`.
-   [x] Make the script executable: `chmod +x create_snapshot.sh`.
-   [x] (Optional) Add `set -e` and `set -o pipefail` for robust error handling.

## 2. Identify Git Workspace Root

-   [x] Use `git rev-parse --show-toplevel` to find the root directory of the current Git repository.
-   [x] Store this path in a variable (e.g., `PROJECT_ROOT`).
-   [x] Add error handling: Check if the command succeeded. If not, print an error message (e.g., "Error: Not inside a Git repository.") and exit.
-   [x] Change the current directory to the `PROJECT_ROOT` using `cd "$PROJECT_ROOT"` so that all subsequent paths are relative to the root.

## 3. Define Ignored Directories and Output File

-   [ ] Define an array or a list of directory names to ignore (e.g., `node_modules`, `vendor`, `.git`, `dist`, `build`, etc.). Ensure `.git` is always included.
-   [ ] Define the name for the output file (e.g., `project_snapshot.txt`).
-   [ ] Construct the full path to the output file relative to the `PROJECT_ROOT` (e.g., `OUTPUT_FILE="$PROJECT_ROOT/project_snapshot.txt"` - since we `cd`'d, just `OUTPUT_FILE="project_snapshot.txt"` might be sufficient and simpler).

## 4. Prepare Output File

-   [ ] Ensure the script overwrites the output file if it exists. This can be done by using single redirection `>` when writing the main content, typically by redirecting the output of the main processing loop.

## 5. Find and Process Files

-   [ ] Use the `find` command starting from the current directory (`.` - which is now the project root).
    -   [ ] Use `-type f` to find only files.
    -   [ ] Construct the `-prune` logic for ignored directories. This usually looks something like:
        `find . \( -name node_modules -o -name vendor -o -name .git \) -prune -o -type f -print`
        *(Adjust the `-name` parts for all directories to ignore)*.
    -   [ ] Pipe the output of `find` to a `while read -r file` loop to process each file path found.

## 6. Inside the Loop: Process Each File

-   [ ] For each `file` found by `find`:
    -   [ ] **Get Relative Path:** The path from `find .` will be relative (e.g., `./src/myfile.js`). Optionally, remove the leading `./` using `sed 's|^\./||'` or parameter expansion `"${file#./}"` for cleaner output. Store this in `RELATIVE_PATH`.
    -   [ ] **Determine File Type:** Use `file --mime-type -b "$file"` to get the MIME type of the file.
    -   [ ] **Conditional Processing:**
        -   [ ] **If Text File:** Check if the MIME type starts with `text/` (e.g., using `[[ $MIME_TYPE == text/* ]]` or `echo "$MIME_TYPE" | grep -q '^text/'`).
            -   [ ] Print a header indicating the file path (e.g., `echo "--- START FILE: $RELATIVE_PATH ---"`).
            -   [ ] Print the file contents using `cat "$file"`.
            -   [ ] Print a footer (optional, e.g., `echo "--- END FILE: $RELATIVE_PATH ---"`).
            -   [ ] Print a blank line for separation.
        -   [ ] **If Image File:** Check if the MIME type starts with `image/`.
            -   [ ] Print only the relative path marker (e.g., `echo "--- IMAGE FILE: $RELATIVE_PATH ---"`).
        -   [ ] **Other Files (Optional):** Decide how to handle other file types (binary, etc.). Maybe ignore them or just print their path like images. Currently, the logic implies they might be ignored if neither text nor image. Add an `else` condition if needed.

## 7. Direct Output to File

-   [ ] Redirect the standard output of the entire `while` loop (or the `find | while` pipeline) to the `$OUTPUT_FILE` using `> "$OUTPUT_FILE"`. This handles the overwriting requirement efficiently.
    ```bash
    find . <find_options> | while read -r file; do
        # ... processing logic ...
        # ... echo commands print to stdout ...
    done > "$OUTPUT_FILE"
    ```

## 8. Final Touches & Testing

-   [ ] Add comments to the script explaining different sections.
-   [ ] Add `echo` statements indicating progress (e.g., "Finding Git root...", "Scanning files...", "Writing snapshot to $OUTPUT_FILE...").
-   [ ] Test the script thoroughly on a sample project:
    -   [ ] Check if the Git root is found correctly.
    -   [ ] Verify that ignored directories (`node_modules`, `vendor`, `.git`) are skipped.
    -   [ ] Confirm text file paths and contents are present.
    -   [ ] Confirm image file paths are present (without content).
    -   [ ] Check if the output file is created in the correct location (project root).
    -   [ ] Run the script again and verify the output file is overwritten.
    -   [ ] Test with filenames containing spaces or special characters.

## 9. Documentation (Optional)

-   [ ] Add usage instructions as comments at the top of the script or in a separate README.