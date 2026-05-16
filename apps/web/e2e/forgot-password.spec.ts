import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E récupération de mot de passe (KAN-157). Couvre :
 *   - parcours /forgot-password → 204 → redirection /forgot-password/sent
 *   - 400 (email mal formé) → erreur de formulaire
 *   - 429 (rate-limit) → message dédié avec délai en minutes
 *   - parcours /reset-password → 200 → redirection /login?reset=ok avec toast
 *   - 401 (token invalide) → message générique anti-énumération
 *   - 429 (rate-limit reset) → message dédié
 *   - lien « Mot de passe oublié ? » de /login amène bien sur /forgot-password
 *
 * Toutes les requêtes outbound vers `/api/v1/auth/forgot-password` et
 * `/api/v1/auth/reset-password` sont mockées via `page.route()` — pas
 * de dépendance Supabase ni Upstash.
 */

const TEST_EMAIL = "test+kan157@delta.fr"
const TEST_PASSWORD = "Motdepasse2026"
const VALID_OTP = "123456"

function mockForgotApi(
  page: Page,
  scenario:
    | { kind: "success" }
    | { kind: "validation"; message: string }
    | { kind: "rate-limited"; retryAfterSeconds: number },
) {
  return page.route("**/api/v1/auth/forgot-password", async (route: Route) => {
    if (scenario.kind === "success") {
      await route.fulfill({ status: 204, body: "" })
      return
    }
    if (scenario.kind === "validation") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: scenario.message,
          code: "AUTH_VALIDATION_FAILED",
        }),
      })
      return
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "Retry-After": String(scenario.retryAfterSeconds) },
      body: JSON.stringify({
        error: "Trop de tentatives, réessayez plus tard.",
        code: "AUTH_RATE_LIMITED",
        retryAfterSeconds: scenario.retryAfterSeconds,
      }),
    })
  })
}

function mockResetApi(
  page: Page,
  scenario:
    | { kind: "success" }
    | { kind: "invalid" }
    | { kind: "rate-limited"; retryAfterSeconds: number },
) {
  return page.route("**/api/v1/auth/reset-password", async (route: Route) => {
    if (scenario.kind === "success") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "11111111-1111-4111-8111-111111111111",
        }),
      })
      return
    }
    if (scenario.kind === "invalid") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Code de récupération invalide ou expiré.",
          code: "AUTH_INVALID_RECOVERY_TOKEN",
        }),
      })
      return
    }
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "Retry-After": String(scenario.retryAfterSeconds) },
      body: JSON.stringify({
        error: "Trop de tentatives, réessayez plus tard.",
        code: "AUTH_RATE_LIMITED",
        retryAfterSeconds: scenario.retryAfterSeconds,
      }),
    })
  })
}

async function typeOtp(page: Page, code: string) {
  await page.getByTestId("reset-otp-digit-0").focus()
  await page.keyboard.type(code, { delay: 20 })
}

test.describe("KAN-157 — Forgot password", () => {
  test("204 → redirection vers /forgot-password/sent avec email", async ({
    page,
  }) => {
    await mockForgotApi(page, { kind: "success" })
    await page.goto("/forgot-password")
    await page.getByLabel("Adresse email").fill(TEST_EMAIL)
    await page.getByRole("button", { name: "Recevoir un code" }).click()
    await page.waitForURL(
      (url) =>
        url.toString().includes("/forgot-password/sent") &&
        url.toString().includes(encodeURIComponent(TEST_EMAIL)),
      { timeout: 5000 },
    )
    await expect(
      page.getByRole("heading", {
        name: "Vérifiez votre boîte mail",
        exact: true,
      }),
    ).toBeVisible()
  })

  test("validation client : email mal formé → pas d'appel API", async ({
    page,
  }) => {
    let apiCalled = false
    await page.route("**/api/v1/auth/forgot-password", async (route: Route) => {
      apiCalled = true
      await route.fulfill({ status: 204, body: "" })
    })
    await page.goto("/forgot-password")
    await page.getByLabel("Adresse email").fill("pas-un-email")
    await page.getByRole("button", { name: "Recevoir un code" }).click()
    await expect(page.getByTestId("forgot-password-error")).toBeVisible()
    expect(apiCalled).toBe(false)
  })

  test("429 rate-limit → message dédié avec délai en minutes", async ({
    page,
  }) => {
    await mockForgotApi(page, { kind: "rate-limited", retryAfterSeconds: 600 })
    await page.goto("/forgot-password")
    await page.getByLabel("Adresse email").fill(TEST_EMAIL)
    await page.getByRole("button", { name: "Recevoir un code" }).click()
    const alert = page.getByTestId("forgot-password-error")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("Trop de tentatives")
    await expect(alert).toContainText("10 minutes")
  })

  test("page /forgot-password/sent affiche un message neutre (anti-énumération)", async ({
    page,
  }) => {
    await page.goto(
      `/forgot-password/sent?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await expect(page.getByText(`Si un compte existe pour ${TEST_EMAIL}`)).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Saisir le code" }),
    ).toHaveAttribute(
      "href",
      `/reset-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await expect(
      page.getByRole("link", { name: "Renvoyer un code" }),
    ).toHaveAttribute(
      "href",
      `/forgot-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
  })
})

test.describe("KAN-157 — Reset password", () => {
  test("200 → redirection /login?reset=ok avec toast de confirmation", async ({
    page,
  }) => {
    await mockResetApi(page, { kind: "success" })
    await page.goto(
      `/reset-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, VALID_OTP)
    await page.getByLabel("Nouveau mot de passe").fill(TEST_PASSWORD)
    await page.getByTestId("reset-password-submit").click()
    await page.waitForURL((url) => url.toString().includes("/login?reset=ok"), {
      timeout: 5000,
    })
    await expect(page.getByTestId("login-notice")).toBeVisible()
    await expect(page.getByTestId("login-notice")).toContainText(
      "Mot de passe mis à jour",
    )
  })

  test("401 token invalide → message générique anti-énumération", async ({
    page,
  }) => {
    await mockResetApi(page, { kind: "invalid" })
    await page.goto(
      `/reset-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, "000000")
    await page.getByLabel("Nouveau mot de passe").fill(TEST_PASSWORD)
    await page.getByTestId("reset-password-submit").click()
    const alert = page.getByTestId("reset-password-error")
    await expect(alert).toBeVisible()
    await expect(alert).toHaveText("Code de récupération invalide ou expiré.")
  })

  test("429 rate-limit reset → message dédié avec délai", async ({ page }) => {
    await mockResetApi(page, { kind: "rate-limited", retryAfterSeconds: 180 })
    await page.goto(
      `/reset-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, VALID_OTP)
    await page.getByLabel("Nouveau mot de passe").fill(TEST_PASSWORD)
    await page.getByTestId("reset-password-submit").click()
    const alert = page.getByTestId("reset-password-error")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("3 minutes")
  })

  test("validation client : mot de passe trop court → pas d'appel API", async ({
    page,
  }) => {
    let apiCalled = false
    await page.route("**/api/v1/auth/reset-password", async (route: Route) => {
      apiCalled = true
      await route.fulfill({ status: 200, body: "{}" })
    })
    await page.goto(
      `/reset-password?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, VALID_OTP)
    await page.getByLabel("Nouveau mot de passe").fill("Aa1")
    await page.getByTestId("reset-password-submit").click()
    await expect(page.getByTestId("reset-password-error")).toBeVisible()
    expect(apiCalled).toBe(false)
  })

  test("page /reset-password sans email → écran d'erreur + lien retour", async ({
    page,
  }) => {
    await page.goto("/reset-password")
    await expect(
      page.getByRole("heading", { name: "Adresse manquante." }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Retour à la récupération" }),
    ).toHaveAttribute("href", "/forgot-password")
  })
})

test.describe("KAN-157 — Intégration au flow login", () => {
  test("lien 'Mot de passe oublié ?' de /login renvoie vers /forgot-password", async ({
    page,
  }) => {
    await page.goto("/login")
    const link = page.getByRole("link", { name: "Mot de passe oublié ?" })
    await expect(link).toHaveAttribute("href", "/forgot-password")
  })
})
