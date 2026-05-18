import { describe, expect, it, vi } from "vitest"

import {
  ProductNotFoundError,
  ProductPhotoLimitReachedError,
  ProductPhotoPathRejectedError,
  ProductValidationError,
} from "../../errors"
import {
  OTHER_ID,
  OWNER_ID,
  PRODUCT_ID,
  makeAdapter,
  makeProduct,
} from "../test-helpers"

import { addProductPhoto } from "./add-product-photo"

const VALID_PATH = `${OWNER_ID}/${PRODUCT_ID}/abc12345.jpg`
const VALID_URL =
  "https://example.supabase.co/storage/v1/object/public/product-photos/abc12345.jpg"

describe("addProductPhoto", () => {
  it("append une entrée { url, path } au tableau photos", async () => {
    const adapter = makeAdapter()
    const r = await addProductPhoto(
      PRODUCT_ID,
      { path: VALID_PATH, public_url: VALID_URL },
      OWNER_ID,
      adapter,
    )
    expect(adapter.updatePhotos).toHaveBeenCalledWith(PRODUCT_ID, OWNER_ID, [
      { url: VALID_URL, path: VALID_PATH },
    ])
    expect(r).toBeDefined()
  })

  it("rejette si le path ne commence pas par {ownerId}/{productId}/", async () => {
    const adapter = makeAdapter()
    await expect(
      addProductPhoto(
        PRODUCT_ID,
        {
          path: `${OTHER_ID}/${PRODUCT_ID}/abc12345.jpg`,
          public_url: VALID_URL,
        },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductPhotoPathRejectedError)
    expect(adapter.updatePhotos).not.toHaveBeenCalled()
  })

  it("rejette ProductNotFoundError si le produit n'existe pas", async () => {
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(null),
    })
    await expect(
      addProductPhoto(
        PRODUCT_ID,
        { path: VALID_PATH, public_url: VALID_URL },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
    expect(adapter.updatePhotos).not.toHaveBeenCalled()
  })

  it("rejette ProductNotFoundError si le produit est soft-deleted", async () => {
    const adapter = makeAdapter({
      findById: vi
        .fn()
        .mockResolvedValue(makeProduct({ deleted_at: "2026-05-18T12:00:00Z" })),
    })
    await expect(
      addProductPhoto(
        PRODUCT_ID,
        { path: VALID_PATH, public_url: VALID_URL },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it("rejette ProductPhotoLimitReachedError si 4 photos déjà présentes", async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({
      url: `https://example.com/p${i}.jpg`,
      path: `${OWNER_ID}/${PRODUCT_ID}/p${i}.jpg`,
    }))
    const adapter = makeAdapter({
      findById: vi.fn().mockResolvedValue(makeProduct({ photos: four })),
    })
    await expect(
      addProductPhoto(
        PRODUCT_ID,
        { path: VALID_PATH, public_url: VALID_URL },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductPhotoLimitReachedError)
    expect(adapter.updatePhotos).not.toHaveBeenCalled()
  })

  it("rejette ProductValidationError sur input invalide (public_url non URL)", async () => {
    const adapter = makeAdapter()
    await expect(
      addProductPhoto(
        PRODUCT_ID,
        { path: VALID_PATH, public_url: "not-a-url" },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })
})
