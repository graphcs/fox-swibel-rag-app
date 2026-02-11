#!/bin/bash

# 1. Start Azure Functions in the background (&)
# We pipe logs to a file so they don't clash with Jupyter's console output,
# but you can tail them later if needed.
echo "Starting Azure Functions on port 7071..."
func start --python --port 7071 > func_logs.txt 2>&1 &

# 2. Start Jupyter Lab in the foreground
# This keeps the container running.
echo "Starting Jupyter Lab on port 8888..."
jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root --NotebookApp.token=''