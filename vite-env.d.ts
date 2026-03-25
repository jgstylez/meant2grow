/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_ENV?: "sandbox" | "production";
  /** When "true", dev uses Functions emulator URLs instead of /api/functions proxy */
  readonly VITE_FUNCTIONS_USE_EMULATOR?: string;
}
