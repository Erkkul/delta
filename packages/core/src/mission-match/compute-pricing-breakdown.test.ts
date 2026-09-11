import { describe, expect, it } from "vitest"

import { computeMissionPricingBreakdown } from "./compute-pricing-breakdown"

describe("computeMissionPricingBreakdown", () => {
  it("reproduit l'exemple de la maquette AC-07 (8,50€)", () => {
    const result = computeMissionPricingBreakdown(850)
    expect(result).toEqual({
      producerShareCents: 723,
      rameneurShareCents: 85,
      platformShareCents: 42,
    })
  })

  it("la somme des trois parts égale toujours le total", () => {
    for (const totalCents of [1, 33, 101, 999, 12345]) {
      const { producerShareCents, rameneurShareCents, platformShareCents } =
        computeMissionPricingBreakdown(totalCents)
      expect(producerShareCents + rameneurShareCents + platformShareCents).toBe(
        totalCents,
      )
    }
  })

  it("total nul → toutes les parts à zéro", () => {
    expect(computeMissionPricingBreakdown(0)).toEqual({
      producerShareCents: 0,
      rameneurShareCents: 0,
      platformShareCents: 0,
    })
  })
})
