import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config — Delta web E2E.
 *
 * Tests dans `apps/web/e2e/`. Tournent contre `next dev` lancé par Playwright
 * (cf. `webServer`). Env vars stub : on n'a pas besoin d'une vraie connexion
 * Supabase — toutes les requêtes vers Supabase Auth et /api/v1/auth sont
 * interceptées via `page.route()` dans chaque test.
 *
 * Lancer en local : `pnpm --filter @delta/web test:e2e`.
 *
 * Note CI : les E2E ne tournent pas sur la CI standard (cf. ARCHITECTURE.md
 * §12.1 — gated par `[e2e]` dans le titre PR ou post-merge sur main).
 */
const PORT = Number(process.env.PORT ?? 3100)
const BASE_URL = `http://127.0.0.1:${String(PORT)}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `next dev -p ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Stubs : passent la validation Zod sans toucher à un vrai Supabase.
      // Toutes les requêtes outbound sont interceptées par page.route().
      NEXT_PUBLIC_SUPABASE_URL: "https://stub.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub_for_e2e_tests",
      SUPABASE_SECRET_KEY: "sb_secret_stub_for_e2e_tests",
    },
  },
})
