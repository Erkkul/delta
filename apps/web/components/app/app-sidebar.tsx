"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarIcon } from "./sidebar-icons"

import {
  type AppSidebarConfig,
  type SidebarItem,
} from "@/lib/navigation/producer-nav"

/**
 * Sidebar de navigation pour les espaces authentifiés multi-pages
 * (producteur au MVP — KAN-18, puis acheteur et rameneur). Générique,
 * paramétrée par la `config` fournie par le layout serveur parent.
 *
 * - L'item actif est calculé via `usePathname()` (préfixe le plus long).
 * - Les items `disabled` sont visibles (cohérence maquette PR-03) mais
 *   non-actionables : pas de `href`, `aria-disabled="true"`, opacité
 *   réduite, tooltip neutre « Disponible bientôt ». Focusables au
 *   clavier pour annoncer leur état aux lecteurs d'écran.
 *
 * Variante d'affichage : `variant="drawer"` retire la position sticky
 * pour permettre le rendu dans le drawer mobile.
 */
export function AppSidebar({
  config,
  user,
  variant = "rail",
}: {
  config: AppSidebarConfig
  user: AppSidebarUser
  variant?: "rail" | "drawer"
}) {
  const pathname = usePathname() ?? ""
  const activePath = pickActivePath(pathname, config)

  const containerClass =
    variant === "drawer"
      ? "flex h-full w-full flex-col bg-white"
      : "sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-cream-200 bg-white tablet:flex"

  return (
    <aside className={containerClass} aria-label="Navigation producteur">
      <div className="flex items-center gap-2.5 border-b border-cream-100 px-6 pb-4 pt-5">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-green-800 text-lg leading-none">
          <span aria-hidden="true">🐜</span>
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-none text-green-800">
            Delta<span className="text-earth-500">.</span>
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-500">
            {config.roleLabel}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {config.sections.map((section) => (
          <div key={section.heading} className="pt-2">
            <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-cream-500">
              {section.heading}
            </div>
            {section.items.map((item) => (
              <SidebarLink
                key={item.label}
                item={item}
                active={!item.disabled && item.href === activePath}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="m-3 flex items-center gap-2.5 rounded-md bg-green-50 p-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-earth-100 text-base">
          <span aria-hidden="true">🌻</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-green-900">
            {user.displayName ?? user.email}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-cream-600">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"
            />
            <span className="truncate">{user.statusLabel}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export type AppSidebarUser = {
  email: string
  displayName: string | null
  statusLabel: string
}

function SidebarLink({
  item,
  active,
}: {
  item: SidebarItem
  active: boolean
}) {
  const common =
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
  if (item.disabled) {
    return (
      <span
        aria-disabled="true"
        title="Disponible bientôt"
        tabIndex={0}
        className={`${common} cursor-not-allowed text-cream-500 opacity-60`}
      >
        <SidebarIcon iconKey={item.iconKey} />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cream-400">
          Bientôt
        </span>
      </span>
    )
  }
  const cls = active
    ? `${common} bg-green-100 font-semibold text-green-800`
    : `${common} font-medium text-cream-700 hover:bg-green-50 hover:text-green-700`
  return (
    <Link
      href={item.href ?? "#"}
      className={cls}
      aria-current={active ? "page" : undefined}
    >
      <SidebarIcon iconKey={item.iconKey} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined ? (
        <span className="rounded-pill bg-[#C75B5B] px-1.5 py-0.5 text-[9px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

function pickActivePath(pathname: string, config: AppSidebarConfig): string {
  let best = ""
  for (const section of config.sections) {
    for (const item of section.items) {
      if (!item.href || item.disabled) continue
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (item.href.length > best.length) best = item.href
      }
    }
  }
  return best
}
