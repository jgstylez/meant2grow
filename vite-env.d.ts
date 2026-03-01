/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_ENV?: "sandbox" | "production";
  /** Set to "true" to use Google Meet instead of Jitsi for live calls (dev fallback) */
  readonly VITE_USE_GOOGLE_MEET_FALLBACK?: string;
}
