# Sandbox Deployment – Why Changes Don’t Show Up

## 1. **Uncommitted / unpushed changes (most common)**

Sandbox can deploy in two ways. If you use **GitHub Actions**, only **committed and pushed** code is deployed.

Your repo currently has **modified but uncommitted** files, for example:

- `App.tsx`
- `components/EnvironmentBanner.tsx`
- `components/LandingPage.tsx`
- `components/Layout.tsx`
- `components/PublicPages.tsx`

**If you deploy via push to `main` or `develop`:**

1. Commit your changes:  
   `git add -A && git commit -m "Your message"`
2. Push:  
   `git push origin main` (or `develop`)
3. Wait for the “Deploy to Sandbox” workflow to finish. Only then will those changes be on sandbox.

**If you deploy locally** with `npm run firebase:deploy:sandbox`, uncommitted changes are included in the build. So if you’re using CI, the fix is: **commit and push**.

---

## 2. **Deploying to the wrong Firebase project (local deploys)**

If you run Firebase deploy from your machine, the active project must be sandbox.

- Check:  
  `firebase use`
- Should show something like:  
  `Active Project: meant2grow-dev` (sandbox) or alias `sandbox`.
- If it shows `meant2grow-prod`, you’re deploying to production, not sandbox.

**Fix:**  
`firebase use sandbox`  
Then run:  
`npm run firebase:deploy:sandbox`  
(that script already runs `firebase use sandbox` before deploy).

---

## 3. **Only frontend changed but you didn’t deploy hosting**

If you only changed React/UI and ran something like:

- `firebase deploy --only functions`  
or  
- `firebase deploy --only firestore:rules`

then hosting (the built frontend) was not updated.

**Fix:**  
Deploy hosting as well, e.g.:

- Full sandbox deploy:  
  `npm run firebase:deploy:sandbox`  
  (builds and deploys hosting + the rest), or  
- Hosting only:  
  `npm run build:sandbox && firebase use sandbox && firebase deploy --only hosting`

---

## 4. **Browser or CDN cache**

You might be seeing an old build.

- Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux).
- Or open sandbox in an incognito/private window.
- `index.html` is set to `no-cache`; asset filenames are hashed, so a fresh deploy should load new JS/CSS once you bypass cache.

---

## Quick checklist

- [ ] Changes are **committed** (`git status` clean or only intended files staged).
- [ ] If using CI: changes are **pushed** to the branch that triggers sandbox (`main` or `develop`).
- [ ] If deploying locally: **`firebase use sandbox`** (or use `npm run firebase:deploy:sandbox`).
- [ ] You deployed **hosting** (or ran full deploy), not only functions/rules.
- [ ] Hard refresh or incognito when checking https://sandbox.meant2grow.com.
