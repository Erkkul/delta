import { describe, expect, it } from "vitest"

import { confirmMissionMatch } from "./confirm-mission-match"
import {
  BUYER_ID,
  MISSION_MATCH_ID,
  makeAdapter,
} from "./test-helpers"

describe("confirmMissionMatch", () => {
  it("délègue à l'adapter et renvoie le match confirmé", async () => {
    const adapter = makeAdapter()

    const result = await confirmMissionMatch(MISSION_MATCH_ID, BUYER_ID, adapter)

    expect(adapter.confirm).toHaveBeenCalledWith(MISSION_MATCH_ID, BUYER_ID)
    expect(result.status).toBe("accepted")
  })

  it("propage une erreur typée levée par l'adapter", async () => {
    const adapter = makeAdapter({
      confirm: () => {
        throw new Error("boom")
      },
    })

    await expect(
      confirmMissionMatch(MISSION_MATCH_ID, BUYER_ID, adapter),
    ).rejects.toThrow("boom")
  })
})
