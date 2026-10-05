import { describe, expect, it } from "vitest"

import {
  BUYER_PENALTY_SUSPENSION_DURATION_DAYS,
  computeBuyerPenaltyOutcome,
  isBuyerSuspended,
} from "./compute-buyer-penalty-outcome"

describe("computeBuyerPenaltyOutcome", () => {
  const now = new Date("2026-10-05T12:00:00.000Z")

  it("1er refus : aucun effet", () => {
    expect(computeBuyerPenaltyOutcome(1, now)).toEqual({ kind: "none" })
  })

  it("2e refus dans la fenêtre : avertissement", () => {
    expect(computeBuyerPenaltyOutcome(2, now)).toEqual({ kind: "warning" })
  })

  it("3e refus dans la fenêtre : suspension de 14 jours", () => {
    const result = computeBuyerPenaltyOutcome(3, now)
    expect(result.kind).toBe("suspension")
    if (result.kind !== "suspension") throw new Error("unreachable")
    expect(result.suspendedUntil.toISOString()).toBe("2026-10-19T12:00:00.000Z")
    expect(BUYER_PENALTY_SUSPENSION_DURATION_DAYS).toBe(14)
  })

  it("refus au-delà du 3e : suspension reconduite", () => {
    expect(computeBuyerPenaltyOutcome(4, now).kind).toBe("suspension")
  })
})

describe("isBuyerSuspended", () => {
  const now = new Date("2026-10-05T12:00:00.000Z")

  it("pas de date de suspension : non suspendu", () => {
    expect(isBuyerSuspended(null, now)).toBe(false)
  })

  it("date de suspension passée : non suspendu (refus hors fenêtre / suspension expirée)", () => {
    expect(isBuyerSuspended("2026-09-01T00:00:00.000Z", now)).toBe(false)
  })

  it("date de suspension future : suspendu", () => {
    expect(isBuyerSuspended("2026-10-19T12:00:00.000Z", now)).toBe(true)
  })
})
