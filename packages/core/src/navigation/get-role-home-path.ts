import { type Role } from "@delta/contracts/auth"

/**
 * Chemin canonique de l'espace authentifié par rôle, source unique pour
 * tout routing post-login / post-onboarding et pour le gating de layouts
 * `/producer/*`, `/acheteur/*`, `/rameneur/*` (KAN-18 et suivants).
 */
const ROLE_HOME_PATHS = {
  producteur: "/producer",
  acheteur: "/acheteur",
  rameneur: "/rameneur",
} as const satisfies Record<Role, string>

/**
 * Ordre de précédence appliqué quand un compte cumule plusieurs rôles.
 * Décision pragmatique : un compte qui inclut le rôle producteur est
 * un compte « pro » dont le tableau de bord producteur est le centre
 * de gravité — il prime sur les espaces acheteur / rameneur.
 */
const ROLE_PRECEDENCE: readonly Role[] = [
  "producteur",
  "acheteur",
  "rameneur",
] as const

/**
 * Retourne l'URL de l'espace d'accueil correspondant aux rôles d'un user.
 *
 * Comportement :
 *   - Si `roles` contient `producteur` → `/producer`
 *   - Sinon si contient `acheteur` → `/acheteur`
 *   - Sinon si contient `rameneur` → `/rameneur`
 *   - Sinon (tableau vide) → `/welcome`
 *
 * Au MVP, les routes `/acheteur` et `/rameneur` ne sont pas encore
 * livrées — un user redirigé là dessus verra un 404 Next. Acceptable :
 * le pattern de routing par rôle est posé et se câblera à l'arrivée
 * des tickets correspondants.
 */
export function getRoleHomePath(roles: readonly Role[]): string {
  for (const role of ROLE_PRECEDENCE) {
    if (roles.includes(role)) return ROLE_HOME_PATHS[role]
  }
  return "/welcome"
}
