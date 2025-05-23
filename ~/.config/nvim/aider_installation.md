# Aider Installation and Configuration

## Prerequisites

- Python 3.8 or higher
- pip

## Installation

1.  Install Aider using pip:

    ```bash
    pip install --user aider
    ```

2.  Add the Aider executable directory to your PATH.  This is typically:

    ```bash
    export PATH=$PATH:/home/kasjer/.local/bin
    ```

    You may want to add this line to your `.zshrc` or `.bashrc` file to make it permanent.

3.  Make sure the aider-install executable is executable

    ```bash
    chmod +x /home/kasjer/.local/bin/aider-install
    ```

4.  Run the aider-install executable

    ```bash
    /home/kasjer/.local/bin/aider-install
    ```

## Configuration

1.  Set the `GEMINI_API_KEY` environment variable:

    ```bash
    export GEMINI_API_KEY=YOUR_API_KEY
    ```

    Replace `YOUR_API_KEY` with your actual Gemini API key.  You may want to add this line to your `.zshrc` or `.bashrc` file to make it permanent.

## Usage

1.  Run Aider with a markdown file:

    ```bash
    aider document.md
