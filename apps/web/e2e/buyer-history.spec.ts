import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E historique commandes acheteur (KAN-27 — AC-09).
 *
 * Couverture limitée au MVP, alignée sur producer-sales.spec.ts : on
 * teste le gating de la page autonome (`/acheteur/historique` accessible
 * uniquement à un user authentifié avec rôle `acheteur`). Les scénarios
 * « logged-in » nécessitent un harnais de fixtures complet qui dépasse le
 * scope de cette feature — différé, cohérent avec KAN-19 / KAN-25.
 */

function mockSupabaseUnauthenticated(page: Page) {
  return page.route("**/auth/v1/**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/auth/v1/user")) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: 401,
          msg: "missing session",
        }),
      })
      return
    }
    await route.continue()
  })
}

test.describe("Buyer history — gating page", () => {
  test("redirige un visiteur non-authentifié de /acheteur/historique vers /login", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/acheteur/historique")
    await expect(page).toHaveURL(/\/login$/)
  })
})
