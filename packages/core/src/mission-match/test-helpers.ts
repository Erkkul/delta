import { type MissionMatchDetail } from "@delta/contracts/mission-match"
import { vi } from "vitest"

export const BUYER_ID = "00000000-0000-0000-0000-000000000aaa"
export const OTHER_BUYER_ID = "00000000-0000-0000-0000-000000000bbb"
export const MISSION_MATCH_ID = "00000000-0000-0000-0000-000000000111"

export function makeMissionMatchDetail(
  overrides: Partial<MissionMatchDetail> = {},
): MissionMatchDetail {
  return {
    id: MISSION_MATCH_ID,
    status: "pending",
    confirmationDeadline: "2026-05-14T18:00:00.000Z",
    respondedAt: null,
    quantity: 1,
    unitPriceCents: 850,
    totalCents: 850,
    pricing: {
      producerShareCents: 723,
      rameneurShareCents: 85,
      platformShareCents: 42,
    },
    product: {
      id: "00000000-0000-0000-0000-000000000222",
      name: "Miel d'acacia",
    },
    producer: {
      userId: "00000000-0000-0000-0000-000000000333",
      displayName: "Pierre Dupont",
      zone: "Évreux (27)",
    },
    rameneur: {
      userId: "00000000-0000-0000-0000-000000000444",
      displayName: "Sophie M.",
    },
    trip: {
      originLabel: "Évreux",
      destinationLabel: "Paris",
      departDate: "2026-05-14",
    },
    ...overrides,
  }
}

/**
 * Adapter mock par défaut — cf. `product/test-helpers.ts` pour la convention
 * (type inféré, pas annoté `MissionMatchAdapter`, pour garder le typage
 * `vi.fn()` côté assertions).
 */
export function makeAdapter(overrides: Record<string, unknown> = {}) {
  return {
    findDetailForBuyer: vi.fn(() =>
      Promise.resolve<MissionMatchDetail | null>(makeMissionMatchDetail()),
    ),
    confirm: vi.fn(() =>
      Promise.resolve(
        makeMissionMatchDetail({ status: "accepted", respondedAt: "2026-05-13T20:00:00.000Z" }),
      ),
    ),
    decline: vi.fn(() =>
      Promise.resolve(
        makeMissionMatchDetail({ status: "declined", respondedAt: "2026-05-13T20:00:00.000Z" }),
      ),
    ),
    ...overrides,
  }
}
