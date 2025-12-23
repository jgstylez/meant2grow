# Setting Firebase Functions Secrets

For Firebase Functions v2 using `defineSecret` and `defineString`, secrets are stored in Google Cloud Secret Manager.

## Method 1: Using Firebase CLI (Recommended)

```bash
# Set the service account email (string parameter)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Set the service account private key (secret)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private key including BEGIN/END lines
```

## Method 2: Using Google Cloud Console

1. Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev

2. Click "CREATE SECRET"

3. **For GOOGLE_SERVICE_ACCOUNT_EMAIL:**
   - Name: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - Secret value: `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`
   - Click "CREATE SECRET"

4. **For GOOGLE_SERVICE_ACCOUNT_KEY:**
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Secret value: Paste the full private key from your JSON file (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - Click "CREATE SECRET"

## Method 3: Using gcloud CLI

If you have `gcloud` installed:

```bash
# Set service account email
echo -n "meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com" | \
  gcloud secrets create GOOGLE_SERVICE_ACCOUNT_EMAIL \
    --data-file=- \
    --project=meant2grow-dev

# Set service account key (from JSON file)
gcloud secrets create GOOGLE_SERVICE_ACCOUNT_KEY \
  --data-file=path/to/service-account-key.json \
  --project=meant2grow-dev
```

Or if you want to paste the key directly:

```bash
# Set service account key
gcloud secrets create GOOGLE_SERVICE_ACCOUNT_KEY \
  --data-file=- \
  --project=meant2grow-dev
# Then paste the private_key value from your JSON file, press Ctrl+D
```

## Verify Secrets Are Set

### Using Firebase CLI:
```bash
# List secrets (if command exists)
firebase functions:secrets:list
```

### Using Google Cloud Console:
1. Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
2. You should see both secrets listed

### Using gcloud CLI:
```bash
gcloud secrets list --project=meant2grow-dev
```

## Grant Functions Access to Secrets

After creating secrets, you need to ensure Cloud Functions can access them. This is usually automatic, but you can verify:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=meant2grow-dev
2. Find the service account: `meant2grow-dev@appspot.gserviceaccount.com` or `[PROJECT_NUMBER]-compute@developer.gserviceaccount.com`
3. Ensure it has "Secret Manager Secret Accessor" role

## Important Notes

1. **Secrets must exist before deploying functions** - Functions will fail if secrets aren't set
2. **Secret names must match exactly** - `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_KEY`
3. **Private key format** - Must include the full key with BEGIN/END lines
4. **After setting secrets** - Redeploy functions: `firebase deploy --only functions`

## Troubleshooting

### "Secret not found" error
- Verify secret exists in Secret Manager
- Check secret name matches exactly (case-sensitive)
- Ensure Cloud Functions service account has access

### "Permission denied" error
- Grant "Secret Manager Secret Accessor" role to Cloud Functions service account
- Check IAM permissions in Google Cloud Console

