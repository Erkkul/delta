import { describe, expect, it, vi } from "vitest"

import { ProductValidationError } from "../errors"

import { listOwnerProducts } from "./list-owner-products"
import { OWNER_ID, makeAdapter, makeProduct } from "./test-helpers"

describe("listOwnerProducts", () => {
  it("applique les valeurs par défaut (status=all, limit=20)", async () => {
    const adapter = makeAdapter()
    await listOwnerProducts({}, OWNER_ID, adapter)
    expect(adapter.findByOwner).toHaveBeenCalledWith(OWNER_ID, {
      status: "all",
      q: null,
      limit: 20,
      cursor: null,
    })
  })

  it("transmet le filtre status au repo", async () => {
    const adapter = makeAdapter()
    await listOwnerProducts({ status: "draft" }, OWNER_ID, adapter)
    expect(adapter.findByOwner).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({ status: "draft" }),
    )
  })

  it("transmet la recherche FTS", async () => {
    const adapter = makeAdapter()
    await listOwnerProducts({ q: "miel acacia" }, OWNER_ID, adapter)
    expect(adapter.findByOwner).toHaveBeenCalledWith(
      OWNER_ID,
      expect.objectContaining({ q: "miel acacia" }),
    )
  })

  it("rejette ProductValidationError sur query invalide", async () => {
    const adapter = makeAdapter()
    await expect(
      listOwnerProducts({ limit: 999 }, OWNER_ID, adapter),
    ).rejects.toBeInstanceOf(ProductValidationError)
  })

  it("renvoie items + nextCursor", async () => {
    const adapter = makeAdapter({
      findByOwner: vi.fn().mockResolvedValue({
        items: [makeProduct({ id: "00000000-0000-0000-0000-000000000222" })],
        nextCursor: "2026-05-17T09:00:00.000Z",
      }),
    })
    const r = await listOwnerProducts({}, OWNER_ID, adapter)
    expect(r.items).toHaveLength(1)
    expect(r.nextCursor).toBe("2026-05-17T09:00:00.000Z")
  })
})
