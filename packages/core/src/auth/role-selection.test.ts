import { describe, expect, it, vi } from "vitest"

import { AuthValidationError } from "../errors"

import { applyRoleSelection } from "./role-selection"

const userId = "11111111-1111-4111-8111-111111111111"

describe("applyRoleSelection", () => {
  it("normalise et persiste un rôle unique", async () => {
    const updateRoles = vi
      .fn()
      .mockResolvedValue({ roles: ["rameneur"] })
    const result = await applyRoleSelection(
      userId,
      { roles: ["rameneur"] },
      { updateRoles },
    )
    expect(result).toEqual({ userId, roles: ["rameneur"] })
    expect(updateRoles).toHaveBeenCalledWith(userId, ["rameneur"])
  })

  it("normalise dans l'ordre canonique avant la persistance", async () => {
    const updateRoles = vi.fn().mockResolvedValue({
      roles: ["acheteur", "rameneur", "producteur"],
    })
    await applyRoleSelection(
      userId,
      { roles: ["producteur", "acheteur", "rameneur"] },
      { updateRoles },
    )
    expect(updateRoles).toHaveBeenCalledWith(userId, [
      "acheteur",
      "rameneur",
      "producteur",
    ])
  })

  it("rejette un tableau vide", async () => {
    await expect(
      applyRoleSelection(userId, { roles: [] }, { updateRoles: vi.fn() }),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette les doublons", async () => {
    await expect(
      applyRoleSelection(
        userId,
        { roles: ["acheteur", "acheteur"] },
        { updateRoles: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("rejette un rôle inconnu", async () => {
    await expect(
      applyRoleSelection(
        userId,
        { roles: ["admin"] },
        { updateRoles: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(AuthValidationError)
  })

  it("propage l'erreur de l'adapter telle quelle", async () => {
    const boom = new Error("db down")
    const updateRoles = vi.fn().mockRejectedValue(boom)
    await expect(
      applyRoleSelection(
        userId,
        { roles: ["rameneur"] },
        { updateRoles },
      ),
    ).rejects.toBe(boom)
  })
})
