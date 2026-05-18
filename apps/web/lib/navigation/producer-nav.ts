import { type Role } from "@delta/contracts/auth"

/**
 * Item de navigation latérale (sidebar) générique. Réutilisé par les
 * sidebars producteur / acheteur / rameneur (KAN-18 et suivants).
 *
 * - `href` : cible Next. Omis si `disabled` (item visible mais inactif).
 * - `iconKey` : clé de lookup côté composant, pas un noeud React (pour
 *   garder la config sérialisable et server-friendly).
 * - `disabled` : item affiché en grisé + tooltip neutre « Disponible
 *   bientôt ». Utilisé pour les routes pas encore livrées.
 */
export type SidebarItem = {
  href?: string
  label: string
  iconKey: SidebarIconKey
  badge?: string | number
  disabled?: boolean
}

export type SidebarSection = {
  heading: string
  items: SidebarItem[]
}

export type SidebarIconKey =
  | "dashboard"
  | "pickups"
  | "products"
  | "add-product"
  | "sales"
  | "profile"
  | "settings"

export type AppSidebarConfig = {
  role: Role
  roleLabel: string
  sections: SidebarSection[]
}

/**
 * Sidebar producteur — items canoniques cohérents avec la maquette PR-03
 * `design/maquettes/producteur/pr-03-dashboard.html` (sections Activité /
 * Catalogue / Finances / Profil).
 *
 * État au MVP (KAN-18) : seuls les écrans déjà livrés par KAN-17 sont
 * actifs (Tableau de bord, Profil public, Paramètres). Les autres
 * items sont `disabled` jusqu'à ce que leurs tickets respectifs livrent
 * leur route (KAN-20 catalogue, KAN-46/47 pickups, KAN-19 ventes).
 */
export const PRODUCER_SIDEBAR: AppSidebarConfig = {
  role: "producteur",
  roleLabel: "Producteur",
  sections: [
    {
      heading: "Activité",
      items: [
        { href: "/producer", label: "Tableau de bord", iconKey: "dashboard" },
        {
          label: "Récupérations",
          iconKey: "pickups",
          disabled: true,
        },
      ],
    },
    {
      heading: "Catalogue",
      items: [
        {
          label: "Mes produits",
          iconKey: "products",
          disabled: true,
        },
        {
          label: "Ajouter un produit",
          iconKey: "add-product",
          disabled: true,
        },
      ],
    },
    {
      heading: "Finances",
      items: [
        {
          label: "Ventes & virements",
          iconKey: "sales",
          disabled: true,
        },
      ],
    },
    {
      heading: "Profil",
      items: [
        {
          href: "/producer/profile",
          label: "Profil public",
          iconKey: "profile",
        },
        {
          href: "/producer/settings",
          label: "Paramètres",
          iconKey: "settings",
        },
      ],
    },
  ],
}
