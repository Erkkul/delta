"use client"

import { type ProductSnapshot } from "@delta/contracts/product"
import Link from "next/link"
import { useMemo, useState } from "react"

import { CatalogueFilters, type CatalogueFilter } from "@/components/producer/catalogue/catalogue-filters"
import { CatalogueList } from "@/components/producer/catalogue/catalogue-list"
import { type ProductCardItem } from "@/components/producer/catalogue/product-card"

type Item = Pick<
  ProductSnapshot,
  | "id"
  | "name"
  | "category"
  | "packaging"
  | "unit_price_cents"
  | "stock"
  | "availability_from"
  | "availability_to"
  | "status"
>

/**
 * Contenu de `/producer/catalogue` (KAN-20 — PR-04).
 *
 * Le shell (sidebar + topbar mobile + fond crème) est fourni par
 * `apps/web/app/producer/layout.tsx`. Ce client component porte :
 *   - le filtrage côté client (status + recherche FTS sur name/description)
 *   - le rendu de la grille / état vide
 *   - le bouton « Nouveau produit » qui route vers /producer/catalogue/nouveau
 *
 * Au MVP, la stats banner n'affiche que « Produits actifs » dérivé du
 * listing. Les autres KPIs (envies / récup à venir / revenus) sont
 * rendus en placeholder « Bientôt » — câblage à venir (KAN-30 / KAN-19 / KAN-33).
 */
export function CatalogueClient({
  initialItems,
  initialActiveCount,
}: {
  initialItems: Item[]
  initialActiveCount: number
  initialNextCursor: string | null
}) {
  const [items] = useState<Item[]>(initialItems)
  const [status, setStatus] = useState<CatalogueFilter>("all")
  const [q, setQ] = useState("")

  const counts: Record<CatalogueFilter, number> = useMemo(() => {
    return {
      all: items.length,
      active: items.filter((p) => p.status === "active").length,
      draft: items.filter((p) => p.status === "draft").length,
      disabled: items.filter((p) => p.status === "disabled").length,
    }
  }, [items])

  const filtered: ProductCardItem[] = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items
      .filter((p) => status === "all" || p.status === status)
      .filter((p) =>
        needle === ""
          ? true
          : p.name.toLowerCase().includes(needle),
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        packaging: p.packaging,
        unit_price_cents: p.unit_price_cents,
        stock: p.stock,
        availability_from: p.availability_from,
        availability_to: p.availability_to,
        status: p.status,
      }))
  }, [items, status, q])

  const hasFilters = status !== "all" || q.trim() !== ""

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-cream-500">
              Espace producteur
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              Mon catalogue
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Gérez vos produits, leurs prix, leurs stocks et leur disponibilité.
            </p>
          </div>
          <Link
            href="/producer/catalogue/nouveau"
            className="inline-flex h-11 items-center gap-2 rounded-pill bg-green-600 px-5 text-sm font-semibold text-white shadow-active transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-pressed"
          >
            <svg
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nouveau produit
          </Link>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-3 desktop:grid-cols-4">
          <StatCard
            label="Produits actifs"
            value={initialActiveCount.toString()}
            hint={`${counts.active} actuellement publié${counts.active > 1 ? "s" : ""}`}
          />
          <StatCard label="Envies de voisins" value="—" hint="Bientôt" muted />
          <StatCard label="Récupérations à venir" value="—" hint="Bientôt" muted />
          <StatCard label="Revenus du mois" value="—" hint="Bientôt" muted />
        </div>

        <CatalogueFilters
          status={status}
          q={q}
          counts={counts}
          onStatusChange={setStatus}
          onSearchChange={setQ}
        />

        <CatalogueList items={filtered} hasFiltersApplied={hasFilters} />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  muted = false,
}: {
  label: string
  value: string
  hint: string
  muted?: boolean
}) {
  return (
    <div className="rounded-md border border-cream-200 bg-white px-4 py-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-cream-500">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-bold leading-tight ${muted ? "text-cream-400" : "text-green-900"}`}
      >
        {value}
      </div>
      <div
        className={`mt-0.5 text-xs font-medium ${muted ? "text-cream-500" : "text-green-700"}`}
      >
        {hint}
      </div>
    </div>
  )
}
