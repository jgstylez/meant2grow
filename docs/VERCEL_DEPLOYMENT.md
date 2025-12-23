# Vercel Deployment Guide

This document outlines the steps and configuration needed to deploy this application to Vercel.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Your Gemini API key from Google AI Studio

## Deployment Steps

### 1. Push to Git Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect the Vite framework

### 3. Configure Environment Variables

In your Vercel project settings, add the following environment variable:

**Required:**
- `GEMINI_API_KEY` - Your Google Gemini API key

**How to add:**
1. Go to Project Settings → Environment Variables
2. Add `GEMINI_API_KEY` with your API key value
3. Select all environments (Production, Preview, Development)
4. Click "Save"

### 4. Build Configuration

The project is configured with `vercel.json` which specifies:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Auto-detected (Vite)

Vercel will automatically:
- Install dependencies (`npm install`)
- Run the build command (`npm run build`)
- Deploy the `dist` directory

### 5. Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Build your application
3. Deploy to a production URL

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features | `AIza...` |

## Troubleshooting

### Build Fails

- Ensure `GEMINI_API_KEY` is set in Vercel environment variables
- Check build logs in Vercel dashboard for specific errors
- Verify Node.js version (Vercel uses Node 18.x by default)

### API Key Not Working

- Verify the environment variable name matches exactly: `GEMINI_API_KEY`
- Ensure it's enabled for the correct environment (Production/Preview)
- Redeploy after adding/changing environment variables

### Large Bundle Size Warning

The build may show a warning about large chunks (>500KB). This is expected for this application and won't prevent deployment. The bundle is optimized and compressed for production.

## Local Development

For local development, create a `.env.local` file:

```bash
GEMINI_API_KEY=your_api_key_here
```

Then run:
```bash
npm install
npm run dev
```

## Pre-Deployment Checklist

See `DEPLOYMENT_CHECKLIST.md` for a detailed checklist before deploying.

## Quick Start

**Note:** You don't need to install Vercel CLI! Deploy directly through the web interface.

1. **Get your Gemini API key**: https://aistudio.google.com/app/apikey
2. **Push code to Git**: Ensure all changes are committed and pushed
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```
3. **Import to Vercel**: Go to https://vercel.com/new and import your repo
4. **Add environment variable**: Set `GEMINI_API_KEY` in Vercel project settings
5. **Deploy**: Click deploy and wait for build to complete

### Optional: Using Vercel CLI

If you want to use the CLI (not required), see `DEPLOY_WITHOUT_CLI.md` for troubleshooting installation issues.

## Configuration Files

The project includes:
- `vercel.json` - Vercel deployment configuration
- `vite.config.ts` - Vite build configuration with env variable support
- `package.json` - Node.js version specification (18+)

## Build Optimization

The project is configured with:
- Asset caching headers for static assets
- SPA routing support (all routes redirect to index.html)
- Optimized chunk sizes (warnings suppressed for large bundles)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

