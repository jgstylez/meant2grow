# Stripe Payment Integration Setup Guide

This guide explains how to set up Stripe for subscription management and payments in Meant2Grow.

## Overview

Meant2Grow uses Stripe for handling subscription payments. The system includes:

- **Free Trial**: 14-day free trial for new organizations
- **Subscription Tiers**: Pro and Enterprise plans
- **Automatic Billing**: Recurring monthly subscriptions
- **Customer Portal**: Self-service subscription management
- **Trial Reminders**: Email notifications when trials are ending

## Setup Instructions

### 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up for an account
2. Complete account verification (required for live mode)
3. For testing, you can use test mode immediately

### 2. Get Your API Keys

1. Log in to Stripe Dashboard
2. Go to **Developers** > **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for production)
4. Keep this key secure - never commit it to version control

### 3. Create Products and Prices

You need to create two products in Stripe:

#### Pro Plan
1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Name: "Meant2Grow Pro"
4. Description: "Professional mentorship program management"
5. Pricing: Set your monthly price (e.g., $99/month)
6. Billing: Recurring, Monthly
7. Copy the **Price ID** (starts with `price_`)

#### Enterprise Plan
1. Create another product: "Meant2Grow Enterprise"
2. Set your enterprise pricing (e.g., $299/month)
3. Copy the **Price ID**

### 4. Set Up Webhooks

Webhooks allow Stripe to notify your app about payment events:

1. Go to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Endpoint URL: `https://us-central1-meant2grow-dev.cloudfunctions.net/stripeWebhook`
   (Replace with your actual Firebase Functions URL)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 5. Configure Environment Variables

#### For Firebase Functions

Set these environment variables in Firebase:

```bash
# Set via Firebase CLI
firebase functions:config:set stripe.secret_key="sk_test_your_key"
firebase functions:config:set stripe.webhook_secret="whsec_your_secret"
firebase functions:config:set stripe.price_id_pro="price_your_pro_id"
firebase functions:config:set stripe.price_id_enterprise="price_your_enterprise_id"
```

Or set them in Firebase Console:
- Go to Firebase Console > Functions > Configuration
- Add environment variables:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_PRO`
  - `STRIPE_PRICE_ID_ENTERPRISE`
  - `VITE_APP_URL` (your application URL)

#### For Local Development

Add to your `.env.local` file (see `env.local.example`):

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID_PRO=price_your_pro_price_id_here
STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_price_id_here
```

### 6. Test Webhook Locally (Optional)

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:5001/meant2grow-dev/us-central1/stripeWebhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
```

## How It Works

### Trial Period

When a new organization is created:
1. Organization is set to `subscriptionTier: "free"`
2. `subscriptionStatus: "trialing"` is set
3. `trialEnd` is set to 14 days from creation date
4. Admin receives welcome email with organization code

### Subscription Upgrade

1. Admin goes to Settings > Billing
2. Clicks "Upgrade to Pro" or "Upgrade to Enterprise"
3. System creates Stripe Checkout session
4. Admin completes payment in Stripe-hosted checkout
5. Webhook updates organization subscription status
6. Organization tier is upgraded automatically

### Trial Expiration

1. Scheduled function runs daily (`checkExpiringTrials`)
2. Checks organizations with trials ending in 3 days or 1 day
3. Sends reminder emails to admins
4. After trial ends, organization remains on free tier (can be restricted)

### Subscription Management

Admins can:
- View current subscription status
- Manage payment methods via Stripe Customer Portal
- Cancel subscription (downgrades to free tier)
- Update billing information

## API Endpoints

### Create Checkout Session
```
POST /createCheckoutSession
Body: { organizationId: string, tier: "pro" | "enterprise" }
Returns: { sessionId: string, url: string }
```

### Create Portal Session
```
POST /createPortalSession
Body: { organizationId: string }
Returns: { url: string }
```

### Webhook Handler
```
POST /stripeWebhook
Handles Stripe webhook events
```

## Subscription Statuses

- `trialing`: On free trial
- `active`: Paid subscription active
- `past_due`: Payment failed, retrying
- `canceled`: Subscription canceled
- `unpaid`: Payment failed, subscription ended

## Testing

### Test Cards

Use these test card numbers in Stripe test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date, any CVC, and any ZIP code.

### Test Webhook Events

Use Stripe CLI to trigger test events:

```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test payment failure
stripe trigger invoice.payment_failed
```

## Production Checklist

Before going live:

- [ ] Switch to live API keys (`sk_live_` instead of `sk_test_`)
- [ ] Update webhook endpoint URL to production URL
- [ ] Verify webhook signing secret is correct
- [ ] Test checkout flow end-to-end
- [ ] Test subscription cancellation
- [ ] Test payment failure handling
- [ ] Set up monitoring/alerts for failed payments
- [ ] Configure email notifications for failed payments
- [ ] Review Stripe Dashboard settings
- [ ] Set up tax collection if required
- [ ] Configure invoice settings

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify webhook secret matches
3. Check Firebase Functions logs: `firebase functions:log`
4. Test with Stripe CLI: `stripe listen`

### Subscription Not Updating

1. Check webhook is receiving events
2. Verify organization ID in subscription metadata
3. Check Firebase Functions logs for errors
4. Verify Stripe customer ID is saved to organization

### Checkout Session Not Creating

1. Verify Stripe secret key is set
2. Check price IDs are correct
3. Verify organization exists in Firestore
4. Check Firebase Functions logs

## Security Best Practices

1. **Never commit API keys** to version control
2. Use environment variables for all secrets
3. Verify webhook signatures (already implemented)
4. Use HTTPS for all webhook endpoints
5. Regularly rotate API keys
6. Monitor Stripe Dashboard for suspicious activity
7. Set up rate limiting on checkout endpoints

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Firebase Functions Docs: https://firebase.google.com/docs/functions
- Stripe Support: https://support.stripe.com

