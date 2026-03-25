import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".firebase/**",
      "functions/lib/**",
      "**/.eslintrc.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["functions/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ...react.configs.flat["jsx-runtime"],
    files: ["**/*.{tsx,jsx}"],
    ignores: ["functions/**"],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.flat["jsx-runtime"].rules,
      "react/prop-types": "off",
    },
  },
  {
    ...reactHooks.configs.flat["recommended-latest"],
    files: ["**/*.{ts,tsx}"],
    ignores: ["functions/**"],
  },
  {
    files: ["**/*.{tsx,jsx}"],
    ignores: ["functions/**"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: [
      "vite.config.ts",
      "scripts/**/*.ts",
      "scripts/**/*.mjs",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["src/firebase-messaging-sw.js"],
    languageOptions: {
      globals: globals.serviceworker,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
  },
  {
    files: ["functions/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      globals: globals.node,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
    },
    rules: {
      "no-undef": "off", // TypeScript handles this
      "no-case-declarations": "off", // allow `const`/`let` in `switch` cases
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
        },
      ],
      // Controlled inputs syncing external `value` to local search state; queueMicrotask refactors are optional.
      "react-hooks/set-state-in-effect": "off",
      // Inline modal/UI subcomponents in large files are valid React; Compiler rule is overly strict.
      "react-hooks/static-components": "off",
      "react-hooks/purity": "error",
      "react-hooks/rules-of-hooks": "error",
      // Re-enable as "warn" or "error" after stabilizing dependency arrays in Chat/Dashboard/forms.
      "react-hooks/exhaustive-deps": "off",
    },
  }
);
