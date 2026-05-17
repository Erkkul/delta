import { describe, expect, it } from "vitest"

import {
  groupRequirementsByLabel,
  translateRequirements,
} from "./stripe-requirements-i18n"

describe("translateRequirements", () => {
  it("traduit une clé connue", () => {
    const out = translateRequirements(["individual.verification.document"])
    expect(out).toEqual([
      {
        key: "individual.verification.document",
        label: "Pièce d'identité du représentant",
        fallback: false,
      },
    ])
  })

  it("traduit chaque clé d'adresse vers le même label « Adresse personnelle »", () => {
    const out = translateRequirements([
      "individual.address.line1",
      "individual.address.city",
      "individual.address.postal_code",
    ])
    expect(out.map((r) => r.label)).toEqual([
      "Adresse personnelle",
      "Adresse personnelle",
      "Adresse personnelle",
    ])
    expect(out.every((r) => !r.fallback)).toBe(true)
  })

  it("traduit chaque clé de date de naissance vers « Date de naissance »", () => {
    const out = translateRequirements([
      "individual.dob.day",
      "individual.dob.month",
      "individual.dob.year",
    ])
    expect(out.every((r) => r.label === "Date de naissance")).toBe(true)
  })

  it("traduit external_account → « Compte bancaire (IBAN) »", () => {
    const out = translateRequirements(["external_account"])
    expect(out[0]?.label).toBe("Compte bancaire (IBAN)")
  })

  it("supporte les alias representative.* (comptes company)", () => {
    const out = translateRequirements([
      "representative.first_name",
      "representative.verification.document",
    ])
    expect(out[0]?.label).toBe("Identité du représentant")
    expect(out[1]?.label).toBe("Pièce d'identité du représentant")
  })

  it("traduit tos_acceptance.* vers « Acceptation des CGU Stripe »", () => {
    const out = translateRequirements([
      "tos_acceptance.date",
      "tos_acceptance.ip",
    ])
    expect(out.every((r) => r.label === "Acceptation des CGU Stripe")).toBe(true)
  })

  it("traduit business_profile.url et business_profile.mcc", () => {
    const out = translateRequirements([
      "business_profile.url",
      "business_profile.mcc",
    ])
    expect(out[0]?.label).toBe("Site internet de la ferme")
    expect(out[1]?.label).toBe("Catégorie d'activité")
  })

  it("retourne la clé brute avec fallback=true sur une clé inconnue", () => {
    const out = translateRequirements(["unknown.requirement.key"])
    expect(out).toEqual([
      {
        key: "unknown.requirement.key",
        label: "unknown.requirement.key",
        fallback: true,
      },
    ])
  })

  it("ne crashe pas sur une liste vide", () => {
    expect(translateRequirements([])).toEqual([])
  })

  it("préserve l'ordre des clés en entrée", () => {
    const out = translateRequirements([
      "external_account",
      "individual.first_name",
      "tos_acceptance.date",
    ])
    expect(out.map((r) => r.key)).toEqual([
      "external_account",
      "individual.first_name",
      "tos_acceptance.date",
    ])
  })

  it("mélange clés connues et inconnues sans crasher", () => {
    const out = translateRequirements([
      "individual.first_name",
      "unknown.future.field",
      "external_account",
    ])
    expect(out[0]?.fallback).toBe(false)
    expect(out[1]?.fallback).toBe(true)
    expect(out[2]?.fallback).toBe(false)
  })
})

describe("groupRequirementsByLabel", () => {
  it("regroupe les clés ayant le même label", () => {
    const translated = translateRequirements([
      "individual.address.line1",
      "individual.address.city",
      "individual.address.postal_code",
    ])
    const grouped = groupRequirementsByLabel(translated)
    expect(grouped).toEqual([
      {
        label: "Adresse personnelle",
        keys: [
          "individual.address.line1",
          "individual.address.city",
          "individual.address.postal_code",
        ],
        fallback: false,
      },
    ])
  })

  it("préserve l'ordre de première apparition entre les labels", () => {
    const translated = translateRequirements([
      "external_account",
      "individual.address.city",
      "external_account",
      "individual.address.line1",
    ])
    const grouped = groupRequirementsByLabel(translated)
    expect(grouped.map((g) => g.label)).toEqual([
      "Compte bancaire (IBAN)",
      "Adresse personnelle",
    ])
  })

  it("priorise non-fallback si au moins un item du groupe a un vrai label", () => {
    // Cas théorique : si un label fallback partage la même clé qu'un label
    // mappé (impossible en pratique mais on teste la robustesse de la
    // règle « priorise non-fallback »).
    const translated = [
      { key: "x.foo", label: "X foo", fallback: true },
      { key: "x.bar", label: "X foo", fallback: false },
    ]
    const grouped = groupRequirementsByLabel(translated)
    expect(grouped[0]?.fallback).toBe(false)
  })

  it("conserve fallback=true si tous les items du groupe sont fallback", () => {
    const translated = translateRequirements([
      "unknown.a",
      "unknown.b",
    ])
    const grouped = groupRequirementsByLabel(translated)
    expect(grouped[0]?.fallback).toBe(true)
    expect(grouped[1]?.fallback).toBe(true)
  })

  it("retourne un tableau vide pour une entrée vide", () => {
    expect(groupRequirementsByLabel([])).toEqual([])
  })
})
