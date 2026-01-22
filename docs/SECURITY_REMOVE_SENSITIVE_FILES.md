# Removing Sensitive Files from Git History

## ⚠️ Critical Security Issue

Sensitive files (service account keys and OAuth client secrets) were committed to git history. Adding files to `.gitignore` **does not remove them from git history** - they remain permanently accessible to anyone with access to the repository.

## Files That Were Committed

The following sensitive files were found in git history:

1. **`client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json`**
   - Committed in: `3b354a6` ("deployment setup")
   - Removed in: `099115a` ("Security: Remove client secret from git tracking")
   - **Status**: Still in git history ⚠️

2. **Service account keys** (if any were committed)
   - Pattern: `meant2grow-prod-*.json`, `meant2grow-dev-*.json`
   - **Status**: Check git history (see commands below)

## Why This Is Critical

- Anyone with access to the repository can view these files in git history
- Service account keys can be used to access your Firebase/Google Cloud resources
- OAuth client secrets can be used to impersonate your application
- Even if you rotate the keys, the old keys in history remain a security risk

## Solution: Remove from Git History

### Option 1: Using git-filter-repo (Recommended)

`git-filter-repo` is the modern, recommended tool for rewriting git history.

#### Installation

```bash
# macOS
brew install git-filter-repo

# Or via pip
pip install git-filter-repo
```

#### Remove Specific Files

```bash
# Remove client secret file
git filter-repo --path client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json --invert-paths

# Remove all service account keys (if they exist in history)
git filter-repo --path-glob 'meant2grow-prod-*.json' --invert-paths
git filter-repo --path-glob 'meant2grow-dev-*.json' --invert-paths
```

#### Force Push (Required)

```bash
# ⚠️ WARNING: This rewrites history. Coordinate with your team!
git push origin --force --all
git push origin --force --tags
```

### Option 2: Using BFG Repo-Cleaner

BFG is another popular tool for cleaning git history.

#### Installation

```bash
# Download from https://rtyley.github.io/bfg-repo-cleaner/
# Or via Homebrew
brew install bfg
```

#### Remove Files

```bash
# Create a file with paths to remove
echo "client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json" > files-to-remove.txt
echo "meant2grow-prod-*.json" >> files-to-remove.txt
echo "meant2grow-dev-*.json" >> files-to-remove.txt

# Clean the repository
bfg --delete-files files-to-remove.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### Option 3: Manual git filter-branch (Not Recommended)

```bash
# Remove client secret
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Verification Steps

### 1. Check if files exist in history

```bash
# Check for client secret
git log --all --full-history --oneline -- "client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json"

# Check for service account keys
git log --all --full-history --oneline -- "meant2grow-prod-*.json"
git log --all --full-history --oneline -- "meant2grow-dev-*.json"
```

If these commands return no results, the files have been successfully removed.

### 2. Verify files are in .gitignore

```bash
grep -E "(client_secret|meant2grow-.*\.json)" .gitignore
```

### 3. Test that files are ignored

```bash
# These should show as untracked (not staged)
git status meant2grow-prod-0587fbfd09ba.json
git status client_secret_*.json
```

## Post-Cleanup Actions

### 1. Rotate All Exposed Credentials

**CRITICAL**: Even after removing from git history, you must rotate all exposed credentials:

- **Google OAuth Client Secret**: 
  - Go to [Google Cloud Console](https://console.cloud.google.com/)
  - APIs & Services > Credentials
  - Regenerate the OAuth client secret
  - Update in GitHub Secrets and local `.env` files

- **Firebase Service Account Keys**:
  - Go to [Firebase Console](https://console.firebase.google.com/)
  - Project Settings > Service Accounts
  - Delete old keys and generate new ones
  - Update in GitHub Secrets and Firebase Secret Manager

### 2. Update Team Members

Notify all team members:
- They need to pull the rewritten history: `git fetch origin && git reset --hard origin/main`
- Old clones should be deleted and re-cloned
- Explain why history was rewritten

### 3. Enable Branch Protection

Prevent force pushes to main branch:
1. Go to Settings > Branches
2. Add branch protection rule for `main`
3. Enable "Restrict force pushes"

### 4. Set Up Pre-commit Hooks

Install a pre-commit hook to prevent committing sensitive files:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# Install hooks
pre-commit install
```

## Prevention

### 1. Use Patterns, Not Specific Filenames

✅ **Good** (in `.gitignore`):
```
client_secret_*.json
meant2grow-*.json
```

❌ **Bad**:
```
client_secret_783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com.json
meant2grow-prod-0587fbfd09ba.json
```

### 2. Use Git Secrets Management

- **GitHub Secrets**: For CI/CD environment variables
- **Firebase Secret Manager**: For Cloud Functions secrets
- **Environment Files**: For local development (never commit)

### 3. Pre-commit Checks

Use tools like:
- `detect-secrets` - Scans for secrets before commit
- `git-secrets` - AWS tool for preventing secret commits
- `truffleHog` - Scans git history for secrets

### 4. Code Review

Always review `.gitignore` changes and verify no sensitive files are being added.

## Current Status

✅ **Fixed**:
- Removed specific filenames from `.gitignore`
- Replaced with patterns
- Files are no longer tracked

⚠️ **Action Required**:
- Remove files from git history (use commands above)
- Rotate all exposed credentials
- Notify team members

## References

- [Git Filter Repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
