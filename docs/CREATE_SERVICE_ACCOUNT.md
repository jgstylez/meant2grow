# Create Service Account for Meet API

You're currently viewing the Service Accounts page. Here's what to do:

## Step 1: Create New Service Account

1. **Click "+ CREATE SERVICE ACCOUNT"** (top of the page)

2. **Service account details:**
   - **Service account name:** `meant2grow-meet-service`
   - **Service account ID:** (will auto-fill as `meant2grow-meet-service`)
   - **Description:** `Service account for creating Google Meet links`
   - Click **"CREATE AND CONTINUE"**

3. **Grant this service account access to project:**
   - Click **"Select a role"** dropdown
   - Search for: `Service Account User`
   - Select **"Service Account User"**
   - Click **"CONTINUE"**

4. **Grant users access to this service account:** (optional, skip this)
   - Click **"DONE"**

## Step 2: Create Key for Service Account

After creating the service account:

1. **Click on the service account** you just created (`meant2grow-meet-service`)

2. **Go to "KEYS" tab** (at the top)

3. **Click "ADD KEY"** > **"Create new key"**

4. **Choose "JSON"** format

5. **Click "CREATE"**
   - A JSON file will download automatically
   - **Save this file securely** - you'll need it!

6. **Open the JSON file** and note these values:
   - `client_email` (e.g., `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`)
   - `private_key` (the full key string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

## Step 3: Enable Meet API

1. **Open:** https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev

2. **Click "ENABLE"**

## Step 4: Set Firebase Functions Secrets

After you have the service account email and private key:

### Option A: Using Google Cloud Console (Easiest)

1. **Open Secret Manager:**
   https://console.cloud.google.com/secret-manager?project=meant2grow-dev

2. **Click "CREATE SECRET"**

   **Secret 1:**
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - **Secret value:** Paste the `client_email` from your JSON file
     - Example: `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`
   - Click **"CREATE SECRET"**

   **Secret 2:**
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Secret value:** Paste the full `private_key` from your JSON file
     - Must include: `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Click **"CREATE SECRET"**

### Option B: Using Firebase CLI

```bash
# Set email
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, paste: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Set key
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private_key (including BEGIN/END lines)
```

## ✅ Verification

After creating secrets, verify they exist:

1. Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
2. You should see both secrets:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`

## Next Steps

After service account and secrets are set:
1. ✅ Service account created
2. ✅ Meet API enabled
3. ✅ Secrets set
4. ⏳ Deploy security rules
5. ⏳ Deploy functions
6. ⏳ Deploy hosting

See `DEPLOY_NOW.md` for complete deployment steps.

