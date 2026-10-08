import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Hermetic test environment: clear provider keys, disable live network, use mock data
    env: {
      DEMO_MODE: "false",
      DATA_SOURCE: "mock",
      OPENAI_API_KEY: "",
      DEEPSEEK_API_KEY: "",
      AI_API_KEY: "",
      CUSTOM_AI_API_KEY: "",
      LANGFUSE_PUBLIC_KEY: "",
      LANGFUSE_SECRET_KEY: "",
      LANGFUSE_BASE_URL: "",
      LANGFUSE_BASEURL: "",
      LANGFUSE_HOST: "",
      OPENAI_BASE_URL: "",
      DEEPSEEK_BASE_URL: "",
      AI_BASE_URL: "",
      DATABASE_URL: "",
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
