# PWA Icons Required

This folder needs two icon files for the Progressive Web App:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

These icons are used for:

- PWA installation prompts
- Home screen icons (when app is installed)
- Push notification badges
- Browser tabs

## Quick Setup with PWA Asset Generator

The easiest way to generate these icons is using [pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator), which automates the entire process.

### Installation

```bash
npm install -g pwa-asset-generator
```

Or use it directly with npx (no installation needed):

```bash
npx pwa-asset-generator <your-logo-file> ./public
```

### Basic Usage

If you have a logo file (SVG, PNG, JPEG, or WebP), run:

```bash
# Generate icons only (no splash screens)
npx pwa-asset-generator logo.svg ./public --icon-only

# Or with a PNG/JPEG logo
npx pwa-asset-generator logo.png ./public --icon-only
```

### Advanced Options

```bash
# Generate icons with custom background color
npx pwa-asset-generator logo.svg ./public --icon-only --background "#10b981"

# Generate icons with transparent background
npx pwa-asset-generator logo.svg ./public --icon-only --opaque false

# Generate icons and update manifest.json automatically
npx pwa-asset-generator logo.svg ./public --icon-only --manifest ./public/manifest.json
```

### Recommended Command

For Meant2Grow, use this command (replace `logo.svg` with your logo file):

```bash
npx pwa-asset-generator logo.svg ./public \
  --icon-only \
  --background "#10b981" \
  --manifest ./public/manifest.json \
  --favicon
```

This will:

- Generate `icon-192.png` and `icon-512.png`
- Use your brand color (#10b981) as background
- Update `manifest.json` automatically
- Generate favicon files as well

## Manual Creation

If you prefer to create icons manually:

### Icon Requirements

- **Format**: PNG
- **Sizes**: 192x192 and 512x512 pixels
- **Content**: Your app logo or brand icon
- **Background**: Can be transparent or solid color (recommended: #10b981)
- **Style**: Should work well at small sizes (for badges)

### Tools for Manual Creation

1. **PWA Asset Generator**: https://github.com/onderceylan/pwa-asset-generator (recommended)
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/
4. **ImageMagick** (command line):
   ```bash
   convert logo.png -resize 192x192 icon-192.png
   convert logo.png -resize 512x512 icon-512.png
   ```

## Best Practices

1. **Use SVG source**: If possible, start with an SVG logo - it scales perfectly
2. **Square format**: Ensure your logo works well in a square format
3. **Padding**: The tool adds 10% padding by default - adjust with `--padding` if needed
4. **High contrast**: Ensure icons are visible on both light and dark backgrounds
5. **Test on device**: Install the PWA and verify icons look good on actual devices

## Temporary Solution

Until icons are created, the app will still work but:

- Installation prompts may not show icons
- Push notifications may not have badges
- Home screen icon may be generic

The app will function normally otherwise.

## Verification

After generating icons, verify they exist:

```bash
ls -lh public/icon-*.png
```

You should see:

- `public/icon-192.png` (should be ~5-20 KB)
- `public/icon-512.png` (should be ~15-50 KB)

Then rebuild and deploy:

```bash
npm run build
firebase deploy --only hosting
```
