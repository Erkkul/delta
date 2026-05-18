import { describe, expect, it, vi } from "vitest"

import {
  ProductNotFoundError,
  ProductPhotoInvalidReorderError,
  ProductValidationError,
} from "../../errors"
import {
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "../test-helpers"

import { reorderProductPhotos } from "./reorder-product-photos"

const photos = [
  {
    url: "https://example.com/0.jpg",
    path: `${OWNER_ID}/${PRODUCT_ID}/0.jpg`,
  },
  {
    url: "https://example.com/1.jpg",
    path: `${OWNER_ID}/${PRODUCT_ID}/1.jpg`,
  },
  {
    url: "https://example.com/2.jpg",
    path: `${OWNER_ID}/${PRODUCT_ID}/2.jpg`,
  },
]

describe("reorderProductPhotos", () => {
  it("permute deux positions valides", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos })),
    })
    await reorderProductPhotos(
      PRODUCT_ID,
      { from: 2, to: 0 },
      OWNER_ID,
      adapter,
    )
    // photos[2] passe en première position (couverture), les autres décalées
    expect(adapter.updatePhotos).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, [
      photos[2],
      photos[0],
      photos[1],
    ])
  })

  it("rejette ProductValidationError si from === to", async () => {
    const adapter = makeAdapter()
    await expect(
      reorderProductPhotos(
        PRODUCT_ID,
        { from: 1, to: 1 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
    expect(adapter.updatePhotos).not.toHaveBeenCalled()
  })

  it("rejette ProductPhotoInvalidReorderError si from hors plage", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos })),
    })
    await expect(
      reorderProductPhotos(
        PRODUCT_ID,
        { from: 3, to: 0 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductPhotoInvalidReorderError)
  })

  it("rejette ProductPhotoInvalidReorderError si to hors plage", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos })),
    })
    await expect(
      reorderProductPhotos(
        PRODUCT_ID,
        { from: 0, to: 3 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductPhotoInvalidReorderError)
  })

  it("rejette ProductNotFoundError si le produit n'existe pas", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      reorderProductPhotos(
        PRODUCT_ID,
        { from: 0, to: 1 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })
})
