import { ProducerPauseInput } from "@delta/contracts/producer"

import {
  ProducerProfileNotFoundError,
  ProducerRoleForbiddenError,
  ProducerValidationError,
} from "../errors"

import {
  type Producer,
  type ProducerAdapter,
  type RoleChecker,
} from "./adapters"

export type SetProducerPauseDeps = ProducerAdapter & RoleChecker

/**
 * Use case `setProducerPause` (KAN-17).
 *
 * Bascule le flag `paused` du producteur (toggle « Boutique en pause » sur
 * PR-09 Paramètres). Quand `paused = true`, le gating RLS de
 * `public.products` rend tous les produits du producteur invisibles côté
 * catalogue acheteur (cf. KAN-20 — placeholder docu dans
 * `supabase/policies/products.sql`).
 *
 * Erreurs typées :
 *   - ProducerRoleForbiddenError
 *   - ProducerValidationError
 *   - ProducerProfileNotFoundError
 *
 * Pas de rate-limit dédié : l'action est binaire, peu sensible (la boutique
 * en pause = no-op côté catalogue, pas d'effet de bord externe).
 */
export async function setProducerPause(
  input: unknown,
  userId: string,
  deps: SetProducerPauseDeps,
): Promise<Producer> {
  if (!(await deps.hasProducerRole(userId))) {
    throw new ProducerRoleForbiddenError()
  }

  const parsed = ProducerPauseInput.safeParse(input)
  if (!parsed.success) {
    throw new ProducerValidationError(
      "Validation du payload échouée.",
      parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    )
  }

  const current = await deps.findByUserId(userId)
  if (!current) {
    throw new ProducerProfileNotFoundError()
  }

  return deps.setPauseState(userId, parsed.data.paused)
}
