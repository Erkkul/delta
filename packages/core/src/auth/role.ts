import { type Role } from "@delta/contracts/auth"

/**
 * Mapping rôle → première étape d'onboarding (cf. KAN-2 spec / décisions
 * produit 2026-05-03 multi-rôles progressif). À la création de compte,
 * l'utilisateur est redirigé vers le flux correspondant à son rôle initial.
 */
const ONBOARDING_PATHS: Record<Role, string> = {
  acheteur: "/onboarding/acheteur",
  rameneur: "/onboarding/rameneur",
  producteur: "/onboarding/producteur",
}

export function onboardingPathForRole(role: Role): string {
  return ONBOARDING_PATHS[role]
}

/**
 * Le rôle initial est immutable au signup (cf. proposal.md). Cette fonction
 * normalise une string brute (querystring, formulaire) en Role typé, ou
 * `null` si la valeur n'est pas un rôle reconnu.
 */
export function parseRole(input: unknown): Role | null {
  if (typeof input !== "string") return null
  if (input === "acheteur" || input === "rameneur" || input === "producteur") {
    return input
  }
  return null
}
