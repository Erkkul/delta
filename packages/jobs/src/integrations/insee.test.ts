import { describe, expect, it, vi } from "vitest"

import { createInseeClient } from "./insee"

const API_KEY = "test-insee-key"

function mockResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  })
}

describe("createInseeClient.fetchSiretRecord", () => {
  it("envoie la clé d'API dans le header X-INSEE-Api-Key-Integration", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockResponse({ etablissement: { uniteLegale: {} } }))
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    await client.fetchSiretRecord("78945612300012")
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      "https://api.insee.fr/api-sirene/3.11/siret/78945612300012",
    )
    const headers = init.headers as Record<string, string>
    expect(headers["X-INSEE-Api-Key-Integration"]).toBe(API_KEY)
  })

  it("retourne null sur 404 (SIRET inconnu)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("not found", { status: 404 }))
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    const out = await client.fetchSiretRecord("00000000000000")
    expect(out).toBeNull()
  })

  it("extrait denominationUniteLegale (personne morale)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse({
        etablissement: {
          uniteLegale: {
            denominationUniteLegale:
              "EARL Marie Dubois - Maraichage du Bocage",
          },
        },
      }),
    )
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    const out = await client.fetchSiretRecord("78945612300012")
    expect(out?.legal_name_official).toBe(
      "EARL Marie Dubois - Maraichage du Bocage",
    )
  })

  it("retombe sur periodesUniteLegale[0] si la dénomination racine est absente", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse({
        etablissement: {
          uniteLegale: {
            denominationUniteLegale: null,
            periodesUniteLegale: [
              {
                denominationUniteLegale: "REPARATION ENTRETIEN ET MAINTENANCE",
              },
            ],
          },
        },
      }),
    )
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    const out = await client.fetchSiretRecord("30963495400015")
    expect(out?.legal_name_official).toBe(
      "REPARATION ENTRETIEN ET MAINTENANCE",
    )
  })

  it("compose prenom + nom pour les personnes physiques (auto-entrepreneur)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse({
        etablissement: {
          uniteLegale: {
            denominationUniteLegale: null,
            prenomUsuelUniteLegale: "Marie",
            nomUniteLegale: "Dubois",
          },
        },
      }),
    )
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    const out = await client.fetchSiretRecord("12345678900012")
    expect(out?.legal_name_official).toBe("Marie Dubois")
  })

  it("traite [ND] comme une valeur absente (dataset Sirene)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockResponse({
        etablissement: {
          uniteLegale: {
            denominationUniteLegale: "[ND]",
            nomUniteLegale: "[ND]",
          },
        },
      }),
    )
    const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
    const out = await client.fetchSiretRecord("12345678900012")
    expect(out?.legal_name_official).toBeNull()
  })

  it("throw sur 401 / 403 / 5xx (Inngest fera retry)", async () => {
    for (const status of [401, 403, 429, 500, 502, 503]) {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response("nope", { status }))
      const client = createInseeClient({ apiKey: API_KEY, fetchImpl })
      await expect(
        client.fetchSiretRecord("78945612300012"),
      ).rejects.toThrow(/Sirene API/)
    }
  })
})
