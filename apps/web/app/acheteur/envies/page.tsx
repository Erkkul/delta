import Link from "next/link"

import { WishlistList } from "@/components/buyer/wishlist/wishlist-list"
import { getServerSupabase } from "@/lib/supabase/server"
import { loadWishlistPage } from "@/lib/wishlist/load"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Mes envies — Delta",
}

/**
 * Mes envies — wishlist privée acheteur (KAN-30 — AC-06).
 *
 * Gating session + rôle `acheteur` assuré par `acheteur/layout.tsx`.
 *
 * Au MVP : liste des envies réelles (état `pending`), compteur « N / 20 »,
 * retrait. Les sections « Match probable » / « Confirmation requise » et le
 * filtrage par statut dépendent du matching (KAN-42) / de la confirmation
 * (KAN-31) et ne sont pas rendues — aucune donnée mockée (posture KAN-28).
 */
export default async function BuyerWishlistPage() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const page = user
    ? await loadWishlistPage(supabase, user.id)
    : { items: [], count: 0, max: 20 }

  const pct = Math.min(100, Math.round((page.count / page.max) * 100))

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-6">
      <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-green-900 md:text-3xl">
        Mes envies
      </h1>
      <p className="mt-1 font-body text-sm text-cream-600">
        Vos envies restent privées. Vous serez prévenu·e dès qu&apos;un rameneur
        peut en apporter une.
      </p>

      <div className="mb-5 mt-4 flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-3.5 py-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-body text-[13px] font-medium text-cream-700">
          <strong className="font-bold text-cream-950">
            {page.count} {page.count > 1 ? "envies" : "envie"}
          </strong>{" "}
          sur {page.max} max
        </span>
      </div>

      {page.items.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 to-green-900 p-6 text-white">
          <p className="font-body text-[10px] font-bold uppercase tracking-[0.1em] text-green-200">
            Votre liste est vide
          </p>
          <h2 className="mt-1.5 font-display text-lg font-bold">
            Ajoutez vos premières envies
          </h2>
          <p className="mt-1.5 font-body text-[13px] leading-relaxed text-white/80">
            Parcourez le catalogue et ajoutez les produits qui vous plaisent.
            Vous serez prévenu·e dès qu&apos;un rameneur peut vous les apporter.
          </p>
          <Link
            href="/acheteur/catalogue"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-body text-[13px] font-semibold text-green-800"
          >
            Parcourir le catalogue →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-cream-500">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-cream-400"
            />
            En attente d&apos;un rameneur
          </h2>
          <WishlistList items={page.items} />
        </section>
      )}
    </main>
  )
}
