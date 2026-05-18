import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E historique ventes producteur (KAN-19 — PR-07).
 *
 * Couverture limitée au MVP, alignée sur producer-dashboard.spec.ts :
 * on teste le gating layout (`/producer/sales` accessible uniquement à
 * un user authentifié avec rôle `producteur` et row `producers` existante).
 * Les scénarios « logged-in » nécessitent un harnais de fixtures complet
 * qui dépasse le scope de cette feature — différé.
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

test.describe("Producer sales — gating layout", () => {
  test("redirige un visiteur non-authentifié de /producer/sales vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer/sales")
    await expect(page).toHaveURL(/\/welcome$/)
  })
})
