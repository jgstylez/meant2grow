import path from "path";
import { readFileSync } from "fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { config } from "dotenv";

export default defineConfig(({ mode, command }) => {
  // Determine environment from NODE_ENV or mode
  // NODE_ENV can be: development, sandbox, production
  // mode is typically: development, production
  const nodeEnv = process.env.NODE_ENV || mode;
  const isSandbox = nodeEnv === "sandbox";

  // Read version from version.json (bumped by prebuild script)
  let appVersion = "1.0.0";
  const appEnv: "sandbox" | "production" = isSandbox ? "sandbox" : "production";
  try {
    const versionData = JSON.parse(
      readFileSync(path.resolve(__dirname, "version.json"), "utf-8")
    );
    const buildNum = versionData[appEnv] ?? 0;
    appVersion = `1.0.${buildNum}`;
  } catch {
    // Use default if version.json missing
  }

  // Load environment variables from .env files (local) or CI/CD environment
  // Priority: process.env (CI/CD) > .env files (local)
  // Handle sandbox explicitly since Vite doesn't recognize it as a standard mode
  let env: Record<string, string> = {};

  if (isSandbox) {
    // For sandbox, explicitly load .env.sandbox
    // Load base .env first, then sandbox-specific
    const baseEnv = loadEnv("development", process.cwd(), "");
    const sandboxEnvResult = config({ path: ".env.sandbox" });
    const sandboxEnv = sandboxEnvResult.parsed || {};

    env = {
      ...baseEnv,
      ...sandboxEnv,
      ...(process.env as Record<string, string>), // CI/CD overrides
    };
  } else {
    // For production/development, use Vite's standard loadEnv
    env = {
      ...loadEnv(mode, process.cwd(), ""),
      ...(process.env as Record<string, string>),
    };
  }

  const functionsProjectId = env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
  const defaultFunctionsBase = `https://us-central1-${functionsProjectId}.cloudfunctions.net`;
  /** Dev server only: where `/api/functions/*` is forwarded. Must not be Firebase Hosting/site URL — unknown paths return SPA HTML and break JSON (e.g. videoCallSession). */
  const functionsProxyTarget = (() => {
    const raw = (env.VITE_FUNCTIONS_URL || "").trim().replace(/\/$/, "");
    if (!raw) return defaultFunctionsBase;
    try {
      const host = new URL(raw).hostname;
      if (host.endsWith(".cloudfunctions.net")) return raw;
      if (host === "localhost" || host === "127.0.0.1") return raw;
    } catch {
      /* ignore invalid URL */
    }
    console.warn(
      `[vite] VITE_FUNCTIONS_URL (${raw}) is not a Cloud Functions host; proxying /api/functions to ${defaultFunctionsBase} instead.`,
    );
    return defaultFunctionsBase;
  })();

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      // Proxy Cloud Functions whenever the dev/preview server runs (not only mode=development),
      // so /api/functions/* is never a 404 from Vite when using custom modes or NODE_ENV.
      ...(command === "serve"
        ? {
            proxy: {
              "/api/functions": {
                target: functionsProxyTarget,
                changeOrigin: true,
                secure: true,
                rewrite: (p: string) => p.replace(/^\/api\/functions/, ""),
              },
            },
          }
        : {}),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "firebase-messaging-sw.js",
        // manifest.json is automatically detected from public directory
        registerType: "autoUpdate",
        devOptions: {
          enabled: false, // Disable service worker in dev mode
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    define: {
      // Note: Gemini API key is now stored securely in Firebase Functions secrets
      // No longer exposed in client bundle
      // Firebase environment variables for service worker (preserves sandbox/production logic)
      "import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(
        env.VITE_FIREBASE_API_KEY || "",
      ),
      "import.meta.env.VITE_FIREBASE_AUTH_DOMAIN": JSON.stringify(
        env.VITE_FIREBASE_AUTH_DOMAIN || "",
      ),
      "import.meta.env.VITE_FIREBASE_PROJECT_ID": JSON.stringify(
        env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev",
      ),
      "import.meta.env.VITE_FIREBASE_STORAGE_BUCKET": JSON.stringify(
        env.VITE_FIREBASE_STORAGE_BUCKET || "",
      ),
      "import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
        env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      ),
      "import.meta.env.VITE_FIREBASE_APP_ID": JSON.stringify(
        env.VITE_FIREBASE_APP_ID || "",
      ),
      // Always derive HTTPS function base from project id (us-central1). No GitHub secret or
      // .env value is required; setting VITE_FUNCTIONS_URL to a Hosting URL breaks videoCallSession.
      "import.meta.env.VITE_FUNCTIONS_URL": JSON.stringify(
        `https://us-central1-${functionsProjectId}.cloudfunctions.net`,
      ),
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
      "import.meta.env.VITE_APP_ENV": JSON.stringify(appEnv),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // React and core dependencies
            "react-vendor": ["react", "react-dom"],
            // Firebase services
            firebase: [
              "firebase/app",
              "firebase/firestore",
              "firebase/auth",
              "firebase/storage",
            ],
            // Chart library
            charts: ["recharts"],
            // Icons
            icons: ["lucide-react"],
            // Google services
            "google-services": ["googleapis"],
            // Heavy components
            chat: ["./components/Chat"],
            dashboard: ["./components/Dashboard"],
            settings: ["./components/SettingsView"],
          },
        },
      },
    },
    publicDir: "public",
  };
});
