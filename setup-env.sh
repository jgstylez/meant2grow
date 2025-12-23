#!/bin/bash

# Setup script for Meant2Grow Firebase deployment
# This script helps set up environment variables and secrets

set -e

echo "🚀 Meant2Grow Deployment Setup"
echo "================================"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

echo ""
echo "📝 Step 1: Create .env.local file"
echo "---------------------------------"
echo "Please provide the following values:"
echo ""

read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -p "Firebase API Key: " FIREBASE_API_KEY
read -p "Firebase Messaging Sender ID: " FIREBASE_SENDER_ID
read -p "Firebase App ID: " FIREBASE_APP_ID

cat > .env.local << EOF
# Google OAuth
VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}

# Firebase Config
VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_SENDER_ID}
VITE_FIREBASE_APP_ID=${FIREBASE_APP_ID}

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
EOF

echo ""
echo "✅ Created .env.local file"
echo ""

echo "📝 Step 2: Set Firebase Functions Secrets"
echo "--------------------------------------------"
echo ""
read -p "Service Account Email (e.g., meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com): " SERVICE_EMAIL
echo ""
echo "Please paste the service account private key (including BEGIN/END lines):"
echo "Press Ctrl+D when done:"
SERVICE_KEY=$(cat)

echo ""
echo "Setting secrets..."
echo ""

# Set secrets using Firebase CLI
echo "$SERVICE_EMAIL" | firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
echo "$SERVICE_KEY" | firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy security rules: firebase deploy --only firestore:rules,storage:rules"
echo "2. Build functions: cd functions && npm run build && cd .."
echo "3. Build frontend: npm run build"
echo "4. Deploy: firebase deploy"
echo ""

