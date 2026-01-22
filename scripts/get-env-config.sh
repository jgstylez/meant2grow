#!/bin/bash

# Environment Configuration Helper Script
# Detects current environment and loads appropriate configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to detect environment
detect_environment() {
    # Check if environment is provided as argument
    if [ -n "$1" ]; then
        echo "$1"
        return
    fi
    
    # Check if .firebaserc exists and read current project
    if [ -f ".firebaserc" ]; then
        CURRENT_PROJECT=$(firebase use 2>/dev/null | grep -oP '(?<=\()[^)]+' || echo "")
        if [ -n "$CURRENT_PROJECT" ]; then
            if [ "$CURRENT_PROJECT" == "meant2grow-dev" ]; then
                echo "sandbox"
                return
            elif [ "$CURRENT_PROJECT" == "meant2grow-prod" ]; then
                echo "production"
                return
            fi
        fi
    fi
    
    # Default to sandbox if cannot determine
    echo "sandbox"
}

# Function to load environment variables
load_env_file() {
    local env=$1
    local env_file=".env.${env}"
    
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}✓${NC} Loading environment variables from ${env_file}"
        # Export variables (handle comments and empty lines)
        set -a
        source "$env_file"
        set +a
        return 0
    else
        echo -e "${YELLOW}⚠${NC}  Environment file ${env_file} not found"
        return 1
    fi
}

# Main execution
ENV=$(detect_environment "$1")

echo "🔍 Detected environment: ${GREEN}${ENV}${NC}"

# Load environment file
if load_env_file "$ENV"; then
    echo -e "${GREEN}✅${NC} Environment configuration loaded successfully"
    echo ""
    echo "Environment: $ENV"
    echo "Project ID: ${VITE_FIREBASE_PROJECT_ID:-not set}"
    echo "App URL: ${VITE_APP_URL:-not set}"
else
    echo -e "${YELLOW}⚠${NC}  Using environment variables from current shell or CI/CD secrets"
fi

# Export detected environment
export DEPLOY_ENV="$ENV"
