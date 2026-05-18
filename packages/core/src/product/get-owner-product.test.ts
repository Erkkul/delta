import { describe, expect, it, vi } from "vitest"

import { ProductNotFoundError } from "../errors"

import { getOwnerProduct } from "./get-owner-product"
import { OWNER_ID, PRODUCT_ID, makeAdapter } from "./test-helpers"

describe("getOwnerProduct", () => {
  it("renvoie le produit", async () => {
    const adapter = makeAdapter()
    const r = await getOwnerProduct(PRODUCT_ID, OWNER_ID, adapter)
    expect(r.id).toBe(PRODUCT_ID)
  })

  it("rejette ProductNotFoundError si introuvable", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      getOwnerProduct(PRODUCT_ID, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })
})
