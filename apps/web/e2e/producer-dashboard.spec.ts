import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E dashboard producteur (KAN-18 — PR-03).
 *
 * Couverture limitée au MVP : on teste le gating layout (`/producer/*`
 * accessible uniquement à un user authentifié avec rôle `producteur` et
 * row `producers` existante). Les scénarios « logged-in » nécessitent un
 * harnais de fixtures producteur complet (cookies session + mocks
 * PostgREST sur public.users / public.producers) qui dépasse le scope
 * de cette feature — différé.
 *
 * Toutes les requêtes outbound vers Supabase sont interceptées pour
 * que l'écran serveur voie systématiquement « pas de session » et
 * redirige.
 */

const SUPABASE_USER_URL = "https://stub.supabase.co/auth/v1/user"

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

test.describe("Producer dashboard — gating layout", () => {
  test("redirige un visiteur non-authentifié de /producer vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer")
    await expect(page).toHaveURL(/\/welcome$/)
  })

  test("redirige un visiteur non-authentifié de /producer/profile vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer/profile")
    await expect(page).toHaveURL(/\/welcome$/)
  })

  test("redirige un visiteur non-authentifié de /producer/settings vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer/settings")
    await expect(page).toHaveURL(/\/welcome$/)
  })
})

// L'URL ci-dessous est référencée uniquement pour documenter la cible du
// mock — pas d'usage direct dans les assertions, on filtre par pattern.
void SUPABASE_USER_URL
