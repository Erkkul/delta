import { describe, expect, it, vi } from "vitest"

import { ProductValidationError } from "../errors"

import { createProduct } from "./create-product"
import { OWNER_ID, makeAdapter, makeProduct } from "./test-helpers"

const VALID_INPUT = {
  name: "Miel de printemps",
  category: "miel_et_ruche",
  packaging: "pot_250g",
  unit_price_cents: 850,
}

describe("createProduct", () => {
  it("crée un produit avec valeurs par défaut (stock=0, status=active)", async () => {
    const adapter = makeAdapter()
    const r = await createProduct(VALID_INPUT, OWNER_ID, adapter)

    expect(r.producer_user_id).toBe(OWNER_ID)
    expect(adapter.create).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({
        name: "Miel de printemps",
        stock: 0,
        low_stock_threshold: null,
        status: "active",
        labels: [],
      }),
    )
  })

  it("propage le seuil d'alerte stock quand renseigné", async () => {
    const adapter = makeAdapter()
    await createProduct(
      { ...VALID_INPUT, low_stock_threshold: 5 },
      OWNER_ID,
      adapter,
    )
    expect(adapter.create).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({ low_stock_threshold: 5 }),
    )
  })

  it("propage description, stock, fenêtre", async () => {
    const adapter = makeAdapter()
    await createProduct(
      {
        ...VALID_INPUT,
        description: "Récolté en avril.",
        stock: 24,
        availability_from: "2026-04-15",
        availability_to: "2026-06-30",
      },
      OWNER_ID,
      adapter,
    )
    expect(adapter.create).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({
        description: "Récolté en avril.",
        stock: 24,
        availability_from: "2026-04-15",
        availability_to: "2026-06-30",
      }),
    )
  })

  it("rejette ProductValidationError sur input invalide (prix nul)", async () => {
    const adapter = makeAdapter()
    await expect(
      createProduct(
        { ...VALID_INPUT, unit_price_cents: 0 },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
    expect(adapter.create).not.toHaveBeenCalled()
  })

  it("rejette si la fenêtre est incohérente", async () => {
    const adapter = makeAdapter()
    await expect(
      createProduct(
        {
          ...VALID_INPUT,
          availability_from: "2026-06-30",
          availability_to: "2026-04-15",
        },
        OWNER_ID,
        adapter,
      ),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })

  it("retourne le snapshot renvoyé par l'adapter", async () => {
    const created = makeProduct({ name: "Pommes", category: "fruits" })
    const adapter = makeAdapter({
      create: vi.fn().mockResolvedValue(created),
    })
    const r = await createProduct(VALID_INPUT, OWNER_ID, adapter)
    expect(r).toEqual(created)
  })
})
