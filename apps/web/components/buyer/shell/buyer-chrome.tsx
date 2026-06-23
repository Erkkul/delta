"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"

import { BUYER_NAV, type BuyerNavItem } from "@/lib/navigation/buyer-nav"

/**
 * Chrome de l'espace acheteur (KAN-28 — shell AC-03/04/05).
 *
 * `BuyerHeader` : header sticky + nav horizontale (desktop), masquée en
 * mobile. `BuyerBottomNav` : barre de navigation fixe (mobile uniquement).
 * Fidèle aux maquettes ac-03/ac-04. L'item « Mes envies » (href null) est
 * rendu inerte tant que la wishlist (KAN-30) n'est pas livrée.
 */

function Icon({ name }: { name: BuyerNavItem["icon"] }): ReactNode {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )
    case "box":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      )
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/acheteur") return pathname === "/acheteur"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BuyerHeader({ initial }: { initial: string }) {
  const pathname = usePathname()
  const links = BUYER_NAV.filter((i) => !i.mobileOnly)

  return (
    <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-cream-200 bg-cream-50/95 px-6 backdrop-blur">
      <Link href="/acheteur" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-green-800 text-base">
          🐜
        </span>
        <span className="font-display text-xl font-bold text-green-800">
          Delta<span className="text-earth-500">.</span>
        </span>
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {links.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 font-body text-sm font-medium transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-green-50 font-semibold text-green-700"
                  : "text-cream-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              aria-disabled="true"
              title="Bientôt disponible"
              className="cursor-not-allowed rounded-lg px-3 py-1.5 font-body text-sm font-medium text-cream-400"
            >
              {item.label}
            </span>
          ),
        )}
      </nav>

      <Link
        href="/acheteur/profil"
        aria-label="Mon profil"
        className="grid h-9 w-9 place-items-center rounded-full border-2 border-green-200 bg-green-100 font-body text-sm font-semibold text-green-800"
      >
        {initial}
      </Link>
    </header>
  )
}

export function BuyerBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-cream-200 bg-cream-50/95 px-3 pb-3 pt-2 backdrop-blur md:hidden">
      {BUYER_NAV.map((item) => {
        const active = item.href ? isActive(pathname, item.href) : false
        const className = `flex flex-1 flex-col items-center gap-0.5 rounded-[10px] px-2 py-1.5 font-body text-[10px] font-medium ${
          active ? "font-semibold text-green-700" : "text-cream-500"
        }`
        const inner = (
          <>
            <span className="h-[22px] w-[22px]">
              <Icon name={item.icon} />
            </span>
            {item.label}
          </>
        )
        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={className}
          >
            {inner}
          </Link>
        ) : (
          <span
            key={item.label}
            aria-disabled="true"
            title="Bientôt disponible"
            className={`${className} cursor-not-allowed text-cream-400`}
          >
            {inner}
          </span>
        )
      })}
    </nav>
  )
}
