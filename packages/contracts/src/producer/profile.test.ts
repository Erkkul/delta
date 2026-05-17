import { describe, expect, it } from "vitest"

import {
  PRODUCER_LABEL_FR,
  PRODUCER_PHOTO_MIME_TYPES,
  ProducerPauseInput,
  ProducerPhotoUploadInput,
  ProducerProfileSnapshot,
  ProducerProfileUpdateInput,
} from "./profile"

describe("ProducerProfileUpdateInput", () => {
  it("accepte un patch vide", () => {
    expect(ProducerProfileUpdateInput.safeParse({}).success).toBe(true)
  })

  it("accepte les champs publics valides", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      display_name: "EARL Dubois — Maraîchage du Bocage",
      public_description: "Maraîchère bio depuis 12 ans.",
      labels: ["bio_ab", "hve_3"],
      farm_photos: [{ url: "https://example.com/farm1.jpg" }],
      pickup_public_zone: "Bocage normand · Évreux (27)",
      pickup_address: "234 Route du Bocage, 27000 Évreux",
      pickup_longitude: 1.1503,
      pickup_latitude: 49.024,
      pickup_days: ["mon", "wed", "sat"],
      pickup_hours_start: "08:00",
      pickup_hours_end: "18:00",
    })
    expect(r.success).toBe(true)
  })

  it("refuse un nom trop court", () => {
    const r = ProducerProfileUpdateInput.safeParse({ display_name: "A" })
    expect(r.success).toBe(false)
  })

  it("refuse une description > 500 caractères", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      public_description: "x".repeat(501),
    })
    expect(r.success).toBe(false)
  })

  it("refuse plus de 3 photos de ferme", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      farm_photos: [
        { url: "https://x/1.jpg" },
        { url: "https://x/2.jpg" },
        { url: "https://x/3.jpg" },
        { url: "https://x/4.jpg" },
      ],
    })
    expect(r.success).toBe(false)
  })

  it("refuse un label inconnu", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      labels: ["bio_ab", "not-a-label"],
    })
    expect(r.success).toBe(false)
  })

  it("refuse un horaire mal formé", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      pickup_hours_start: "25:00",
    })
    expect(r.success).toBe(false)
  })

  it("refuse l'heure de fin avant l'heure de début", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      pickup_hours_start: "18:00",
      pickup_hours_end: "08:00",
    })
    expect(r.success).toBe(false)
  })

  it("refuse une coordonnée seule (longitude sans latitude)", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      pickup_address: "234 Route du Bocage, 27000 Évreux",
      pickup_longitude: 1.1503,
    })
    expect(r.success).toBe(false)
  })

  it("refuse une coordonnée hors plage", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      pickup_longitude: 200,
      pickup_latitude: 49,
    })
    expect(r.success).toBe(false)
  })

  it("refuse des champs inconnus (strict)", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      foo: "bar",
    })
    expect(r.success).toBe(false)
  })

  it("accepte la suppression d'un champ via null", () => {
    const r = ProducerProfileUpdateInput.safeParse({
      profile_photo_url: null,
      public_description: null,
      pickup_address: null,
    })
    expect(r.success).toBe(true)
  })
})

describe("ProducerPhotoUploadInput", () => {
  it("accepte un upload logo sans slot", () => {
    const r = ProducerPhotoUploadInput.safeParse({
      kind: "logo",
      content_type: "image/png",
    })
    expect(r.success).toBe(true)
  })

  it("accepte un upload farm avec slot 0/1/2", () => {
    for (const slot of [0, 1, 2]) {
      const r = ProducerPhotoUploadInput.safeParse({
        kind: "farm",
        slot,
        content_type: "image/webp",
      })
      expect(r.success).toBe(true)
    }
  })

  it("refuse un slot > 2", () => {
    const r = ProducerPhotoUploadInput.safeParse({
      kind: "farm",
      slot: 3,
      content_type: "image/jpeg",
    })
    expect(r.success).toBe(false)
  })

  it("refuse un MIME hors whitelist", () => {
    const r = ProducerPhotoUploadInput.safeParse({
      kind: "logo",
      content_type: "image/gif",
    })
    expect(r.success).toBe(false)
  })
})

describe("ProducerPauseInput", () => {
  it("accepte true/false", () => {
    expect(ProducerPauseInput.safeParse({ paused: true }).success).toBe(true)
    expect(ProducerPauseInput.safeParse({ paused: false }).success).toBe(true)
  })

  it("refuse une chaîne", () => {
    expect(
      ProducerPauseInput.safeParse({ paused: "true" as unknown as boolean })
        .success,
    ).toBe(false)
  })
})

describe("ProducerProfileSnapshot", () => {
  it("accepte un snapshot complet", () => {
    const r = ProducerProfileSnapshot.safeParse({
      id: "00000000-0000-0000-0000-000000000001",
      display_name: "EARL Dubois",
      public_description: null,
      profile_photo_url: null,
      farm_photos: [],
      labels: [],
      pickup_public_zone: null,
      pickup_address: null,
      pickup_days: [],
      pickup_hours_start: null,
      pickup_hours_end: null,
      paused: false,
      paused_at: null,
      siret_status: "verified",
      stripe_status: "active",
      payouts_enabled: true,
    })
    expect(r.success).toBe(true)
  })
})

describe("PRODUCER_LABEL_FR", () => {
  it("expose les 5 libellés FR", () => {
    expect(Object.keys(PRODUCER_LABEL_FR)).toHaveLength(5)
    expect(PRODUCER_LABEL_FR.bio_ab).toBe("Bio AB")
  })
})

describe("PRODUCER_PHOTO_MIME_TYPES", () => {
  it("liste jpeg, png, webp", () => {
    expect(PRODUCER_PHOTO_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ])
  })
})
