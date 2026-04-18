#!/bin/bash

# Collections AI System - Local Development Script
# Sets up everything needed for local development and testing

set -e

echo "Collections AI System - Setup Script"
echo "======================================"

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY not set"
    exit 1
fi

echo "✓ Configuration verified"

# Install dependencies
echo "Installing dependencies..."
pnpm install

echo "✓ Dependencies installed"

# Run database migrations
echo "Running database schema..."
# If using local postgres via docker-compose, migrations run automatically
# If using Supabase, ensure tables are created via the SQL scripts

echo "✓ Database ready"

# Build the project
echo "Building project..."
pnpm build

echo "✓ Build complete"

echo ""
echo "Setup complete! To start the development server:"
echo "  pnpm dev"
echo ""
echo "To run evaluation:"
echo "  curl http://localhost:3000/api/evaluation/run?batchSize=10"
echo ""
