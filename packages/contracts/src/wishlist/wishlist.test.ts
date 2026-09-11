import { describe, expect, it } from "vitest"

import {
  WISHLIST_ERROR_CODES,
  WISHLIST_MAX,
  WishlistAddInput,
  WishlistItem,
  WishlistPage,
} from "./wishlist"

const PRODUCT = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Miel d'acacia 500g",
  description: null,
  category: "miel_et_ruche" as const,
  packaging: "pot_500g" as const,
  unit_price_cents: 850,
  labels: [] as string[],
  photo: null,
  producer: {
    id: "22222222-2222-2222-2222-222222222222",
    display_name: "Pierre Dupont",
    zone: "Évreux (27)",
  },
  created_at: "2026-09-11T10:00:00.000Z",
}

describe("WishlistAddInput", () => {
  it("exige un productId uuid", () => {
    expect(
      WishlistAddInput.safeParse({
        productId: "11111111-1111-1111-1111-111111111111",
      }).success,
    ).toBe(true)
    expect(WishlistAddInput.safeParse({ productId: "nope" }).success).toBe(false)
    expect(WishlistAddInput.safeParse({}).success).toBe(false)
  })

  it("refuse les clés inconnues (strict)", () => {
    expect(
      WishlistAddInput.safeParse({
        productId: "11111111-1111-1111-1111-111111111111",
        foo: "bar",
      }).success,
    ).toBe(false)
  })
})

describe("WishlistItem / WishlistPage", () => {
  it("valide une envie bien formée", () => {
    const r = WishlistItem.safeParse({
      id: "33333333-3333-3333-3333-333333333333",
      product: PRODUCT,
      created_at: "2026-09-11T10:00:00.000Z",
    })
    expect(r.success).toBe(true)
  })

  it("valide une page avec compteur et plafond", () => {
    const r = WishlistPage.safeParse({
      items: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          product: PRODUCT,
          created_at: "2026-09-11T10:00:00.000Z",
        },
      ],
      count: 1,
      max: WISHLIST_MAX,
    })
    expect(r.success).toBe(true)
  })

  it("refuse un compteur négatif", () => {
    expect(
      WishlistPage.safeParse({ items: [], count: -1, max: WISHLIST_MAX })
        .success,
    ).toBe(false)
  })
})

describe("WISHLIST_MAX / error codes", () => {
  it("plafond à 20", () => {
    expect(WISHLIST_MAX).toBe(20)
  })

  it("expose des codes d'erreur préfixés WISHLIST_", () => {
    for (const code of Object.values(WISHLIST_ERROR_CODES)) {
      expect(code.startsWith("WISHLIST_")).toBe(true)
    }
  })
})
