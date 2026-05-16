import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E login (KAN-3). Couvre :
 *   - parcours /login email/password → 200 → redirection /onboarding/role
 *     ou onboarding du rôle prioritaire
 *   - erreur 401 → message générique
 *   - anti-énumération : email inconnu et mauvais mdp affichent le MÊME
 *     message à la lettre près
 *   - rate-limit 429 → message dédié avec délai
 *
 * Toutes les requêtes outbound vers `/api/v1/auth/login` sont mockées
 * via `page.route()` — pas de dépendance Supabase ni Upstash.
 */

const TEST_EMAIL = "test+kan3@delta.fr"
const TEST_PASSWORD = "Motdepasse2026"

function mockLoginApi(
  page: Page,
  scenario:
    | { kind: "success"; roles: string[] }
    | { kind: "invalid" }
    | { kind: "rate-limited"; retryAfterSeconds: number },
) {
  return page.route("**/api/v1/auth/login", async (route: Route) => {
    if (scenario.kind === "success") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "11111111-1111-4111-8111-111111111111",
          roles: scenario.roles,
        }),
      })
      return
    }
    if (scenario.kind === "invalid") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Identifiants invalides.",
          code: "AUTH_INVALID_CREDENTIALS",
        }),
      })
      return
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "Retry-After": String(scenario.retryAfterSeconds) },
      body: JSON.stringify({
        error: "Trop de tentatives, réessayez dans quelques minutes.",
        code: "AUTH_RATE_LIMITED",
        retryAfterSeconds: scenario.retryAfterSeconds,
      }),
    })
  })
}

async function fillAndSubmit(page: Page, email: string, password: string) {
  await page.getByLabel("Adresse email").fill(email)
  await page.getByLabel("Mot de passe").fill(password)
  await page.getByRole("button", { name: "Se connecter" }).click()
}

test.describe("KAN-3 — Login", () => {
  test("login email/password OK → redirection vers /onboarding/role si pas de rôle", async ({
    page,
  }) => {
    await mockLoginApi(page, { kind: "success", roles: [] })
    await page.goto("/login")
    await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD)
    await page.waitForURL(
      (url) => url.toString().includes("/onboarding/role"),
      { timeout: 5000 },
    )
  })

  test("login OK → redirige vers l'onboarding du rôle prioritaire (rameneur)", async ({
    page,
  }) => {
    // Priorité (cf. packages/core/src/auth/role.ts) :
    // rameneur > producteur > acheteur. Avec ces 3 rôles, on attend
    // /onboarding/rameneur.
    await mockLoginApi(page, {
      kind: "success",
      roles: ["acheteur", "rameneur", "producteur"],
    })
    await page.goto("/login")
    await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD)
    await page.waitForURL(
      (url) => url.toString().includes("/onboarding/rameneur"),
      { timeout: 5000 },
    )
  })

  test("login KO → message d'erreur générique 'Identifiants invalides.'", async ({
    page,
  }) => {
    await mockLoginApi(page, { kind: "invalid" })
    await page.goto("/login")
    await fillAndSubmit(page, TEST_EMAIL, "mauvais-mdp")
    const alert = page.getByTestId("login-error")
    await expect(alert).toBeVisible()
    await expect(alert).toHaveText("Identifiants invalides.")
  })

  test("anti-énumération : email inconnu et mauvais mdp affichent le MÊME message", async ({
    page,
  }) => {
    await mockLoginApi(page, { kind: "invalid" })

    await page.goto("/login")
    await fillAndSubmit(page, "inconnu@example.fr", "n-importe-quoi")
    const unknownMsg = await page.getByTestId("login-error").textContent()

    await page.reload()
    await fillAndSubmit(page, TEST_EMAIL, "mauvais-mdp")
    const wrongPwdMsg = await page.getByTestId("login-error").textContent()

    expect(unknownMsg).toBe(wrongPwdMsg)
    expect(unknownMsg).toBe("Identifiants invalides.")
  })

  test("rate-limit 429 → message dédié avec délai en minutes", async ({
    page,
  }) => {
    await mockLoginApi(page, { kind: "rate-limited", retryAfterSeconds: 180 })
    await page.goto("/login")
    await fillAndSubmit(page, TEST_EMAIL, TEST_PASSWORD)
    const alert = page.getByTestId("login-error")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("Trop de tentatives")
    await expect(alert).toContainText("3 minutes")
  })

  test("validation client : email mal formé → pas d'appel API", async ({
    page,
  }) => {
    let apiCalled = false
    await page.route("**/api/v1/auth/login", async (route: Route) => {
      apiCalled = true
      await route.fulfill({ status: 200, body: "{}" })
    })
    await page.goto("/login")
    await fillAndSubmit(page, "pas-un-email", "qwertyuiop")
    await expect(page.getByTestId("login-error")).toBeVisible()
    expect(apiCalled).toBe(false)
  })
})
