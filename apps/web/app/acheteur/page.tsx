import { buyerProfilesRepo } from "@delta/db"
import { catalogueRepo, mapCatalogueProduct } from "@delta/db/catalogue"
import Link from "next/link"

import { ProductCard } from "@/components/buyer/catalogue/product-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { getServerSupabase } from "@/lib/supabase/server"
import { loadWishlistPage } from "@/lib/wishlist/load"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Accueil — Delta",
}

/**
 * Accueil acheteur (KAN-28 — AC-03).
 *
 * Gating session + rôle `acheteur` assuré par `acheteur/layout.tsx`.
 *
 * Au MVP : greeting + section « À découvrir » alimentée par le **vrai**
 * catalogue public (derniers produits visibles) + aperçu « Mes envies »
 * (wishlist réelle, KAN-30). La section « Disponible cette semaine » (matching
 * trajets) reste **différée** (KAN-42) — aucune donnée mockée, conforme à la
 * posture KAN-19/27.
 */
export default async function BuyerHomePage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user
    ? await buyerProfilesRepo.findByUserId(supabase, user.id)
    : null
  const firstName = profile?.display_name?.trim().split(" ")[0]

  const { items } = await catalogueRepo.list(supabase, { limit: 8 })
  const products = items.map(mapCatalogueProduct)

  const wishlist = user
    ? await loadWishlistPage(supabase, user.id)
    : { items: [], count: 0, max: 20 }
  const wishlistPreview = wishlist.items.slice(0, 4)

  return (
    <main className="mx-auto w-full max-w-[920px] px-5 py-6">
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-green-900 md:text-3xl">
          Bonjour{firstName ? ` ${firstName}` : ""}
        </h1>
        <p className="font-body text-sm text-cream-600">
          Découvrez les producteurs locaux accessibles près de chez vous.
        </p>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-green-900">
            À découvrir
          </h2>
          <Link
            href="/acheteur/catalogue"
            className="font-body text-[13px] font-medium text-green-700 hover:text-green-800"
          >
            Voir le catalogue →
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon="🌱"
            text="Aucun produit disponible pour l'instant. Revenez bientôt : de nouveaux producteurs rejoignent Delta régulièrement."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-green-900">
            Mes envies
          </h2>
          {wishlist.count > 0 && (
            <Link
              href="/acheteur/envies"
              className="font-body text-[13px] font-medium text-green-700 hover:text-green-800"
            >
              Voir mes envies →
            </Link>
          )}
        </div>

        {wishlistPreview.length === 0 ? (
          <EmptyState
            icon="❤️"
            text="Vos envies apparaîtront ici. Ajoutez des produits à votre liste pour être prévenu·e quand un rameneur peut vous les apporter."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {wishlistPreview.map((item) => (
              <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
