import { vi } from "vitest"

import { type Product, type ProductAdapter } from "./adapters"

export const OWNER_ID = "00000000-0000-0000-0000-000000000aaa"
export const OTHER_ID = "00000000-0000-0000-0000-000000000bbb"
export const PRODUCT_ID = "00000000-0000-0000-0000-000000000111"

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: PRODUCT_ID,
    producer_user_id: OWNER_ID,
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
    ...overrides,
  }
}

/** Adapter mock par défaut — tous les use cases. */
export function makeAdapter(
  overrides: Partial<ProductAdapter> = {},
): ProductAdapter {
  return {
    create: vi
      .fn()
      .mockImplementation((ownerId: string, input) =>
        Promise.resolve(
          makeProduct({ producer_user_id: ownerId, ...input }),
        ),
      ),
    findById: vi.fn().mockResolvedValue(makeProduct()),
    findByOwner: vi
      .fn()
      .mockResolvedValue({ items: [makeProduct()], nextCursor: null }),
    update: vi
      .fn()
      .mockImplementation((_productId: string, _ownerId: string, patch) =>
        Promise.resolve(makeProduct(patch)),
      ),
    softDelete: vi
      .fn()
      .mockImplementation((_productId: string, _ownerId: string) =>
        Promise.resolve(
          makeProduct({ deleted_at: "2026-05-18T11:00:00.000Z" }),
        ),
      ),
    ...overrides,
  }
}
