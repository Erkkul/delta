import {
  PRODUCT_STATUS_FR,
} from "@delta/contracts/product"
import { producersRepo, productsRepo } from "@delta/db"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { EditProductClient } from "./edit-client"

import { toProduct } from "@/lib/products/adapters"
import { getServerSupabase } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Édition produit — Delta producteur",
}

/**
 * Page d'édition d'un produit existant (KAN-20 — PR-05, mode `edit`).
 *
 * Charge le produit via le repo (RLS owner appliquée). 404 si introuvable.
 */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/welcome")

  const producer = await producersRepo.findByUserId(supabase, user.id)
  if (!producer) {
    redirect("/onboarding/producteur")
  }

  const row = await productsRepo.findById(supabase, id, user.id)
  if (!row) notFound()
  const product = toProduct(row)

  return (
    <div className="px-6 py-8 desktop:px-10 desktop:py-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-3 flex items-center gap-2 text-sm text-cream-500">
          <Link
            href="/producer/catalogue"
            className="text-cream-600 transition-colors hover:text-green-700"
          >
            Catalogue
          </Link>
          <svg
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="text-cream-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="truncate font-medium text-cream-800">
            {product.name}
          </span>
        </div>

        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-cream-500">
          PR-05 · Édition produit
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-green-900">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-cream-600">
              Modifiez les détails et la disponibilité de ce produit. Les
              voisins voient les changements en temps réel.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider ${
              product.status === "active"
                ? "border-green-200 bg-green-100 text-green-800"
                : product.status === "draft"
                  ? "border-cream-300 bg-cream-100 text-cream-700"
                  : "border-cream-300 bg-cream-100 text-cream-600"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${product.status === "active" ? "bg-green-600" : "bg-cream-500"}`}
            />
            {PRODUCT_STATUS_FR[product.status]}
          </span>
        </div>

        <div className="mt-6">
          <EditProductClient
            initial={{
              id: product.id,
              name: product.name,
              description: product.description,
              category: product.category,
              packaging: product.packaging,
              unit_price_cents: product.unit_price_cents,
              stock: product.stock,
              availability_from: product.availability_from,
              availability_to: product.availability_to,
              status: product.status,
              photos: product.photos,
            }}
            producerName={producer.display_name ?? "Mon catalogue"}
            producerCity={producer.pickup_public_zone}
          />
        </div>
      </div>
    </div>
  )
}
