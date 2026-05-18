import { describe, expect, it, vi } from "vitest"

import {
  ProductNotFoundError,
  ProductValidationError,
} from "../errors"

import {
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "./test-helpers"
import { updateProduct } from "./update-product"

describe("updateProduct", () => {
  it("met à jour le prix", async () => {
    const adapter = makeAdapter()
    const r = await updateProduct(
      PRODUCT_ID,
      { unit_price_cents: 950 },
      OWNER_ID,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      unit_price_cents: 950,
    })
    expect(r.unit_price_cents).toBe(950)
  })

  it("permet de réinitialiser la description via null", async () => {
    const adapter = makeAdapter()
    await updateProduct(
      PRODUCT_ID,
      { description: null },
      OWNER_ID,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      description: null,
    })
  })

  it("rejette ProductNotFoundError si le produit n'existe pas", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      updateProduct(PRODUCT_ID, { stock: 5 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
    expect(adapter.update).not.toHaveBeenCalled()
  })

  it("rejette ProductValidationError sur prix invalide", async () => {
    const adapter = makeAdapter()
    await expect(
      updateProduct(
        PRODUCT_ID,
        { unit_price_cents: -1 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })

  it("rejette ProductValidationError sur fenêtre incohérente", async () => {
    const adapter = makeAdapter()
    await expect(
      updateProduct(
        PRODUCT_ID,
        {
          availability_from: "2026-08-01",
          availability_to: "2026-07-01",
        },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })

  it("accepte un patch vide (no-op fonctionnel)", async () => {
    const adapter = makeAdapter()
    await updateProduct(PRODUCT_ID, {}, OWNER_ID, adapter)
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {})
  })

  it("passe les labels au repo", async () => {
    const adapter = makeAdapter({
      findById: vi
        .fn()
        .mockResolvedValue(makeProduct({ labels: ["Bio AB"] })),
    })
    await updateProduct(
      PRODUCT_ID,
      { labels: ["Bio AB", "Demeter"] },
      OWNER_ID,
      adapter,
    )
    expect(adapter.update).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, {
      labels: ["Bio AB", "Demeter"],
    })
  })
})
