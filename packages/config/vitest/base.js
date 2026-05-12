// @ts-check
import { defineConfig } from "vitest/config"

/**
 * Preset Vitest partagé. À étendre dans `packages/<pkg>/vitest.config.ts` :
 *
 *   import baseConfig from "@delta/config/vitest/base"
 *   export default baseConfig
 *
 * Note : ce fichier est en `.js` (pas `.ts`) pour rester résolvable par Vitest
 * en CI Node 20 sans loader TS additionnel. Cf. PR #2 (CI rouge sur l'import
 * `.ts` depuis vitest.config.ts).
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
