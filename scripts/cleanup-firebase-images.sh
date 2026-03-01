#!/bin/bash
# Cleanup old Firebase Cloud Functions build images (older than 7 days).
# Sets Artifact Registry policy so Google auto-deletes them.
# Run weekly via cron: 0 0 * * 0 /path/to/scripts/run-firebase-cleanup.sh

set -e
cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

firebase use production
echo "yes" | firebase functions:artifacts:setpolicy --days 7 2>&1
