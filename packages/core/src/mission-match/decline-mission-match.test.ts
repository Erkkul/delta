import { describe, expect, it } from "vitest"

import { declineMissionMatch } from "./decline-mission-match"
import {
  BUYER_ID,
  MISSION_MATCH_ID,
  makeAdapter,
} from "./test-helpers"

describe("declineMissionMatch", () => {
  it("délègue à l'adapter et renvoie le match refusé", async () => {
    const adapter = makeAdapter()

    const result = await declineMissionMatch(MISSION_MATCH_ID, BUYER_ID, adapter)

    expect(adapter.decline).toHaveBeenCalledWith(MISSION_MATCH_ID, BUYER_ID)
    expect(result.status).toBe("declined")
  })
})
