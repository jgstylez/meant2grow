#!/bin/bash

# Diagnostic script to check match email notification setup
# Checks: Cloud Functions deployment, Mailtrap config, and Firestore trigger logs

set -e

echo "🔍 Checking Match Email Notification Setup"
echo "============================================"
echo ""

PROJECT_ID="meant2grow-dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Cloud Functions Deployment Status
echo "📦 1. Checking Cloud Functions Deployment Status"
echo "-----------------------------------------------"
if firebase functions:list --project $PROJECT_ID 2>/dev/null | grep -q "onMatchCreated"; then
    echo -e "${GREEN}✅ onMatchCreated function is deployed${NC}"
    firebase functions:list --project $PROJECT_ID 2>/dev/null | grep "onMatchCreated" || true
else
    echo -e "${RED}❌ onMatchCreated function NOT found in deployed functions${NC}"
    echo ""
    echo "Deployed functions:"
    firebase functions:list --project $PROJECT_ID 2>/dev/null | head -20 || echo "Could not list functions"
fi
echo ""

# 2. Check Mailtrap Configuration
echo "📧 2. Checking Mailtrap Email Service Configuration"
echo "--------------------------------------------------"

# Check if Mailtrap env vars are set in Secret Manager
echo "Checking Google Cloud Secret Manager for Mailtrap secrets..."
if gcloud secrets list --project=$PROJECT_ID 2>/dev/null | grep -qi "MAILTRAP"; then
    echo -e "${GREEN}✅ Mailtrap secrets found in Secret Manager${NC}"
    gcloud secrets list --project=$PROJECT_ID 2>/dev/null | grep -i "MAILTRAP" || true
else
    echo -e "${YELLOW}⚠️  No Mailtrap secrets found in Secret Manager${NC}"
    echo ""
    echo "The functions code uses process.env.MAILTRAP_API_TOKEN, which means"
    echo "these need to be set as runtime environment variables."
    echo ""
    echo "Required environment variables:"
    echo "  - MAILTRAP_API_TOKEN"
    echo "  - MAILTRAP_USE_SANDBOX (true/false)"
    echo "  - MAILTRAP_INBOX_ID (optional, for sandbox mode)"
    echo "  - MAILTRAP_FROM_EMAIL"
    echo "  - MAILTRAP_REPLY_TO_EMAIL"
    echo "  - VITE_APP_URL (or it will default to https://meant2grow.com)"
    echo ""
    echo "To set these, you can:"
    echo "  1. Use Firebase Console: Functions > Configuration > Environment Variables"
    echo "  2. Or use gcloud commands (see below)"
fi
echo ""

# Check if functions are using defineString/defineSecret for Mailtrap
echo "Checking if Mailtrap is configured via defineString/defineSecret..."
if grep -q "defineString.*MAILTRAP\|defineSecret.*MAILTRAP" functions/src/index.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Mailtrap configured via defineString/defineSecret${NC}"
else
    echo -e "${YELLOW}⚠️  Mailtrap not configured via defineString/defineSecret${NC}"
    echo "The code uses process.env directly, which requires runtime environment variables."
fi
echo ""

# 3. Check Firestore Trigger Logs
echo "📋 3. Checking Firestore Trigger Logs"
echo "-------------------------------------"
echo "Fetching recent logs for onMatchCreated..."
echo ""

# Try to get logs using gcloud
if command -v gcloud &> /dev/null; then
    echo "Recent onMatchCreated function logs:"
    gcloud functions logs read onMatchCreated \
        --project=$PROJECT_ID \
        --limit=10 \
        --format="table(timestamp,severity,textPayload)" 2>/dev/null || \
    gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=onMatchCreated" \
        --project=$PROJECT_ID \
        --limit=10 \
        --format="table(timestamp,severity,textPayload)" 2>/dev/null || \
    echo "Could not fetch logs. Try: firebase functions:log"
else
    echo "gcloud not found. Use: firebase functions:log"
fi
echo ""

# 4. Check Function Code
echo "🔍 4. Checking Function Implementation"
echo "----------------------------------------"
if grep -q "onMatchCreated" functions/src/index.ts; then
    echo -e "${GREEN}✅ onMatchCreated trigger found in code${NC}"
    echo ""
    echo "Function location: functions/src/index.ts"
    echo "Lines:"
    grep -n "onMatchCreated" functions/src/index.ts | head -3
else
    echo -e "${RED}❌ onMatchCreated trigger NOT found in code${NC}"
fi
echo ""

# 5. Summary and Recommendations
echo "📝 Summary and Recommendations"
echo "==============================="
echo ""

# Check if function is deployed
DEPLOYED=$(firebase functions:list --project $PROJECT_ID 2>/dev/null | grep -c "onMatchCreated" || echo "0")
if [ "$DEPLOYED" -gt 0 ]; then
    echo -e "${GREEN}✅ Function is deployed${NC}"
else
    echo -e "${RED}❌ Function is NOT deployed${NC}"
    echo "   Run: cd functions && npm run build && cd .. && firebase deploy --only functions"
fi

# Check Mailtrap config
HAS_MAILTRAP_SECRET=$(gcloud secrets list --project=$PROJECT_ID 2>/dev/null | grep -ci "MAILTRAP" || echo "0")
if [ "$HAS_MAILTRAP_SECRET" -gt 0 ]; then
    echo -e "${GREEN}✅ Mailtrap secrets configured${NC}"
else
    echo -e "${YELLOW}⚠️  Mailtrap environment variables need to be configured${NC}"
    echo ""
    echo "To configure Mailtrap for Cloud Functions:"
    echo ""
    echo "Option 1: Using Firebase Console (Recommended)"
    echo "  1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/functions/config"
    echo "  2. Click 'Add variable' for each:"
    echo "     - MAILTRAP_API_TOKEN"
    echo "     - MAILTRAP_USE_SANDBOX (set to 'true' for testing)"
    echo "     - MAILTRAP_INBOX_ID (if using sandbox)"
    echo "     - MAILTRAP_FROM_EMAIL"
    echo "     - MAILTRAP_REPLY_TO_EMAIL"
    echo "     - VITE_APP_URL"
    echo ""
    echo "Option 2: Using gcloud CLI"
    echo "  gcloud functions deploy onMatchCreated \\"
    echo "    --update-env-vars MAILTRAP_API_TOKEN=your_token,MAILTRAP_USE_SANDBOX=true \\"
    echo "    --project=$PROJECT_ID"
    echo ""
    echo "Option 3: Update code to use defineString (better approach)"
    echo "  Modify functions/src/index.ts to use defineString for Mailtrap config"
fi

echo ""
echo "📚 Documentation:"
echo "  - Mailtrap Setup: docs/MAILTRAP_SETUP.md"
echo "  - Firebase Deployment: docs/FIREBASE_DEPLOYMENT.md"
echo ""
