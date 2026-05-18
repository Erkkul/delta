import { describe, expect, it, vi } from "vitest"

import {
  ProductNotFoundError,
  ProductTransitionInvalidError,
} from "../errors"

import {
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "./test-helpers"
import { transitionProductStatus } from "./transition-product-status"

const TODAY = "2026-05-18"

/**
 * Helper : produit qui satisfait toutes les préconditions de publication.
 * Réutilisé dans tous les tests de transition vers `active`.
 */
function publishableProduct() {
  return makeProduct({
    name: "Miel",
    description: "Miel de printemps",
    unit_price_cents: 850,
    stock: 5,
    photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
    availability_to: null,
  })
}

describe("transitionProductStatus", () => {
  it("publie un brouillon quand toutes les préconditions sont remplies", async () => {
    const adapter = makeAdapter({
      findById: vi
        .fn()
        .mockResolvedValue(publishableProduct().status === "active"
          ? { ...publishableProduct(), status: "draft" as const }
          : publishableProduct()),
    })
    const r = await transitionProductStatus(
      PRODUCT_ID,
      "active",
      OWNER_ID,
      TODAY,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      status: "active",
    })
    expect(r.status).toBe("active")
  })

  it("passe active → draft sans préconditions", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ status: "active" })),
    })
    await transitionProductStatus(
      PRODUCT_ID,
      "draft",
      OWNER_ID,
      TODAY,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      status: "draft",
    })
  })

  it("passe active → disabled", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ status: "active" })),
    })
    await transitionProductStatus(
      PRODUCT_ID,
      "disabled",
      OWNER_ID,
      TODAY,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      status: "disabled",
    })
  })

  it("passe disabled → draft", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ status: "disabled" })),
    })
    await transitionProductStatus(
      PRODUCT_ID,
      "draft",
      OWNER_ID,
      TODAY,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      status: "draft",
    })
  })

  it("passe draft → disabled sans préconditions", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ status: "draft" })),
    })
    await transitionProductStatus(
      PRODUCT_ID,
      "disabled",
      OWNER_ID,
      TODAY,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      status: "disabled",
    })
  })

  it("refuse active → active (no-op) avec invalid_transition", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ status: "active" })),
    })
    await expect(
      transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      ),
    ).rejects.toMatchObject({
      code: "PRODUCT_TRANSITION_INVALID",
      details: { reason: "invalid_transition", missing: [] },
    })
    expect(adapter.update).not.toHaveBeenCalled()
  })

  it("refuse draft → active sans photos avec missing_preconditions", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(
        makeProduct({
          status: "draft",
          description: "ok",
          stock: 5,
          photos: [],
        }),
      ),
    })
    await expect(
      transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      ),
    ).rejects.toMatchObject({
      code: "PRODUCT_TRANSITION_INVALID",
      details: { reason: "missing_preconditions", missing: ["photos"] },
    })
    expect(adapter.update).not.toHaveBeenCalled()
  })

  it("agrège plusieurs préconditions manquantes en un seul échec", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(
        makeProduct({
          status: "draft",
          description: null,
          stock: 0,
          photos: [],
        }),
      ),
    })
    try {
      await transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      )
      expect.fail("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(ProductTransitionInvalidError)
      const e = err as ProductTransitionInvalidError
      expect(e.details.reason).toBe("missing_preconditions")
      expect(e.details.missing).toEqual(["description", "stock", "photos"])
    }
  })

  it("rejette ProductNotFoundError si le produit n'existe pas", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it("re-vérifie les préconditions pour disabled → active", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(
        makeProduct({
          status: "disabled",
          description: "ok",
          photos: [],
        }),
      ),
    })
    await expect(
      transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      ),
    ).rejects.toMatchObject({
      code: "PRODUCT_TRANSITION_INVALID",
      details: { reason: "missing_preconditions", missing: ["photos"] },
    })
  })

  it("refuse availability_to échue", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(
        makeProduct({
          status: "draft",
          description: "ok",
          stock: 5,
          photos: [{ url: "https://x/y.jpg", path: "x/y.jpg" }],
          availability_to: "2026-05-17",
        }),
      ),
    })
    await expect(
      transitionProductStatus(
        PRODUCT_ID,
        "active",
        OWNER_ID,
        TODAY,
        adapter,
      ),
    ).rejects.toMatchObject({
      details: {
        reason: "missing_preconditions",
        missing: ["availability"],
      },
    })
  })
})
