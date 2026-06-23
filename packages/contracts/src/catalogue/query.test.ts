import { describe, expect, it } from "vitest"

import { CatalogueQuery } from "./query"

describe("CatalogueQuery", () => {
  it("applique les défauts (limit 20, reste optionnel)", () => {
    const r = CatalogueQuery.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.limit).toBe(20)
      expect(r.data.q).toBeUndefined()
      expect(r.data.category).toBeUndefined()
      expect(r.data.producer).toBeUndefined()
      expect(r.data.cursor).toBeUndefined()
    }
  })

  it("coerce limit depuis une query string et borne 1..50", () => {
    expect(CatalogueQuery.safeParse({ limit: "10" }).success).toBe(true)
    expect(CatalogueQuery.safeParse({ limit: "0" }).success).toBe(false)
    expect(CatalogueQuery.safeParse({ limit: "51" }).success).toBe(false)
  })

  it("accepte une catégorie valide et refuse une catégorie hors enum", () => {
    expect(CatalogueQuery.safeParse({ category: "miel_et_ruche" }).success).toBe(
      true,
    )
    expect(CatalogueQuery.safeParse({ category: "alcools" }).success).toBe(false)
  })

  it("exige un uuid pour producer et un datetime pour cursor", () => {
    expect(CatalogueQuery.safeParse({ producer: "not-a-uuid" }).success).toBe(
      false,
    )
    expect(
      CatalogueQuery.safeParse({
        producer: "11111111-1111-1111-1111-111111111111",
      }).success,
    ).toBe(true)
    expect(CatalogueQuery.safeParse({ cursor: "2026-06-23" }).success).toBe(
      false,
    )
    expect(
      CatalogueQuery.safeParse({ cursor: "2026-06-23T10:00:00.000Z" }).success,
    ).toBe(true)
  })

  it("refuse les clés inconnues (strict)", () => {
    expect(CatalogueQuery.safeParse({ foo: "bar" }).success).toBe(false)
  })

  it("trim le terme de recherche et borne sa longueur", () => {
    const r = CatalogueQuery.safeParse({ q: "  miel  " })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.q).toBe("miel")
    expect(CatalogueQuery.safeParse({ q: "x".repeat(201) }).success).toBe(false)
  })
})
