# Quick Reference: Production Deployment Approval

## 🚀 How to Deploy to Production

### Step 1: Trigger Deployment
1. Go to **Actions** > **Deploy to Production**
2. Click **Run workflow**
3. Type `deploy` in confirmation field
4. Click **Run workflow**

### Step 2: Wait for Approval
- Workflow will pause and show "Waiting for approval"
- Reviewers receive notifications
- Check workflow status in Actions tab

### Step 3: Approve (as Reviewer)
1. Go to the workflow run page
2. Click **Review deployments**
3. Click **Approve and deploy**
4. Optionally add a comment
5. Deployment continues automatically

## ⚙️ Setup (One-Time)

### Create Production Environment
1. **Settings** > **Environments** > **New environment**
2. Name: `production`
3. Enable **Required reviewers**
4. Add reviewer usernames/teams
5. Save

## 📋 Approval Checklist

Before approving, verify:
- [ ] Code reviewed via PR
- [ ] Tests passing
- [ ] No critical bugs
- [ ] Safe to deploy
- [ ] Rollback plan ready

## 🔗 Full Documentation

- **Complete Setup Guide**: [PRODUCTION_APPROVAL_SETUP.md](./PRODUCTION_APPROVAL_SETUP.md)
- **CI/CD Overview**: [CI_CD_SETUP.md](./CI_CD_SETUP.md)
