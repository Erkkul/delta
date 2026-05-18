import { describe, expect, it } from "vitest"

import { ProductListQuery } from "./list"

describe("ProductListQuery", () => {
  it("applique les valeurs par défaut sur query vide", () => {
    const r = ProductListQuery.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.status).toBe("all")
      expect(r.data.limit).toBe(20)
    }
  })

  it("accepte un filtre status valide", () => {
    expect(ProductListQuery.safeParse({ status: "active" }).success).toBe(true)
    expect(ProductListQuery.safeParse({ status: "draft" }).success).toBe(true)
    expect(ProductListQuery.safeParse({ status: "disabled" }).success).toBe(
      true,
    )
    expect(ProductListQuery.safeParse({ status: "all" }).success).toBe(true)
  })

  it("accepte le filtre dérivé sold_out (KAN-23)", () => {
    expect(ProductListQuery.safeParse({ status: "sold_out" }).success).toBe(
      true,
    )
  })

  it("refuse un status hors whitelist", () => {
    expect(
      ProductListQuery.safeParse({ status: "archived" }).success,
    ).toBe(false)
  })

  it("coerce limit depuis une string", () => {
    const r = ProductListQuery.safeParse({ limit: "10" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.limit).toBe(10)
  })

  it("refuse limit > 50", () => {
    expect(ProductListQuery.safeParse({ limit: 51 }).success).toBe(false)
  })

  it("refuse limit ≤ 0", () => {
    expect(ProductListQuery.safeParse({ limit: 0 }).success).toBe(false)
  })

  it("refuse q > 200 caractères", () => {
    expect(
      ProductListQuery.safeParse({ q: "x".repeat(201) }).success,
    ).toBe(false)
  })

  it("accepte un cursor ISO datetime", () => {
    expect(
      ProductListQuery.safeParse({ cursor: "2026-05-18T10:00:00.000Z" })
        .success,
    ).toBe(true)
  })

  it("refuse un cursor non ISO", () => {
    expect(
      ProductListQuery.safeParse({ cursor: "hier" }).success,
    ).toBe(false)
  })
})
