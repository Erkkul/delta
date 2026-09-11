import { describe, expect, it, vi } from "vitest"

import { expirePendingMissionMatches } from "./expire-pending-mission-matches"

describe("expirePendingMissionMatches", () => {
  it("délègue à l'adapter avec l'instant fourni", async () => {
    const now = new Date("2026-05-14T18:00:00.000Z")
    const deps = { expirePendingPastDeadline: vi.fn(() => Promise.resolve(3)) }

    const count = await expirePendingMissionMatches(now, deps)

    expect(deps.expirePendingPastDeadline).toHaveBeenCalledWith(now)
    expect(count).toBe(3)
  })
})
