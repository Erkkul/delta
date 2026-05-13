import {
  type Role,
  RoleSelectionInput,
  type RoleSelectionOutput,
} from "@delta/contracts/auth"

import { AuthValidationError } from "../errors"

import { normalizeRoles } from "./role"

export type RolesPersistAdapter = {
  updateRoles(userId: string, roles: Role[]): Promise<{ roles: Role[] }>
}

/**
 * Use case `applyRoleSelection` (AU-06). Valide l'input (1..3 rôles
 * distincts), normalise dans l'ordre canonique (acheteur, rameneur,
 * producteur), puis délègue la persistance à l'adapter.
 *
 * Aucun garde-fou métier supplémentaire ici : la décision produit
 * 2026-05-03 autorise n'importe quelle combinaison de rôles. La
 * vérification SIRET (producteur) reste asynchrone et bloque la
 * publication des produits, pas la sélection du rôle.
 */
export async function applyRoleSelection(
  userId: string,
  input: unknown,
  persist: RolesPersistAdapter,
): Promise<RoleSelectionOutput> {
  const parsed = RoleSelectionInput.safeParse(input)
  if (!parsed.success) {
    throw new AuthValidationError(
      "Sélection de rôle invalide.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const normalized = normalizeRoles(parsed.data.roles)
  const result = await persist.updateRoles(userId, normalized)
  return { userId, roles: result.roles }
}
