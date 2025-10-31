# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install pandoc
RUN apt-get update && apt-get install -y pandoc texlive-latex-base texlive-latex-extra && rm -rf /var/lib/apt/lists/*

# Install uv, a fast Python package installer
RUN pip install uv

# Copy the dependency definitions
COPY pyproject.toml uv.lock* ./

# Install dependencies using uv
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy the application code into the container
COPY ./app /app/app

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the application
# Cloud Run sets the PORT environment variable, which we use here.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
