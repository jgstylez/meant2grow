#!/bin/bash

# Deploy to Sandbox Environment
# This script builds and deploys the application to the sandbox Firebase project

set -e

echo "🚀 Deploying to Sandbox (meant2grow-dev)"
echo "=========================================="

# Check if .firebaserc exists
if [ ! -f ".firebaserc" ]; then
    echo "❌ Error: .firebaserc file not found"
    echo "   Please create .firebaserc with your Firebase project configuration"
    exit 1
fi

# Check if .env.sandbox exists (optional, but recommended)
if [ ! -f ".env.sandbox" ]; then
    echo "⚠️  Warning: .env.sandbox not found"
    echo "   Environment variables will need to be set manually or via GitHub Secrets"
fi

# Switch to sandbox project
echo ""
echo "📋 Switching to sandbox project..."
firebase use sandbox

# Build frontend
echo ""
echo "🔨 Building frontend (sandbox mode)..."
npm run build:sandbox

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
firebase deploy --project sandbox

echo ""
echo "✅ Sandbox deployment completed!"
echo "🌐 Sandbox URL: https://sandbox.meant2grow.com"
echo ""
