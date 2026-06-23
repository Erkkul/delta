/**
 * Items de navigation de l'espace acheteur (KAN-28 — shell AC-03/04/05).
 *
 * `href: null` = destination pas encore livrée (rendue inerte/désactivée).
 * « Mes envies » dépend de la wishlist KAN-30.
 */
export type BuyerNavItem = {
  label: string
  href: string | null
  icon: "home" | "search" | "heart" | "box" | "user"
  /** Affiché dans la bottom-nav mobile uniquement. */
  mobileOnly?: boolean
}

export const BUYER_NAV: BuyerNavItem[] = [
  { label: "Accueil", href: "/acheteur", icon: "home" },
  { label: "Catalogue", href: "/acheteur/catalogue", icon: "search" },
  { label: "Mes envies", href: null, icon: "heart" },
  { label: "Commandes", href: "/acheteur/historique", icon: "box" },
  { label: "Profil", href: "/acheteur/profil", icon: "user", mobileOnly: true },
]
