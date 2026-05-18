import { describe, expect, it } from "vitest"

import { getStockDisplayState } from "./stock-display"

describe("getStockDisplayState", () => {
  it("rend `empty` + badge épuisé pour stock = 0 sur produit actif", () => {
    expect(
      getStockDisplayState({
        stock: 0,
        low_stock_threshold: null,
        status: "active",
      }),
    ).toEqual({ kind: "empty", showSoldOutBadge: true })
  })

  it("rend `empty` sans badge épuisé pour stock = 0 sur brouillon", () => {
    expect(
      getStockDisplayState({
        stock: 0,
        low_stock_threshold: 5,
        status: "draft",
      }),
    ).toEqual({ kind: "empty", showSoldOutBadge: false })
  })

  it("rend `empty` sans badge épuisé pour stock = 0 sur produit désactivé", () => {
    expect(
      getStockDisplayState({
        stock: 0,
        low_stock_threshold: null,
        status: "disabled",
      }),
    ).toEqual({ kind: "empty", showSoldOutBadge: false })
  })

  it("rend `low` quand stock < seuil", () => {
    expect(
      getStockDisplayState({
        stock: 3,
        low_stock_threshold: 5,
        status: "active",
      }).kind,
    ).toBe("low")
  })

  it("rend `low` quand stock = seuil (inclusif)", () => {
    expect(
      getStockDisplayState({
        stock: 5,
        low_stock_threshold: 5,
        status: "active",
      }).kind,
    ).toBe("low")
  })

  it("rend `ok` quand stock > seuil", () => {
    expect(
      getStockDisplayState({
        stock: 10,
        low_stock_threshold: 5,
        status: "active",
      }).kind,
    ).toBe("ok")
  })

  it("rend `ok` quand seuil = null (pas d'alerte configurée)", () => {
    expect(
      getStockDisplayState({
        stock: 1,
        low_stock_threshold: null,
        status: "active",
      }).kind,
    ).toBe("ok")
  })

  it("rend `ok` quand seuil = 0 et stock > 0 (alerte permanente désactivée)", () => {
    expect(
      getStockDisplayState({
        stock: 1,
        low_stock_threshold: 0,
        status: "active",
      }).kind,
    ).toBe("ok")
  })
})
