import { defineConfig } from "vitest/config"

/**
 * Preset Vitest partagé.
 *
 *   // packages/<pkg>/vitest.config.ts
 *   import baseConfig from "@delta/config/vitest/base"
 *   export default baseConfig
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "dist/**", "node_modules/**"],
    },
  },
})
