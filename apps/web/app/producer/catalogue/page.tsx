import { productsRepo, type ProductRow } from "@delta/db"
import { redirect } from "next/navigation"

import { CatalogueClient } from "./catalogue-client"

import { toProduct } from "@/lib/products/adapters"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Mon catalogue — Delta producteur",
}

/**
 * Page liste catalogue producteur (KAN-20 — PR-04).
 *
 * Server Component qui :
 *   1. Vérifie la session (le layout parent /producer/layout.tsx fait
 *      déjà ce travail mais on garde un guard explicite — pattern KAN-17).
 *   2. Charge la première page de produits non soft-deleted, tous statuts
 *      confondus, ordre `created_at DESC`.
 *   3. Passe la liste au client component (filtres / recherche / actions
 *      vivent côté client).
 */
export default async function CataloguePage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/welcome")

  const page = await productsRepo.findByOwner(supabase, user.id, {
    status: "all",
    q: null,
    limit: 50,
    cursor: null,
  })

  const items = page.items.map((row: ProductRow) => toProduct(row))
  const activeCount = items.filter((p) => p.status === "active").length

  return (
    <CatalogueClient
      initialItems={items}
      initialActiveCount={activeCount}
      initialNextCursor={page.nextCursor}
    />
  )
}
