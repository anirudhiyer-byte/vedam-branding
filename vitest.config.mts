import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Keeps NODE_ENV-dependent behaviour (log levels, cookie `secure` flag)
    // deterministic regardless of the shell the suite is run from.
    env: { NODE_ENV: "test" },
  },
});
