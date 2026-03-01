#!/bin/bash
# Wrapper: runs Firebase image cleanup. On failure, emails greendigitalnet@gmail.com
# and writes error to log. Add to crontab: 0 0 * * 0 /path/to/scripts/run-firebase-cleanup.sh
#
# Email: Uses 'mail' if available. To use MailerSend instead, create .env.firebase-cleanup
# with MAILERSEND_API_TOKEN=xxx and FROM_EMAIL=noreply@meant2grow.com (must be verified).

set -e
EMAIL="greendigitalnet@gmail.com"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$SCRIPT_DIR/cleanup-firebase-images.sh"
LOG="/tmp/firebase-cleanup-$(date +%Y%m%d-%H%M%S).log"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

send_failure_email() {
  local subject="Firebase image cleanup failed - meant2grow-prod"
  local body="Firebase build image cleanup failed.

WHAT HAPPENED:
The weekly cleanup script could not set or run the Artifact Registry policy to delete old Cloud Functions build images.

ERROR DETAILS:
$(cat "$LOG")

WHAT TO DO:
1. Manually delete old images at: https://console.cloud.google.com/gcr/images/meant2grow-prod/us/gcf
2. Also check Artifact Registry: https://console.cloud.google.com/artifacts?project=meant2grow-prod
3. Safe to delete: images older than 7 days (keep the latest per function)
4. To retry: run $SCRIPT from $PROJECT_ROOT"

  if [ -n "$MAILERSEND_API_TOKEN" ]; then
    # Use MailerSend API
    FROM="${FROM_EMAIL:-noreply@meant2grow.com}"
    BODY_ESC=$(echo "$body" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"$body\"")
    curl -s -X POST "https://api.mailersend.com/v1/email" \
      -H "Authorization: Bearer $MAILERSEND_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"from\":{\"email\":\"$FROM\",\"name\":\"Meant2Grow\"},\"to\":[{\"email\":\"$EMAIL\"}],\"subject\":\"$subject\",\"text\":$BODY_ESC}" \
      >/dev/null 2>&1 && return 0 || true
  fi

  # Fallback: mail command
  echo "$body" | mail -s "$subject" "$EMAIL" 2>/dev/null && return 0 || true

  # Last resort: append to log file for manual check
  echo "--- $(date -u +%Y-%m-%dT%H:%M:%SZ) ---" >> "$PROJECT_ROOT/firebase-cleanup-failures.log"
  echo "$body" >> "$PROJECT_ROOT/firebase-cleanup-failures.log"
  echo "" >> "$PROJECT_ROOT/firebase-cleanup-failures.log"
}

# Load MailerSend token from .env.firebase-cleanup if it exists
if [ -f "$PROJECT_ROOT/.env.firebase-cleanup" ]; then
  set -a
  source "$PROJECT_ROOT/.env.firebase-cleanup"
  set +a
fi

cd "$PROJECT_ROOT"
if ! "$SCRIPT" > "$LOG" 2>&1; then
  send_failure_email
  exit 1
fi
rm -f "$LOG"
