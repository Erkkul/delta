import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E catalogue producteur (KAN-20 — PR-04 / PR-05).
 *
 * Couverture MVP : gating layout uniquement (toutes les routes
 * `/producer/catalogue*` redirigent un visiteur non-authentifié vers
 * `/welcome`).
 *
 * Les scénarios « logged-in » suivants sont posés en `.skip` avec un
 * TODO clair — cohérent avec KAN-17 et KAN-18 (les fixtures auth
 * producteur ne sont pas encore disponibles : cookies session + mocks
 * PostgREST sur public.users / public.producers / public.products) :
 *
 *   1. Création d'un produit (POST /api/v1/producer/products)
 *   2. Édition d'un produit existant (PATCH /api/v1/producer/products/[id])
 *   3. Suppression d'un produit (DELETE → confirmation modale)
 *   4. Filtres tabs (Tous / Actifs / Brouillons / Désactivés)
 *   5. Recherche FTS sur le nom
 *
 * Ces scénarios seront activés quand le harnais de fixtures producteur
 * sera livré (post-MVP, cf. ARCHITECTURE §10).
 */

function mockSupabaseUnauthenticated(page: Page) {
  return page.route("**/auth/v1/**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/auth/v1/user")) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: 401, msg: "missing session" }),
      })
      return
    }
    await route.continue()
  })
}

test.describe("Producer catalogue — gating layout", () => {
  test("redirige un visiteur non-authentifié de /producer/catalogue vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer/catalogue")
    await expect(page).toHaveURL(/\/welcome$/)
  })

  test("redirige un visiteur non-authentifié de /producer/catalogue/nouveau vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto("/producer/catalogue/nouveau")
    await expect(page).toHaveURL(/\/welcome$/)
  })

  test("redirige un visiteur non-authentifié de /producer/catalogue/[id] vers /welcome", async ({
    page,
  }) => {
    await mockSupabaseUnauthenticated(page)
    await page.goto(
      "/producer/catalogue/00000000-0000-0000-0000-000000000001",
    )
    await expect(page).toHaveURL(/\/welcome$/)
  })
})

test.describe.skip("Producer catalogue — logged-in scenarios", () => {
  // TODO(KAN-20) : activer ces scénarios quand le harnais de fixtures
  // producteur sera disponible (cookies session producteur + mocks
  // PostgREST sur public.users / public.producers / public.products).
  // Cohérent avec KAN-17 / KAN-18 qui ont également différé leurs
  // scénarios logged-in pour la même raison.

  test("créer un nouveau produit depuis le formulaire", () => {})
  test("éditer le prix d'un produit existant et persister", () => {})
  test("supprimer un produit via la modale de confirmation", () => {})
  test("filtrer par statut via les tabs", () => {})
  test("rechercher un produit via la barre de recherche FTS", () => {})
})
