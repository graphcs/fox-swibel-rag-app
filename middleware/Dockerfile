# Stage 1 - Base image foundation (need to force Intel emulation for Macs)
# FROM python:3.11-slim AS base
FROM --platform=linux/amd64 mcr.microsoft.com/azure-functions/python:4-python3.11 AS base


# Azure Functions requires code to live here
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# Set the working directory inside the container
WORKDIR /home/site/wwwroot

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file first to leverage Docker cache then install them
# (This ensures we only re-install dependencies if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt



# Stage 2 - Test image (base + test requirements + code copied)
# Simulating deployed container
FROM base AS test

# Install Test Dependencies
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt

# COPY the code. 
# We do NOT use bind mounts here. 
# Simulating a deployed artifact.
COPY . .

# Default command runs the tests (un-comment if we want to run tests automatically in the build phase)
# CMD ["pytest"]



# Stage 3 - Dev image (base + development requirements + code bind mount ready)
FROM base AS dev

# Install func core tools
RUN wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y azure-functions-core-tools-4 && \
    rm packages-microsoft-prod.deb

# Install Dev Dependencies (i.e. - Jupyter, etc.)
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy the start script and make it executable (starts both Jupyter and Azure)
COPY start_dev.sh .
RUN chmod +x start_dev.sh

# Expose BOTH ports
# 7071 = Azure Functions
# 8888 = Jupyter Lab
EXPOSE 7071 8888

# Run the script that launches both
CMD ["./start_dev.sh"]

# We do NOT copy code here, because we will mount it via Compose.
# Jupyter is started when this container runs
# CMD ["jupyter", "lab", "--ip=0.0.0.0", "--allow-root", "--no-browser"]



# Stage 4 - Production image (base + code copied in)
FROM base AS prod
# We inherit directly from 'base', skipping all test/dev tools.

# COPY the code (Just like in Test)
COPY . .

# Create a non-root user for security (Best Practice for Prod)
# Removing this for Azure purposes since it manages the user
# RUN useradd -m new_admin_user_9
# USER new_admin_user_9

# If a certain file should be run with the container is started, put it here
# CMD ["python", "main.py"]