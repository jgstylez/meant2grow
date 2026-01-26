import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { getErrorCode } from "./utils/errors";
import { config } from "dotenv";

export default defineConfig(({ mode }) => {
  // Determine environment from NODE_ENV or mode
  // NODE_ENV can be: development, sandbox, production
  // mode is typically: development, production
  const nodeEnv = process.env.NODE_ENV || mode;
  const isSandbox = nodeEnv === "sandbox";
  const isProduction = nodeEnv === "production" && !isSandbox;

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
      ...process.env, // CI/CD environment variables take precedence
    };
  } else {
    // For production/development, use Vite's standard loadEnv
    env = {
      ...loadEnv(mode, process.cwd(), ""),
      ...process.env, // CI/CD environment variables take precedence
    };
  }

  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      // Plugin to inject environment variables into service worker
      {
        name: "inject-service-worker-env",
        buildStart() {
          // This will run during build
        },
        writeBundle() {
          // After build, replace placeholders in service worker with actual values
          const swPath = path.resolve(
            __dirname,
            "dist/firebase-messaging-sw.js",
          );
          try {
            // Check if service worker file exists
            if (!require("fs").existsSync(swPath)) {
              console.error("❌ Service worker file not found in dist folder!");
              console.error("   Expected location:", swPath);
              console.error(
                "   Make sure public/firebase-messaging-sw.js exists and is being copied during build.",
              );
              return;
            }

            let swContent = readFileSync(swPath, "utf-8");

            // Replace placeholders with actual environment variables
            swContent = swContent.replace(
              "{{VITE_FIREBASE_API_KEY}}",
              env.VITE_FIREBASE_API_KEY || "",
            );
            swContent = swContent.replace(
              "{{VITE_FIREBASE_AUTH_DOMAIN}}",
              env.VITE_FIREBASE_AUTH_DOMAIN || "",
            );
            swContent = swContent.replace(
              "{{VITE_FIREBASE_PROJECT_ID}}",
              env.VITE_FIREBASE_PROJECT_ID || "",
            );
            swContent = swContent.replace(
              "{{VITE_FIREBASE_STORAGE_BUCKET}}",
              env.VITE_FIREBASE_STORAGE_BUCKET || "",
            );
            swContent = swContent.replace(
              "{{VITE_FIREBASE_MESSAGING_SENDER_ID}}",
              env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
            );
            swContent = swContent.replace(
              "{{VITE_FIREBASE_APP_ID}}",
              env.VITE_FIREBASE_APP_ID || "",
            );

            writeFileSync(swPath, swContent, "utf-8");
            console.log(
              "✅ Service worker file updated with environment variables",
            );
          } catch (error: unknown) {
            console.error(
              "❌ Could not update service worker with environment variables:",
              error,
            );
            const errorCode = getErrorCode(error);
            if (errorCode === "ENOENT") {
              console.error(
                "   Service worker file not found. Ensure public/firebase-messaging-sw.js exists.",
              );
            }
          }
        },
      },
    ],
    define: {
      // Note: Gemini API key is now stored securely in Firebase Functions secrets
      // No longer exposed in client bundle
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
        external: [
          // mailersend is only used server-side via dynamic imports
          // Externalize it to prevent build errors
          "mailersend",
        ],
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
