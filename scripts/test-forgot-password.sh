#!/bin/bash

# Test script for forgot password email functionality
# This script helps diagnose why forgot password emails aren't being sent

set -e

echo "🧪 Testing Forgot Password Email Functionality"
echo "=============================================="
echo ""

PROJECT_ID="meant2grow-dev"
FUNCTIONS_URL="https://us-central1-meant2grow-dev.cloudfunctions.net"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check if function is deployed
echo "📦 1. Checking if forgotPassword function is deployed..."
if firebase functions:list --project $PROJECT_ID 2>/dev/null | grep -q "forgotPassword"; then
    echo -e "${GREEN}✅ forgotPassword function is deployed${NC}"
    FUNCTIONS_URL=$(firebase functions:list --project $PROJECT_ID 2>/dev/null | grep "forgotPassword" | awk '{print $NF}' || echo "$FUNCTIONS_URL")
    echo "   Function URL: $FUNCTIONS_URL/forgotPassword"
else
    echo -e "${RED}❌ forgotPassword function NOT found${NC}"
    echo "   Deploy it with: firebase deploy --only functions:forgotPassword"
    exit 1
fi
echo ""

# 2. Check recent logs
echo "📋 2. Checking recent logs for forgotPassword..."
echo "   (Run this after testing forgot password to see detailed logs)"
echo ""
RECENT_LOGS=$(firebase functions:log 2>&1 | grep -i "forgot\|password\|mailersend" | head -10)
if [ -z "$RECENT_LOGS" ]; then
    echo -e "${YELLOW}⚠️  No recent logs found for forgotPassword${NC}"
    echo "   This is normal if you haven't tested it recently"
else
    echo "$RECENT_LOGS"
fi
echo ""

# 3. Instructions for testing
echo "🧪 3. How to Test"
echo "----------------"
echo ""
echo "Option A: Test via Frontend"
echo "  1. Go to: https://sandbox.meant2grow.com (or your app URL)"
echo "  2. Click 'Forgot Password'"
echo "  3. Enter a valid email address"
echo "  4. Check Firebase Functions logs:"
echo "     firebase functions:log | grep -i 'password\|mailersend\|email'"
echo ""
echo "Option B: Test via curl"
echo "  curl -X POST $FUNCTIONS_URL/forgotPassword \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\"}'"
echo ""

# 4. Check configuration
echo "⚙️  4. Configuration Check"
echo "------------------------"
echo ""
echo "The forgotPassword function requires these environment variables:"
echo ""
echo -e "${BLUE}Required:${NC}"
echo "  - MAILERSEND_API_TOKEN (MailerSend API token)"
echo "  - MAILERSEND_FROM_EMAIL (e.g., noreply@meant2grow.com)"
echo "  - MAILERSEND_REPLY_TO_EMAIL (e.g., support@meant2grow.com)"
echo "  - VITE_APP_URL (e.g., https://sandbox.meant2grow.com)"
echo ""
echo "To set these:"
echo "  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/functions/config"
echo "  2. Click 'Environment Variables' tab"
echo "  3. Add each variable listed above"
echo "  4. Redeploy: firebase deploy --only functions:forgotPassword"
echo ""

# 5. What to look for in logs
echo "🔍 5. What to Look For in Logs"
echo "-----------------------------"
echo ""
echo "After testing, check logs for:"
echo ""
echo -e "${GREEN}Success indicators:${NC}"
echo "  ✅ Password reset email sent successfully"
echo "  📧 Email service configuration: { hasApiToken: true, ... }"
echo ""
echo -e "${RED}Error indicators:${NC}"
echo "  ⚠️  MAILERSEND_API_TOKEN not configured"
echo "  ⚠️  MAILERSEND_FROM_EMAIL not configured"
echo "  ❌ Failed to send password reset email"
echo "  Email service not configured: MAILERSEND_API_TOKEN is missing"
echo ""
echo "View logs with:"
echo "  firebase functions:log | grep -i 'password\|mailersend\|email'"
echo ""

# 6. Next steps
echo "📝 6. Next Steps"
echo "---------------"
echo ""
echo "1. Set MailerSend configuration in Firebase Console (see step 4)"
echo "2. Test forgot password functionality"
echo "3. Check logs for errors (see step 5)"
echo "4. Verify domain in MailerSend dashboard"
echo ""
echo "For detailed setup instructions, see:"
echo "  - docs/MAILERSEND_SETUP.md"
echo "  - docs/FORGOT_PASSWORD_EMAIL_FIX.md"
echo ""
