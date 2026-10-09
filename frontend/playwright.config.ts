import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";

// Node-side test credentials only; never use a VITE_ prefix or import this into React.
const privateTestEnvironment = loadEnv("development", process.cwd(), "E2E_");
for (const name of ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"])
  if (!process.env[name] && privateTestEnvironment[name]) process.env[name] = privateTestEnvironment[name];

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: { baseURL: "http://127.0.0.1:5175", headless: true },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort --mode test",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
  },
});
