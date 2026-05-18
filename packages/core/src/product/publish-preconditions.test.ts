import { describe, expect, it } from "vitest"

import { getPublishPreconditions } from "./publish-preconditions"
import { makeProduct } from "./test-helpers"

const TODAY = "2026-05-18"

describe("getPublishPreconditions", () => {
  it("retourne ok=true quand toutes les préconditions sont remplies", () => {
    const r = getPublishPreconditions(
      makeProduct({
        name: "Miel",
        description: "Miel de printemps",
        unit_price_cents: 850,
        stock: 5,
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
        availability_to: null,
      }),
      TODAY,
    )
    expect(r).toEqual({ ok: true, missing: [] })
  })

  it("détecte name manquant (vide après trim)", () => {
    const r = getPublishPreconditions(
      makeProduct({ name: "   " }),
      TODAY,
    )
    expect(r.missing).toContain("name")
  })

  it("détecte description null", () => {
    const r = getPublishPreconditions(
      makeProduct({ description: null }),
      TODAY,
    )
    expect(r.missing).toContain("description")
  })

  it("détecte description vide après trim", () => {
    const r = getPublishPreconditions(
      makeProduct({ description: "   " }),
      TODAY,
    )
    expect(r.missing).toContain("description")
  })

  it("détecte price ≤ 0", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: "ok",
        unit_price_cents: 0,
        stock: 5,
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
      }),
      TODAY,
    )
    expect(r.missing).toEqual(["price"])
  })

  it("détecte stock ≤ 0", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: "ok",
        stock: 0,
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
      }),
      TODAY,
    )
    expect(r.missing).toEqual(["stock"])
  })

  it("détecte photos vides", () => {
    const r = getPublishPreconditions(
      makeProduct({ description: "ok", photos: [] }),
      TODAY,
    )
    expect(r.missing).toEqual(["photos"])
  })

  it("détecte availability_to échue", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: "ok",
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
        availability_to: "2026-05-17",
      }),
      TODAY,
    )
    expect(r.missing).toEqual(["availability"])
  })

  it("accepte availability_to = today (inclusif)", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: "ok",
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
        availability_to: TODAY,
      }),
      TODAY,
    )
    expect(r.missing).not.toContain("availability")
  })

  it("agrège plusieurs préconditions manquantes", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: null,
        stock: 0,
        photos: [],
      }),
      TODAY,
    )
    expect(r.ok).toBe(false)
    expect(r.missing).toEqual(["description", "stock", "photos"])
  })

  it("availability_to null n'est jamais manquant", () => {
    const r = getPublishPreconditions(
      makeProduct({
        description: "ok",
        photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
        availability_to: null,
      }),
      TODAY,
    )
    expect(r.missing).not.toContain("availability")
  })
})
