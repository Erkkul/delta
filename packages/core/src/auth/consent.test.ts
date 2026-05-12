import { describe, expect, it } from "vitest"

import {
  buildConsentRecord,
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "./consent"

describe("buildConsentRecord", () => {
  it("renvoie un enregistrement avec la version et un timestamp ISO", () => {
    const now = new Date("2026-05-12T10:30:00.000Z")
    const record = buildConsentRecord({
      termsVersion: "2026-05-12",
      privacyVersion: "2026-05-12",
      now,
    })
    expect(record).toEqual({
      termsVersion: "2026-05-12",
      privacyVersion: "2026-05-12",
      acceptedAt: "2026-05-12T10:30:00.000Z",
    })
  })

  it("utilise new Date() par défaut", () => {
    const before = Date.now()
    const record = buildConsentRecord({
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    })
    const after = Date.now()
    const ts = Date.parse(record.acceptedAt)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})
