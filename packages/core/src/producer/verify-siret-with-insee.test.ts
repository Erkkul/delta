import { describe, expect, it, vi } from "vitest"

import { type Producer } from "./adapters"
import {
  matchesLegalName,
  verifySiretWithInsee,
} from "./verify-siret-with-insee"

const PRODUCER_ID = "producer-1"
const USER_ID = "user-1"

function pendingProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: PRODUCER_ID,
    user_id: USER_ID,
    siret: "78945612300012",
    legal_name: "EARL Marie Dubois — Maraîchage du Bocage",
    legal_form: "EARL",
    naf_code: "01.13Z",
    siret_status: "pending",
    siret_verified_at: null,
    siret_rejection_reason: null,
    stripe_account_id: null,
    stripe_status: "not_created",
    payouts_enabled: false,
    charges_enabled: false,
    requirements_currently_due: [],
    ...overrides,
  }
}

describe("matchesLegalName (fuzzy)", () => {
  it("match exact insensible à la casse + accents", () => {
    expect(
      matchesLegalName(
        "EARL Marie Dubois — Maraîchage du Bocage",
        "Earl marie dubois - maraichage du bocage",
      ),
    ).toBe(true)
  })

  it("match si l'INSEE renvoie une forme plus courte (inclusion)", () => {
    expect(
      matchesLegalName(
        "EARL Marie Dubois — Maraîchage du Bocage",
        "Marie Dubois Maraichage du Bocage",
      ),
    ).toBe(true)
  })

  it("match en ignorant la forme juridique (EARL, SARL, etc.)", () => {
    expect(
      matchesLegalName("EARL Maraîchage du Bocage", "Maraichage du Bocage"),
    ).toBe(true)
    expect(
      matchesLegalName("Maraîchage du Bocage", "SARL Maraichage du Bocage"),
    ).toBe(true)
  })

  it("rejette une dénomination totalement différente", () => {
    expect(
      matchesLegalName("Maraîchage du Bocage", "Pâtisserie du Centre"),
    ).toBe(false)
  })

  it("rejette des chaînes vides", () => {
    expect(matchesLegalName("", "Pâtisserie")).toBe(false)
    expect(matchesLegalName("Pâtisserie", "")).toBe(false)
  })
})

describe("verifySiretWithInsee", () => {
  it("verifie quand la dénomination Sirene correspond", async () => {
    const setSiretVerificationResult = vi.fn().mockResolvedValue(
      pendingProducer({ siret_status: "verified" }),
    )
    await verifySiretWithInsee(PRODUCER_ID, {
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi.fn(),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult,
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      // Méthode `findById` non listée dans ProducerAdapter — exposée par cast
      // typé côté use case (cf. verify-siret-with-insee.ts).
      findById: vi.fn().mockResolvedValue(pendingProducer()),
      fetchSiretRecord: vi.fn().mockResolvedValue({
        siret: "78945612300012",
        legal_name_official: "EARL Marie Dubois Maraichage du Bocage",
      }),
    } as never)
    expect(setSiretVerificationResult).toHaveBeenCalledWith(PRODUCER_ID, {
      status: "verified",
    })
  })

  it("rejette quand la dénomination ne correspond pas", async () => {
    const setSiretVerificationResult = vi.fn().mockResolvedValue(
      pendingProducer({ siret_status: "rejected" }),
    )
    await verifySiretWithInsee(PRODUCER_ID, {
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi.fn(),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult,
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      findById: vi.fn().mockResolvedValue(pendingProducer()),
      fetchSiretRecord: vi.fn().mockResolvedValue({
        siret: "78945612300012",
        legal_name_official: "Patisserie du Centre",
      }),
    } as never)
    expect(setSiretVerificationResult).toHaveBeenCalledWith(
      PRODUCER_ID,
      expect.objectContaining({ status: "rejected" }),
    )
  })

  it("rejette quand le SIRET n'existe pas dans Sirene (404)", async () => {
    const setSiretVerificationResult = vi.fn().mockResolvedValue(
      pendingProducer({ siret_status: "rejected" }),
    )
    await verifySiretWithInsee(PRODUCER_ID, {
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi.fn(),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult,
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      findById: vi.fn().mockResolvedValue(pendingProducer()),
      fetchSiretRecord: vi.fn().mockResolvedValue(null),
    } as never)
    expect(setSiretVerificationResult).toHaveBeenCalledWith(PRODUCER_ID, {
      status: "rejected",
      reason: "SIRET introuvable dans la base Sirene.",
    })
  })

  it("est idempotent : skip si statut != pending", async () => {
    const setSiretVerificationResult = vi.fn()
    const fetchSiretRecord = vi.fn()
    await verifySiretWithInsee(PRODUCER_ID, {
      findByUserId: vi.fn(),
      findByStripeAccountId: vi.fn(),
      ensureForUser: vi.fn(),
      updateSiretDeclaration: vi.fn(),
      setSiretVerificationResult,
      setStripeAccount: vi.fn(),
      applyStripeAccountUpdate: vi.fn(),
      findById: vi
        .fn()
        .mockResolvedValue(pendingProducer({ siret_status: "verified" })),
      fetchSiretRecord,
    } as never)
    expect(setSiretVerificationResult).not.toHaveBeenCalled()
    expect(fetchSiretRecord).not.toHaveBeenCalled()
  })

  it("propage l'erreur si Sirene est down (retry Inngest)", async () => {
    await expect(
      verifySiretWithInsee(PRODUCER_ID, {
        findByUserId: vi.fn(),
        findByStripeAccountId: vi.fn(),
        ensureForUser: vi.fn(),
        updateSiretDeclaration: vi.fn(),
        setSiretVerificationResult: vi.fn(),
        setStripeAccount: vi.fn(),
        applyStripeAccountUpdate: vi.fn(),
        findById: vi.fn().mockResolvedValue(pendingProducer()),
        fetchSiretRecord: vi.fn().mockRejectedValue(new Error("INSEE 503")),
      } as never),
    ).rejects.toThrow("INSEE 503")
  })
})
