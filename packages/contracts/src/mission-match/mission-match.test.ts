import { describe, expect, it } from "vitest"

import { MissionMatchDetail, MissionMatchStatus } from "./mission-match"

const validDetail = {
  id: "8f14e45f-ceea-4c65-a077-c1a71fd9b7fd",
  status: "pending",
  confirmationDeadline: "2026-09-12T18:00:00.000Z",
  respondedAt: null,
  quantity: 1,
  unitPriceCents: 850,
  totalCents: 850,
  pricing: {
    producerShareCents: 723,
    rameneurShareCents: 85,
    platformShareCents: 42,
  },
  product: { id: "8f14e45f-ceea-4c65-a077-c1a71fd9b7fe", name: "Miel d'acacia" },
  producer: {
    userId: "8f14e45f-ceea-4c65-a077-c1a71fd9b7ff",
    displayName: "Pierre Dupont",
    zone: "Évreux (27)",
  },
  rameneur: {
    userId: "8f14e45f-ceea-4c65-a077-c1a71fd9b800",
    displayName: "Sophie M.",
  },
  trip: {
    originLabel: "Évreux",
    destinationLabel: "Paris",
    departDate: "2026-05-14",
  },
}

describe("MissionMatchStatus", () => {
  it("accepte les 4 statuts valides", () => {
    for (const status of ["pending", "accepted", "declined", "expired"]) {
      expect(MissionMatchStatus.safeParse(status).success).toBe(true)
    }
  })

  it("rejette un statut inconnu", () => {
    expect(MissionMatchStatus.safeParse("confirmed").success).toBe(false)
  })
})

describe("MissionMatchDetail", () => {
  it("valide un détail bien formé", () => {
    expect(MissionMatchDetail.safeParse(validDetail).success).toBe(true)
  })

  it("rejette une quantité nulle ou négative", () => {
    const result = MissionMatchDetail.safeParse({ ...validDetail, quantity: 0 })
    expect(result.success).toBe(false)
  })

  it("rejette un prix unitaire négatif", () => {
    const result = MissionMatchDetail.safeParse({
      ...validDetail,
      unitPriceCents: -1,
    })
    expect(result.success).toBe(false)
  })

  it("accepte respondedAt null", () => {
    expect(MissionMatchDetail.safeParse(validDetail).success).toBe(true)
  })
})
