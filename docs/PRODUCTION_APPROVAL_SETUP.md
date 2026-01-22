# Production Deployment Approval Setup Guide

This guide walks you through setting up an approval process for production deployments using GitHub Environments and protection rules.

## Overview

When you trigger a production deployment, GitHub will:
1. Start the deployment workflow
2. **Pause and wait for approval** from designated reviewers
3. Send notifications to reviewers
4. Once approved, continue with the deployment
5. Deploy to Firebase production

## Step 1: Create Production Environment

1. Go to your GitHub repository
2. Navigate to **Settings** > **Environments**
3. Click **New environment**
4. Name it: `production` (must match the environment name in the workflow)
5. Click **Configure environment**

## Step 2: Configure Protection Rules

### Required Reviewers

This is the key setting for approval-based deployments:

1. In the environment configuration page, scroll to **Deployment protection rules**
2. Check **Required reviewers**
3. Click **Add reviewers**
4. Add the GitHub usernames or teams who should approve production deployments
   - You can add individual users (e.g., `@jgstylez`)
   - Or teams (e.g., `@meant2grow/engineering-leads`)
   - Minimum number of reviewers: Set to `1` (or higher if you want multiple approvals)
5. Click **Save protection rules**

### Optional: Wait Timer

You can add a wait timer to give reviewers time to review:

1. Check **Wait timer**
2. Set the wait time (e.g., 5 minutes)
3. This delays the deployment even after approval

### Optional: Deployment Branches

Restrict which branches can deploy to production:

1. Check **Deployment branches**
2. Select **Selected branches**
3. Add branches (e.g., `main`, `master`, `production`)
4. This ensures only specific branches can trigger production deployments

## Step 3: How It Works

### Workflow Process

1. **Trigger Deployment**
   - Go to **Actions** > **Deploy to Production**
   - Click **Run workflow**
   - Type `deploy` in the confirmation field
   - Click **Run workflow**

2. **Workflow Starts**
   - The workflow begins running
   - It checks out code, installs dependencies, builds the app

3. **Approval Required**
   - When the workflow reaches the `environment: production` step
   - GitHub pauses the workflow
   - Shows "Waiting for approval" status
   - Sends notifications to all required reviewers

4. **Reviewer Approves**
   - Reviewers receive email/notification
   - Go to the workflow run page
   - Click **Review deployments**
   - Click **Approve and deploy** (or **Reject**)
   - Optionally add a comment explaining the approval

5. **Deployment Continues**
   - After approval, the workflow continues
   - Deploys to Firebase production
   - Completes the deployment

### Visual Flow

```
Trigger Workflow
    ↓
Build & Test
    ↓
⏸️  WAIT FOR APPROVAL ← Reviewers notified
    ↓
✅ Approved?
    ↓
Deploy to Production
    ↓
✅ Complete
```

## Step 4: Testing the Approval Process

### Test Scenario 1: Manual Approval

1. Trigger a production deployment
2. Verify the workflow pauses at "Waiting for approval"
3. As a reviewer, approve the deployment
4. Verify deployment continues and completes

### Test Scenario 2: Rejection

1. Trigger a production deployment
2. As a reviewer, reject the deployment
3. Verify the workflow fails/cancels
4. Verify no deployment occurs

## Step 5: Notification Setup

### Email Notifications

Reviewers automatically receive email notifications when:
- A deployment is waiting for approval
- A deployment is approved/rejected
- A deployment completes

### Slack/Discord Integration (Optional)

You can integrate GitHub Actions with Slack/Discord to get notifications:

1. Install GitHub app in Slack/Discord
2. Configure webhook notifications
3. Set up notifications for deployment approvals

## Step 6: Best Practices

### Who Should Be Reviewers?

- **Engineering Leads**: Technical oversight
- **Product Owners**: Business approval
- **DevOps/SRE**: Infrastructure review
- **Security Team**: Security review (if applicable)

### Approval Guidelines

Create a checklist for reviewers:

- [ ] Code has been reviewed and approved via PR
- [ ] Tests are passing
- [ ] No critical bugs or security issues
- [ ] Database migrations are safe (if applicable)
- [ ] Rollback plan is documented
- [ ] Deployment window is appropriate

### Multiple Approvers

If you set minimum reviewers to 2+:
- Requires multiple people to approve
- Provides additional safety layer
- Useful for critical deployments

## Step 7: Emergency Deployments

### Bypassing Approval (Not Recommended)

If you need to bypass approval in an emergency:

1. Temporarily remove required reviewers from the environment
2. Deploy
3. Re-add reviewers after deployment

**⚠️ Warning**: Only do this in true emergencies. Document the reason.

### Fast-Track Process

For urgent fixes:
1. Create a separate workflow without approval requirements
2. Name it something like `deploy-production-emergency.yml`
3. Use sparingly and document usage

## Troubleshooting

### Approval Not Showing Up

**Problem**: Workflow doesn't pause for approval

**Solutions**:
- Verify environment name matches exactly: `production`
- Check that "Required reviewers" is enabled
- Ensure reviewers are added correctly
- Check that the workflow uses `environment: production`

### Reviewers Not Receiving Notifications

**Problem**: Reviewers don't get notified

**Solutions**:
- Check GitHub notification settings
- Verify email addresses are correct
- Check spam folder
- Ensure reviewers have repository access

### Can't Approve Deployment

**Problem**: Reviewer can't approve

**Solutions**:
- Verify reviewer has repository access
- Check that reviewer is in the required reviewers list
- Ensure reviewer has appropriate permissions (Write or Admin)

## Current Workflow Configuration

Your current `deploy-production.yml` workflow is already configured correctly:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # ← This enables approval gates
```

The `environment: production` line is what triggers the approval process.

## Alternative: Pull Request-Based Deployments

If you prefer PR-based deployments instead of manual triggers:

1. Modify workflow to trigger on PR merge to `main`
2. Add PR approval requirements in branch protection rules
3. Deploy automatically after PR approval and merge

This provides a different approval model (PR review instead of deployment approval).

## Summary

✅ **Setup Complete When**:
- Production environment created
- Required reviewers added
- Protection rules enabled
- Test deployment approved successfully

🎯 **Result**:
- All production deployments require approval
- Reviewers get notified automatically
- Deployment history shows who approved what
- Better control over production changes

## Next Steps

1. Set up the production environment (Steps 1-2)
2. Test the approval process (Step 4)
3. Document your team's approval guidelines
4. Train team members on the process

---

**Questions?** Check the [CI/CD Setup Guide](./CI_CD_SETUP.md) for more details.
