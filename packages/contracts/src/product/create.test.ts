import { describe, expect, it } from "vitest"

import { ProductCreateInput } from "./create"

const VALID = {
  name: "Miel de printemps",
  category: "miel_et_ruche" as const,
  packaging: "pot_250g" as const,
  unit_price_cents: 850,
}

describe("ProductCreateInput", () => {
  it("accepte un input minimal valide", () => {
    const r = ProductCreateInput.safeParse(VALID)
    expect(r.success).toBe(true)
    if (r.success) {
      // defaults appliqués
      expect(r.data.stock).toBe(0)
      expect(r.data.status).toBe("active")
    }
  })

  it("accepte un input complet", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      description: "Récolté en avril sur 22 ruches.",
      stock: 24,
      availability_from: "2026-04-15",
      availability_to: "2026-06-30",
      labels: ["bio_ab", "demeter"],
      status: "draft",
    })
    expect(r.success).toBe(true)
  })

  it("refuse un nom vide", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, name: "" })
    expect(r.success).toBe(false)
  })

  it("refuse un nom > 120 caractères", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, name: "x".repeat(121) })
    expect(r.success).toBe(false)
  })

  it("refuse une description > 2000 caractères", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      description: "x".repeat(2001),
    })
    expect(r.success).toBe(false)
  })

  it("refuse un prix ≤ 0", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, unit_price_cents: 0 })
    expect(r.success).toBe(false)
  })

  it("refuse un prix > 100 000 cents", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      unit_price_cents: 100001,
    })
    expect(r.success).toBe(false)
  })

  it("refuse un prix non entier", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, unit_price_cents: 8.5 })
    expect(r.success).toBe(false)
  })

  it("refuse un stock négatif", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, stock: -1 })
    expect(r.success).toBe(false)
  })

  it("accepte un seuil d'alerte stock null", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      low_stock_threshold: null,
    })
    expect(r.success).toBe(true)
  })

  it("accepte un seuil d'alerte stock entier ≥ 0", () => {
    expect(
      ProductCreateInput.safeParse({ ...VALID, low_stock_threshold: 0 })
        .success,
    ).toBe(true)
    expect(
      ProductCreateInput.safeParse({ ...VALID, low_stock_threshold: 5 })
        .success,
    ).toBe(true)
  })

  it("refuse un seuil d'alerte stock négatif", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      low_stock_threshold: -1,
    })
    expect(r.success).toBe(false)
  })

  it("refuse un seuil d'alerte stock non entier", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      low_stock_threshold: 3.5,
    })
    expect(r.success).toBe(false)
  })

  it("refuse une catégorie hors enum", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      category: "alcools",
    })
    expect(r.success).toBe(false)
  })

  it("refuse un conditionnement hors enum", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      packaging: "tonneau",
    })
    expect(r.success).toBe(false)
  })

  it("refuse un statut hors enum", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, status: "archived" })
    expect(r.success).toBe(false)
  })

  it("refuse une date mal formée", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      availability_from: "15/04/2026",
    })
    expect(r.success).toBe(false)
  })

  it("refuse une fenêtre incohérente (to < from)", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      availability_from: "2026-06-30",
      availability_to: "2026-04-15",
    })
    expect(r.success).toBe(false)
  })

  it("accepte une fenêtre avec seulement une date", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      availability_from: "2026-04-15",
    })
    expect(r.success).toBe(true)
  })

  it("refuse des champs inconnus (strict)", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, foo: "bar" })
    expect(r.success).toBe(false)
  })

  it("accepte des labels de la whitelist", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      labels: ["bio_ab", "label_rouge", "producteur_fermier"],
    })
    expect(r.success).toBe(true)
  })

  it("accepte une liste de labels vide", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, labels: [] })
    expect(r.success).toBe(true)
  })

  it("refuse un label hors whitelist", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      labels: ["bio_ab", "not-a-label"],
    })
    expect(r.success).toBe(false)
  })

  it("refuse un label en texte libre (ancien format)", () => {
    const r = ProductCreateInput.safeParse({ ...VALID, labels: ["Bio AB"] })
    expect(r.success).toBe(false)
  })

  it("refuse plus de 10 labels", () => {
    const r = ProductCreateInput.safeParse({
      ...VALID,
      labels: Array.from({ length: 11 }, () => "bio_ab"),
    })
    expect(r.success).toBe(false)
  })
})
