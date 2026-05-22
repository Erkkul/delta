import { describe, expect, it } from "vitest"

import { BuyerProfileUpsertInput } from "./profile"

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
