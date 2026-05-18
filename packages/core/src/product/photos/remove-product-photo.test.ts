import { describe, expect, it, vi } from "vitest"

import {
  ProductNotFoundError,
  ProductPhotoNotFoundError,
  ProductValidationError,
} from "../../errors"
import {
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "../test-helpers"

import { removeProductPhoto } from "./remove-product-photo"

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

describe("removeProductPhoto", () => {
  it("retire la photo et renvoie le path Storage à supprimer", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos })),
    })
    const r = await removeProductPhoto(
      PRODUCT_ID,
      { index: 1 },
      OWNER_ID,
      adapter,
    )
    // photos[1] retirée → tableau résultant = [photos[0], photos[2]]
    expect(adapter.updatePhotos).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, [
      photos[0],
      photos[2],
    ])
    expect(r.removedPath).toBe(`${OWNER_ID}/${PRODUCT_ID}/1.jpg`)
  })

  it("rejette ProductPhotoNotFoundError si index hors plage", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos })),
    })
    await expect(
      removeProductPhoto(PRODUCT_ID, { index: 3 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductPhotoNotFoundError)
    expect(adapter.updatePhotos).not.toHaveBeenCalled()
  })

  it("rejette ProductNotFoundError si le produit n'existe pas", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      removeProductPhoto(PRODUCT_ID, { index: 0 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it("rejette ProductNotFoundError si le produit est soft-deleted", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(
        makeProduct({
          photos,
          deleted_at: "2026-05-18T12:00:00Z",
        }),
      ),
    })
    await expect(
      removeProductPhoto(PRODUCT_ID, { index: 0 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it("rejette ProductValidationError sur index négatif", async () => {
    const adapter = makeAdapter()
    await expect(
      removeProductPhoto(PRODUCT_ID, { index: -1 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })
})
