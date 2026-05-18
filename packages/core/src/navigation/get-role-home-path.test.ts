import { describe, expect, it } from "vitest"

import { getRoleHomePath } from "./get-role-home-path"

describe("getRoleHomePath", () => {
  it("renvoie /welcome quand aucun rôle n'est sélectionné", () => {
    expect(getRoleHomePath([])).toBe("/welcome")
  })

  it("renvoie /producer pour un compte producteur seul", () => {
    expect(getRoleHomePath(["producteur"])).toBe("/producer")
  })

  it("renvoie /acheteur pour un compte acheteur seul", () => {
    expect(getRoleHomePath(["acheteur"])).toBe("/acheteur")
  })

  it("renvoie /rameneur pour un compte rameneur seul", () => {
    expect(getRoleHomePath(["rameneur"])).toBe("/rameneur")
  })

  it("priorise producteur sur acheteur en cumul", () => {
    expect(getRoleHomePath(["producteur", "acheteur"])).toBe("/producer")
  })

  it("priorise producteur sur rameneur en cumul", () => {
    expect(getRoleHomePath(["producteur", "rameneur"])).toBe("/producer")
  })

  it("priorise acheteur sur rameneur quand pas producteur", () => {
    expect(getRoleHomePath(["acheteur", "rameneur"])).toBe("/acheteur")
  })

  it("priorise producteur sur tous les autres en triple cumul", () => {
    expect(getRoleHomePath(["producteur", "acheteur", "rameneur"])).toBe(
      "/producer",
    )
  })

  it("est insensible à l'ordre du tableau d'entrée", () => {
    expect(getRoleHomePath(["rameneur", "producteur"])).toBe("/producer")
    expect(getRoleHomePath(["rameneur", "acheteur", "producteur"])).toBe(
      "/producer",
    )
  })
})
