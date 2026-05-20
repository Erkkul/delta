import { describe, expect, it } from "vitest"

import { ProductUpdateInput } from "./update"

describe("ProductUpdateInput", () => {
  it("accepte un patch vide", () => {
    expect(ProductUpdateInput.safeParse({}).success).toBe(true)
  })

  it("accepte un patch partiel sur un seul champ", () => {
    expect(
      ProductUpdateInput.safeParse({ unit_price_cents: 950 }).success,
    ).toBe(true)
  })

  it("accepte la suppression de la description via null", () => {
    expect(
      ProductUpdateInput.safeParse({ description: null }).success,
    ).toBe(true)
  })

  it("accepte la suppression de la fenêtre via null", () => {
    expect(
      ProductUpdateInput.safeParse({
        availability_from: null,
        availability_to: null,
      }).success,
    ).toBe(true)
  })

  it("accepte des labels de la whitelist", () => {
    expect(
      ProductUpdateInput.safeParse({ labels: ["bio_ab", "demeter"] }).success,
    ).toBe(true)
  })

  it("accepte la réinitialisation des labels via []", () => {
    expect(ProductUpdateInput.safeParse({ labels: [] }).success).toBe(true)
  })

  it("refuse un label hors whitelist", () => {
    expect(
      ProductUpdateInput.safeParse({ labels: ["not-a-label"] }).success,
    ).toBe(false)
  })

  it("refuse un nom vide", () => {
    expect(ProductUpdateInput.safeParse({ name: "" }).success).toBe(false)
  })

  it("refuse un nom > 120 caractères", () => {
    expect(
      ProductUpdateInput.safeParse({ name: "x".repeat(121) }).success,
    ).toBe(false)
  })

  it("refuse un prix ≤ 0", () => {
    expect(
      ProductUpdateInput.safeParse({ unit_price_cents: 0 }).success,
    ).toBe(false)
  })

  it("refuse un stock négatif", () => {
    expect(ProductUpdateInput.safeParse({ stock: -1 }).success).toBe(false)
  })

  it("accepte la réinitialisation du seuil d'alerte stock via null", () => {
    expect(
      ProductUpdateInput.safeParse({ low_stock_threshold: null }).success,
    ).toBe(true)
  })

  it("accepte un seuil d'alerte stock entier ≥ 0", () => {
    expect(
      ProductUpdateInput.safeParse({ low_stock_threshold: 5 }).success,
    ).toBe(true)
    expect(
      ProductUpdateInput.safeParse({ low_stock_threshold: 0 }).success,
    ).toBe(true)
  })

  it("refuse un seuil d'alerte stock négatif", () => {
    expect(
      ProductUpdateInput.safeParse({ low_stock_threshold: -1 }).success,
    ).toBe(false)
  })

  it("refuse un seuil d'alerte stock non entier", () => {
    expect(
      ProductUpdateInput.safeParse({ low_stock_threshold: 3.5 }).success,
    ).toBe(false)
  })

  it("refuse une fenêtre incohérente (to < from)", () => {
    expect(
      ProductUpdateInput.safeParse({
        availability_from: "2026-06-30",
        availability_to: "2026-04-15",
      }).success,
    ).toBe(false)
  })

  it("accepte la modification de statut vers draft", () => {
    expect(
      ProductUpdateInput.safeParse({ status: "draft" }).success,
    ).toBe(true)
  })

  it("refuse des champs inconnus (strict)", () => {
    expect(ProductUpdateInput.safeParse({ foo: "bar" }).success).toBe(false)
  })
})
