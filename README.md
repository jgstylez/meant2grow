<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hd7rOX_UAE-OgOqPv6ytJiAjSLc5ltVK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Quality checks

- **`npm run lint`** — ESLint (TypeScript, React, React Hooks, unused imports).
- **`npm run lint:fix`** — Same as above with safe auto-fixes (e.g. remove unused imports).
- **`npx tsc --noEmit`** — TypeScript typecheck (root app; Firebase `functions/` uses its own `tsconfig`).

CI runs `npm run lint` and `npm run build` on every push and pull request (see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
# meant2grow
