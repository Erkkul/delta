import { type Role } from "@delta/contracts/auth"

/**
 * Mapping rôle → première étape d'onboarding (cf. KAN-2 spec / décisions
 * produit 2026-05-03 multi-rôles progressif). Utilisé quand on ne s'occupe
 * que d'un rôle isolé. Pour un set multi-rôle, utiliser
 * `nextOnboardingPath(roles[])` qui applique la priorité du flow.
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
 * Priorité de l'onboarding multi-rôle, reprise de la maquette AU-06 :
 *   rameneur > producteur > acheteur > /welcome (fin de flow auth)
 *
 * Le rameneur a le plus d'onboarding (KYC + véhicule), on l'attaque
 * en premier. Le producteur enchaîne avec son SIRET, puis l'acheteur
 * avec son adresse. Cohérent avec specs/KAN-2/design.md.
 */
const ROLE_PRIORITY: readonly Role[] = [
  "rameneur",
  "producteur",
  "acheteur",
] as const

export function nextOnboardingPath(roles: readonly Role[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return ONBOARDING_PATHS[r]
  }
  return "/welcome"
}

/**
 * Normalise une string brute en `Role` typé. `null` si non reconnu.
 */
export function parseRole(input: unknown): Role | null {
  if (typeof input !== "string") return null
  if (input === "acheteur" || input === "rameneur" || input === "producteur") {
    return input
  }
  return null
}

/**
 * Dédoublonne et valide un tableau de rôles. Renvoie une copie triée
 * dans l'ordre canonique de l'enum (acheteur, rameneur, producteur)
 * pour stabilité côté DB et tests.
 */
export function normalizeRoles(roles: readonly Role[]): Role[] {
  const set = new Set<Role>(roles)
  const canonical: Role[] = ["acheteur", "rameneur", "producteur"]
  return canonical.filter((r) => set.has(r))
}
