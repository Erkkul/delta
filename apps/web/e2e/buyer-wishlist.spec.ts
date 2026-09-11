import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E wishlist privée acheteur (KAN-30 — AC-06).
 *
 * Couverture limitée au MVP, alignée sur buyer-history.spec.ts : on teste le
 * gating de la page (`/acheteur/envies` accessible uniquement à un user
 * authentifié avec rôle `acheteur`). Les scénarios « logged-in » (ajout /
 * retrait / plafond) nécessitent un harnais de fixtures complet qui dépasse le
 * scope de cette feature — différé, cohérent avec KAN-25 / KAN-27 / KAN-28.
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

test.describe("Buyer wishlist — gating page", () => {
  test("redirige un visiteur non-authentifié de /acheteur/envies vers /login", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/acheteur/envies")
    await expect(page).toHaveURL(/\/login$/)
  })
})
