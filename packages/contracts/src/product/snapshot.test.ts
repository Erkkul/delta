import { describe, expect, it } from "vitest"

import { ProductListSnapshot, ProductSnapshot } from "./snapshot"

const SAMPLE: unknown = {
  id: "00000000-0000-0000-0000-000000000001",
  producer_user_id: "00000000-0000-0000-0000-0000000000aa",
  name: "Miel de printemps",
  description: null,
  category: "miel_et_ruche",
  packaging: "pot_250g",
  unit_price_cents: 850,
  stock: 24,
  low_stock_threshold: null,
  availability_from: null,
  availability_to: null,
  status: "active",
  labels: [],
  photos: [],
  created_at: "2026-05-18T10:00:00.000Z",
  updated_at: "2026-05-18T10:00:00.000Z",
  deleted_at: null,
}

describe("ProductSnapshot", () => {
  it("accepte un snapshot complet minimal", () => {
    expect(ProductSnapshot.safeParse(SAMPLE).success).toBe(true)
  })

  it("accepte un snapshot avec photos et labels", () => {
    expect(
      ProductSnapshot.safeParse({
        ...(SAMPLE as Record<string, unknown>),
        labels: ["bio_ab", "label_rouge"],
        photos: [
          {
            url: "https://example.com/photo.jpg",
            path: "uid/pid/abc.jpg",
            alt: "miel",
          },
        ],
      }).success,
    ).toBe(true)
  })

  it("refuse une photo sans url", () => {
    expect(
      ProductSnapshot.safeParse({
        ...(SAMPLE as Record<string, unknown>),
        photos: [{ alt: "miel", path: "uid/pid/abc.jpg" }],
      }).success,
    ).toBe(false)
  })

  it("refuse une photo sans path (KAN-21 — anti-orphelin DELETE)", () => {
    expect(
      ProductSnapshot.safeParse({
        ...(SAMPLE as Record<string, unknown>),
        photos: [{ url: "https://example.com/photo.jpg" }],
      }).success,
    ).toBe(false)
  })
})

describe("ProductListSnapshot", () => {
  it("accepte une liste vide", () => {
    expect(
      ProductListSnapshot.safeParse({ items: [], nextCursor: null }).success,
    ).toBe(true)
  })

  it("accepte une liste avec items + cursor", () => {
    expect(
      ProductListSnapshot.safeParse({
        items: [SAMPLE],
        nextCursor: "2026-05-18T09:00:00.000Z",
      }).success,
    ).toBe(true)
  })
})
