#!/bin/bash

# GitHub Secrets Verification Script
# This script helps verify that all required GitHub secrets are documented
# Note: This script cannot actually check GitHub secrets (requires GitHub API access)
# It serves as a reference and validation tool

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header "GitHub Secrets Verification Checklist"
echo ""

# Define all required secrets
FIREBASE_SECRETS=(
    "FIREBASE_TOKEN_SANDBOX"
    "FIREBASE_TOKEN_PRODUCTION"
)

SANDBOX_SECRETS=(
    "SANDBOX_GOOGLE_CLIENT_ID"
    "SANDBOX_FIREBASE_API_KEY"
    "SANDBOX_FIREBASE_AUTH_DOMAIN"
    "SANDBOX_FIREBASE_PROJECT_ID"
    "SANDBOX_FIREBASE_STORAGE_BUCKET"
    "SANDBOX_FIREBASE_MESSAGING_SENDER_ID"
    "SANDBOX_FIREBASE_APP_ID"
    "SANDBOX_FIREBASE_VAPID_KEY"
    "SANDBOX_FUNCTIONS_URL"
    "SANDBOX_APP_URL"
    "SANDBOX_MAILTRAP_API_TOKEN"
    "SANDBOX_MAILTRAP_INBOX_ID"
    "SANDBOX_MAILTRAP_FROM_EMAIL"
    "SANDBOX_MAILTRAP_REPLY_TO_EMAIL"
    "SANDBOX_GIPHY_API_KEY"
)

PROD_SECRETS=(
    "PROD_GOOGLE_CLIENT_ID"
    "PROD_FIREBASE_API_KEY"
    "PROD_FIREBASE_AUTH_DOMAIN"
    "PROD_FIREBASE_PROJECT_ID"
    "PROD_FIREBASE_STORAGE_BUCKET"
    "PROD_FIREBASE_MESSAGING_SENDER_ID"
    "PROD_FIREBASE_APP_ID"
    "PROD_FIREBASE_VAPID_KEY"
    "PROD_FUNCTIONS_URL"
    "PROD_APP_URL"
    "PROD_MAILTRAP_API_TOKEN"
    "PROD_MAILTRAP_INBOX_ID"
    "PROD_MAILTRAP_FROM_EMAIL"
    "PROD_MAILTRAP_REPLY_TO_EMAIL"
    "PROD_GIPHY_API_KEY"
)

# Count totals
TOTAL_FIREBASE=${#FIREBASE_SECRETS[@]}
TOTAL_SANDBOX=${#SANDBOX_SECRETS[@]}
TOTAL_PROD=${#PROD_SECRETS[@]}
TOTAL=$((TOTAL_FIREBASE + TOTAL_SANDBOX + TOTAL_PROD))

print_info "Total secrets required: $TOTAL"
echo ""

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    print_info "GitHub CLI (gh) detected. Checking secrets..."
    echo ""
    
    # Check Firebase secrets
    print_header "Firebase Authentication Secrets ($TOTAL_FIREBASE)"
    for secret in "${FIREBASE_SECRETS[@]}"; do
        if gh secret list | grep -q "^$secret"; then
            echo -e "${GREEN}✓${NC} $secret"
        else
            echo -e "${RED}✗${NC} $secret (not found)"
        fi
    done
    echo ""
    
    # Check Sandbox secrets
    print_header "Sandbox Environment Secrets ($TOTAL_SANDBOX)"
    for secret in "${SANDBOX_SECRETS[@]}"; do
        if gh secret list | grep -q "^$secret"; then
            echo -e "${GREEN}✓${NC} $secret"
        else
            echo -e "${RED}✗${NC} $secret (not found)"
        fi
    done
    echo ""
    
    # Check Production secrets
    print_header "Production Environment Secrets ($TOTAL_PROD)"
    for secret in "${PROD_SECRETS[@]}"; do
        if gh secret list | grep -q "^$secret"; then
            echo -e "${GREEN}✓${NC} $secret"
        else
            echo -e "${RED}✗${NC} $secret (not found)"
        fi
    done
    echo ""
    
    print_info "Note: This check uses GitHub CLI. Make sure you're authenticated: gh auth login"
else
    print_warn "GitHub CLI (gh) not found. Install it to verify secrets automatically."
    echo ""
    print_info "Install GitHub CLI: https://cli.github.com/"
    echo ""
    print_info "Or manually check secrets at: https://github.com/YOUR_REPO/settings/secrets/actions"
    echo ""
    
    # Print checklist
    print_header "Firebase Authentication Secrets ($TOTAL_FIREBASE)"
    for secret in "${FIREBASE_SECRETS[@]}"; do
        echo "  [ ] $secret"
    done
    echo ""
    
    print_header "Sandbox Environment Secrets ($TOTAL_SANDBOX)"
    for secret in "${SANDBOX_SECRETS[@]}"; do
        echo "  [ ] $secret"
    done
    echo ""
    
    print_header "Production Environment Secrets ($TOTAL_PROD)"
    for secret in "${PROD_SECRETS[@]}"; do
        echo "  [ ] $secret"
    done
    echo ""
fi

print_header "Summary"
echo ""
echo "Firebase Authentication Secrets: $TOTAL_FIREBASE"
echo "Sandbox Environment Secrets: $TOTAL_SANDBOX"
echo "Production Environment Secrets: $TOTAL_PROD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Secrets Required: $TOTAL"
echo ""

print_info "For detailed setup instructions, see: docs/CI_CD_SETUP.md"
print_info "For a printable checklist, see: scripts/github-secrets-checklist.md"
