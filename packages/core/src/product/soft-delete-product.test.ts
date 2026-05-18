import { describe, expect, it, vi } from "vitest"

import {
  ProductAlreadyDeletedError,
  ProductNotFoundError,
} from "../errors"

import { softDeleteProduct } from "./soft-delete-product"
import {
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "./test-helpers"

describe("softDeleteProduct", () => {
  it("supprime un produit existant et renvoie la row marquée", async () => {
    const adapter = makeAdapter()
    const r = await softDeleteProduct(PRODUCT_ID, OWNER_ID, adapter)
    expect(adapter.softDelete).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID)
    expect(r.deleted_at).not.toBeNull()
  })

  it("rejette ProductNotFoundError si introuvable", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      softDeleteProduct(PRODUCT_ID, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
    expect(adapter.softDelete).not.toHaveBeenCalled()
  })

  it("rejette ProductAlreadyDeletedError si déjà soft-deleted", async () => {
    const adapter = makeAdapter({
      findById: vi
        .fn()
        .mockResolvedValue(
          makeProduct({ deleted_at: "2026-05-10T10:00:00Z" }),
        ),
    })
    await expect(
      softDeleteProduct(PRODUCT_ID, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductAlreadyDeletedError)
    expect(adapter.softDelete).not.toHaveBeenCalled()
  })
})
