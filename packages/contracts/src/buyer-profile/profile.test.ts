import { describe, expect, it } from "vitest"

import { BuyerCategoriesInput, BuyerProfileUpsertInput } from "./profile"

describe("BuyerProfileUpsertInput", () => {
  it("accepte une adresse seule (nom et coords facultatifs)", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      address_label: "14 rue de Lévis 75017 Paris",
    })
    expect(r.success).toBe(true)
  })

  it("accepte un payload complet", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      display_name: "Marie Dubois",
      address_label: "14 rue de Lévis 75017 Paris",
      city: "Paris",
      postcode: "75017",
      longitude: 2.31,
      latitude: 48.88,
    })
    expect(r.success).toBe(true)
  })

  it("rejette une adresse trop courte", () => {
    const r = BuyerProfileUpsertInput.safeParse({ address_label: "abc" })
    expect(r.success).toBe(false)
  })

  it("rejette un code postal mal formé", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      address_label: "14 rue de Lévis 75017 Paris",
      postcode: "7501",
    })
    expect(r.success).toBe(false)
  })

  it("rejette une coordonnée seule (longitude sans latitude)", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      address_label: "14 rue de Lévis 75017 Paris",
      longitude: 2.31,
    })
    expect(r.success).toBe(false)
  })

  it("rejette une clé inconnue (strict)", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      address_label: "14 rue de Lévis 75017 Paris",
      foo: "bar",
    })
    expect(r.success).toBe(false)
  })

  it("rejette un nom trop court", () => {
    const r = BuyerProfileUpsertInput.safeParse({
      address_label: "14 rue de Lévis 75017 Paris",
      display_name: "M",
    })
    expect(r.success).toBe(false)
  })
})

describe("BuyerCategoriesInput", () => {
  it("accepte un sous-ensemble de catégories whitelistées", () => {
    const r = BuyerCategoriesInput.safeParse({
      preferred_categories: ["fruits", "legumes", "miel_et_ruche"],
    })
    expect(r.success).toBe(true)
  })

  it("accepte une liste vide", () => {
    const r = BuyerCategoriesInput.safeParse({ preferred_categories: [] })
    expect(r.success).toBe(true)
  })

  it("rejette une catégorie hors whitelist", () => {
    const r = BuyerCategoriesInput.safeParse({
      preferred_categories: ["fromage_frais"],
    })
    expect(r.success).toBe(false)
  })

  it("rejette plus de 8 catégories", () => {
    const r = BuyerCategoriesInput.safeParse({
      preferred_categories: [
        "miel_et_ruche",
        "fruits",
        "legumes",
        "cereales_legumineuses",
        "conserves_confitures",
        "pain_biscuits",
        "huiles",
        "boissons_non_alcoolisees",
        "fruits",
      ],
    })
    expect(r.success).toBe(false)
  })

  it("rejette une clé inconnue (strict)", () => {
    const r = BuyerCategoriesInput.safeParse({
      preferred_categories: ["fruits"],
      foo: "bar",
    })
    expect(r.success).toBe(false)
  })
})
