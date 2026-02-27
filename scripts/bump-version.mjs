#!/usr/bin/env node
/**
 * Bumps the build version for sandbox or production.
 * Run before build: NODE_ENV=sandbox node scripts/bump-version.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionPath = path.resolve(__dirname, "../version.json");

const nodeEnv = process.env.NODE_ENV || "development";
const env = nodeEnv === "sandbox" ? "sandbox" : nodeEnv === "production" ? "production" : null;

if (!env) {
  try {
    const data = JSON.parse(readFileSync(versionPath, "utf-8"));
    const v = data.sandbox ?? 0;
    process.stdout.write(`1.0.${v}`);
  } catch {
    process.stdout.write("1.0.0");
  }
  process.exit(0);
}

try {
  const data = JSON.parse(readFileSync(versionPath, "utf-8"));
  const current = Number(data[env]) || 0;
  const next = current + 1;
  data[env] = next;
  writeFileSync(versionPath, JSON.stringify(data, null, 2) + "\n");
  process.stdout.write(`1.0.${next}`);
} catch (err) {
  console.error("Failed to bump version:", err);
  process.exit(1);
}
