#!/bin/bash
# Start the retrieval API server
# Can be run from anywhere: bash backend/start.sh

# Resolve directory paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$SCRIPT_DIR" )"

echo "Activating virtual environment from: $ROOT_DIR/venv"
source "$ROOT_DIR/venv/bin/activate"

# Bypass OpenMP library duplicate error on Mac
export KMP_DUPLICATE_LIB_OK=TRUE

# Change Cwd to backend/ so relative paths inside the retriever load correctly
echo "Changing directory to backend: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

echo "Starting Uvicorn server..."
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
