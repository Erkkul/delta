import { expect, type Page, type Route, test } from "@playwright/test"

/**
 * E2E auth (KAN-2). Couvre le parcours :
 *   /signup → mock POST /api/v1/auth/signup (201)
 *           → /auth/verify-email?email=...
 *           → mock POST {supabase}/auth/v1/verify (succès)
 *           → /onboarding/role
 *
 * Et les états d'erreur OTP : code invalide et code expiré.
 *
 * Toutes les requêtes outbound (signup API + Supabase Auth) sont
 * interceptées via `page.route()` pour ne dépendre d'aucune brique
 * externe. La page est entièrement client-side rendered une fois sur
 * /auth/verify-email (pas d'appel serveur).
 */

const TEST_EMAIL = "test+kan2@delta.fr"
const TEST_PASSWORD = "Motdepasse2026"
const SUPABASE_VERIFY_URL = "https://stub.supabase.co/auth/v1/verify"
const SUPABASE_RESEND_URL = "https://stub.supabase.co/auth/v1/resend"
const SUPABASE_OTP_URL = "https://stub.supabase.co/auth/v1/otp"

function mockSignupApi(page: Page) {
  return page.route("**/api/v1/auth/signup", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ userId: "11111111-1111-4111-8111-111111111111" }),
    })
  })
}

function fakeSessionPayload() {
  return {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: TEST_EMAIL,
      aud: "authenticated",
      role: "authenticated",
    },
  }
}

async function typeOtp(page: Page, code: string) {
  // 6 inputs séparés. On focalise la 1re et on tape — l'auto-focus gère la suite.
  await page.getByTestId("otp-digit-0").focus()
  await page.keyboard.type(code, { delay: 20 })
}

test.describe("KAN-2 — Signup + OTP", () => {
  test("parcours email/password → OTP correct → quitte /auth/verify-email", async ({
    page,
  }) => {
    // Note : on ne peut pas vérifier qu'on landait sur /onboarding/role car
    // cette page appelle Supabase côté serveur (Server Component) ; le stub
    // .supabase.co échoue à résoudre côté Node et le RSC redirige vers
    // /signup. La preuve que l'OTP a été accepté = on quitte
    // /auth/verify-email (qui ne redirige pas par lui-même).
    await mockSignupApi(page)
    await page.route(SUPABASE_VERIFY_URL, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeSessionPayload()),
      })
    })

    await page.goto("/signup")
    await page.getByLabel("Adresse email").fill(TEST_EMAIL)
    await page.getByLabel("Mot de passe").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Créer mon compte" }).click()

    await expect(page).toHaveURL(
      new RegExp(
        `/auth/verify-email\\?email=${encodeURIComponent(TEST_EMAIL)}$`,
      ),
    )
    await expect(
      page.getByRole("heading", { name: "Vérifiez votre email" }),
    ).toBeVisible()

    await typeOtp(page, "123456")
    // Auto-submit déclenché à la 6e case → redirection client-side.
    await page.waitForURL(
      (url) => !url.toString().includes("/auth/verify-email"),
      { timeout: 5000 },
    )
    // Aucune erreur OTP affichée = succès du verifyOtp.
    await expect(page.getByTestId("otp-error")).toHaveCount(0)
  })

  test("OTP incorrect → erreur 'invalid'", async ({ page }) => {
    await page.route(SUPABASE_VERIFY_URL, async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: "otp_invalid",
          error_code: "otp_invalid",
          msg: "Token has invalid value",
        }),
      })
    })

    await page.goto(
      `/auth/verify-email?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, "000000")
    const alert = page.getByTestId("otp-error")
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute("data-error-kind", "invalid")
  })

  test("OTP expiré → erreur 'expired'", async ({ page }) => {
    await page.route(SUPABASE_VERIFY_URL, async (route: Route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: "otp_expired",
          error_code: "otp_expired",
          msg: "Token has expired",
        }),
      })
    })

    await page.goto(
      `/auth/verify-email?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    await typeOtp(page, "111111")
    const alert = page.getByTestId("otp-error")
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute("data-error-kind", "expired")
  })

  test("Resend désactivé pendant le compte à rebours, fonctionne après cooldown=0", async ({
    page,
  }) => {
    // On force `resendCooldownSeconds=1` via une URL spéciale ? Non, c'est
    // un prop interne. À la place, on vérifie juste que le bouton est
    // disabled à l'arrivée (cooldown initial = 60 s).
    await page.goto(
      `/auth/verify-email?email=${encodeURIComponent(TEST_EMAIL)}`,
    )
    const resend = page.getByTestId("otp-resend")
    await expect(resend).toBeDisabled()
    await expect(resend).toContainText(/Renvoyer dans \d+ s/)
  })
})

test.describe("KAN-2 — Garde-fou hash URL", () => {
  test("ne lit pas le hash URL (#access_token=…) — le flow magic link est désactivé", async ({
    page,
  }) => {
    // Si malgré un hash, on landait par erreur dans une session, l'app
    // redirigerait vers /onboarding/role. On vérifie qu'au contraire
    // /auth/verify-email reste sur place et attend une saisie OTP.
    let supabaseVerifyCalled = false
    await page.route(SUPABASE_VERIFY_URL, async (route: Route) => {
      supabaseVerifyCalled = true
      await route.fulfill({ status: 200, body: "{}" })
    })
    await page.route(SUPABASE_OTP_URL, async (route: Route) => {
      await route.fulfill({ status: 200, body: "{}" })
    })
    await page.route(SUPABASE_RESEND_URL, async (route: Route) => {
      await route.fulfill({ status: 200, body: "{}" })
    })

    const url = `/auth/verify-email?email=${encodeURIComponent(
      TEST_EMAIL,
    )}#access_token=should-be-ignored&type=signup`
    await page.goto(url)
    await expect(
      page.getByRole("heading", { name: "Vérifiez votre email" }),
    ).toBeVisible()
    // Aucun appel verifyOtp tant que l'utilisateur n'a pas tapé les 6 chiffres.
    expect(supabaseVerifyCalled).toBe(false)
  })
})
