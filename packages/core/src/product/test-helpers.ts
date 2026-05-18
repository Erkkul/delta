import { vi } from "vitest"

import { type Product } from "./adapters"

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

/**
 * Adapter mock par défaut — tous les use cases. Type de retour volontairement
 * inféré (pas annoté `ProductAdapter`) pour conserver le typage de chaque
 * `vi.fn()` côté tests (sinon `expect(adapter.create).toHaveBeenCalledWith(…)`
 * déclenche `@typescript-eslint/unbound-method`).
 */
export function makeAdapter(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn((ownerId: string, input: Partial<Product>) =>
      Promise.resolve(
        makeProduct({ producer_user_id: ownerId, ...input }),
      ),
    ),
    findById: vi.fn(() => Promise.resolve<Product | null>(makeProduct())),
    findByOwner: vi.fn(() =>
      Promise.resolve({
        items: [makeProduct()],
        nextCursor: null as string | null,
      }),
    ),
    update: vi.fn(
      (_productId: string, _ownerId: string, patch: Partial<Product>) =>
        Promise.resolve(makeProduct(patch)),
    ),
    softDelete: vi.fn(() =>
      Promise.resolve(
        makeProduct({ deleted_at: "2026-05-18T11:00:00.000Z" }),
      ),
    ),
    updatePhotos: vi.fn(
      (
        _productId: string,
        _ownerId: string,
        photos: Array<{ url: string; path: string; alt?: string }>,
      ) => Promise.resolve(makeProduct({ photos })),
    ),
    ...overrides,
  }
}
