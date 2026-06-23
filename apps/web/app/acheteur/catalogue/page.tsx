import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"

import { CatalogueBrowser } from "@/components/buyer/catalogue/catalogue-browser"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Catalogue — Delta",
}

/**
 * Catalogue parcourable acheteur (KAN-28 — AC-04).
 *
 * Le gating session + rôle `acheteur` est assuré par `acheteur/layout.tsx`.
 * Rendu initial server-side (première page du catalogue public), puis
 * recherche / filtres / pagination côté client via `GET /api/v1/catalogue`.
 */
export default async function BuyerCataloguePage() {
  const supabase = await getServerSupabase()
  const { items, nextCursor } = await catalogueRepo.list(supabase, { limit: 20 })

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 py-6">
      <header className="mb-4 flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-green-900">
          Catalogue
        </h1>
        <p className="font-body text-sm text-cream-600">
          Les produits de producteurs vérifiés près de chez vous.
        </p>
      </header>

      <CatalogueBrowser
        initialItems={items.map(mapCatalogueProduct)}
        initialNextCursor={nextCursor}
      />
    </main>
  )
}
