#!/bin/bash

# Diagnostic script to check match email notification setup
# Checks: Cloud Functions deployment, Resend/MailerSend config, and Firestore trigger logs

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

# 2. Check transactional email configuration (Resend / MailerSend)
echo "📧 2. Checking Email Service Configuration (Resend / MailerSend)"
echo "--------------------------------------------------------------"

echo "Checking Google Cloud Secret Manager for email-related secrets..."
if gcloud secrets list --project=$PROJECT_ID 2>/dev/null | grep -qiE "RESEND|MAILERSEND"; then
    echo -e "${GREEN}✅ Found RESEND or MAILERSEND-related secrets${NC}"
    gcloud secrets list --project=$PROJECT_ID 2>/dev/null | grep -iE "RESEND|MAILERSEND" || true
else
    echo -e "${YELLOW}⚠️  No RESEND/MAILERSEND secrets found in Secret Manager (params may still be set in Firebase Console)${NC}"
fi
echo ""

echo "Functions use defineString for RESEND_API_KEY, MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, MAILERSEND_REPLY_TO_EMAIL, VITE_APP_URL."
echo "Set these in Firebase Console → Functions → your project → Configuration (or via firebase functions:config / params as documented)."
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

if grep -q "RESEND_API_KEY" functions/src/index.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Resend (RESEND_API_KEY) referenced in functions${NC}"
else
    echo -e "${YELLOW}⚠️  RESEND_API_KEY not found in functions/src/index.ts${NC}"
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

echo ""
echo "📚 Documentation:"
echo "  - functions/src/email/README.md"
echo "  - docs/FIREBASE_DEPLOYMENT.md (if present)"
echo ""
