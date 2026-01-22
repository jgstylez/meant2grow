#!/bin/bash

# Deploy to Production Environment
# This script builds and deploys the application to the production Firebase project
# WARNING: This deploys to production! Use with caution.

set -e

echo "🚀 Deploying to Production (meant2grow-prod)"
echo "============================================="
echo ""
echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
echo "   This will affect live users at meant2grow.com"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check if .firebaserc exists
if [ ! -f ".firebaserc" ]; then
    echo "❌ Error: .firebaserc file not found"
    echo "   Please create .firebaserc with your Firebase project configuration"
    exit 1
fi

# Check if .env.production exists (optional, but recommended)
if [ ! -f ".env.production" ]; then
    echo "⚠️  Warning: .env.production not found"
    echo "   Environment variables will need to be set manually or via GitHub Secrets"
fi

# Switch to production project
echo ""
echo "📋 Switching to production project..."
firebase use production

# Build frontend
echo ""
echo "🔨 Building frontend (production mode)..."
npm run build:production

# Build functions
echo ""
echo "🔨 Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..

# Deploy everything
echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy --project production

echo ""
echo "✅ Production deployment completed!"
echo "🌐 Production URL: https://meant2grow.com"
echo ""
