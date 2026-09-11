import { describe, expect, it } from "vitest"

import {
  DEFAULT_MISSION_MATCH_CONFIRMATION_HOURS,
  computeMissionConfirmationDeadline,
} from "./compute-confirmation-deadline"

describe("computeMissionConfirmationDeadline", () => {
  it("ajoute 24h par défaut", () => {
    const reservedAt = new Date("2026-05-13T18:00:00.000Z")
    const deadline = computeMissionConfirmationDeadline(reservedAt)
    expect(deadline.toISOString()).toBe("2026-05-14T18:00:00.000Z")
    expect(DEFAULT_MISSION_MATCH_CONFIRMATION_HOURS).toBe(24)
  })

  it("respecte un délai personnalisé", () => {
    const reservedAt = new Date("2026-05-13T18:00:00.000Z")
    const deadline = computeMissionConfirmationDeadline(reservedAt, 6)
    expect(deadline.toISOString()).toBe("2026-05-14T00:00:00.000Z")
  })
})
