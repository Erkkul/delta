import { describe, expect, it } from "vitest"

import { type CatalogueProductRow } from "../types"

import { mapCatalogueProduct } from "./map"

const ROW: CatalogueProductRow = {
  id: "11111111-1111-1111-1111-111111111111",
  producer_user_id: "22222222-2222-2222-2222-222222222222",
  name: "Miel toutes fleurs 500g",
  description: "Récolté en Normandie.",
  category: "miel_et_ruche",
  packaging: "pot_500g",
  unit_price_cents: 850,
  labels: ["bio_ab"],
  photos: [
    { url: "https://cdn/photo-1.jpg", path: "u/p/1.jpg", alt: "Pot de miel" },
    { url: "https://cdn/photo-2.jpg", path: "u/p/2.jpg" },
  ],
  created_at: "2026-06-20T10:00:00.000Z",
  producer_display_name: "Pierre Dupont",
  producer_zone: "Évreux",
}

describe("mapCatalogueProduct", () => {
  it("restructure la row vue en DTO public", () => {
    const dto = mapCatalogueProduct(ROW)
    expect(dto.id).toBe(ROW.id)
    expect(dto.producer).toEqual({
      id: ROW.producer_user_id,
      display_name: "Pierre Dupont",
      zone: "Évreux",
    })
    expect(dto.unit_price_cents).toBe(850)
  })

  it("ne conserve que la première photo, alt par défaut null", () => {
    const dto = mapCatalogueProduct(ROW)
    expect(dto.photo).toEqual({ url: "https://cdn/photo-1.jpg", alt: "Pot de miel" })

    const noAlt = mapCatalogueProduct({
      ...ROW,
      photos: [{ url: "https://cdn/x.jpg", path: "u/p/x.jpg" }],
    })
    expect(noAlt.photo).toEqual({ url: "https://cdn/x.jpg", alt: null })
  })

  it("renvoie photo null et labels [] quand absents", () => {
    const dto = mapCatalogueProduct({ ...ROW, photos: [], labels: [] })
    expect(dto.photo).toBeNull()
    expect(dto.labels).toEqual([])
  })

  it("préserve une zone producteur nulle", () => {
    const dto = mapCatalogueProduct({ ...ROW, producer_zone: null })
    expect(dto.producer.zone).toBeNull()
  })
})
