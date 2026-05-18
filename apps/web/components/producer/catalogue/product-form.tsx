"use client"

import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_FR,
  PRODUCT_PACKAGINGS,
  PRODUCT_PACKAGING_FR,
  PRODUCT_PACKAGING_UNIT_SHORT,
  PRODUCT_STATUS_FR,
  PRODUCT_STATUSES,
  type ProductCategory,
  type ProductPackaging,
  type ProductPhotoEntry,
  type ProductSnapshot,
  type ProductStatus,
} from "@delta/contracts/product"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

/**
 * Classes utilitaires partagées par tous les champs du formulaire
 * (cohérence visuelle avec la maquette PR-05).
 */
const INPUT_CLASS =
  "w-full h-[42px] rounded-md border-[1.5px] border-cream-200 bg-white px-3.5 font-body text-sm text-cream-950 outline-none transition-colors focus:border-green-500 focus:shadow-focus"
const SELECT_CLASS = INPUT_CLASS
const TEXTAREA_CLASS =
  "w-full min-h-24 rounded-md border-[1.5px] border-cream-200 bg-white px-3.5 py-3 font-body text-sm leading-relaxed text-cream-950 outline-none transition-colors focus:border-green-500 focus:shadow-focus"

import {
  formatEurosInput,
  parseEurosToCents,
} from "./format"
import { ProductPhotoUploader } from "./photo-uploader"
import { ProductDeleteConfirm } from "./product-delete-confirm"
import { ProductFormPreview } from "./product-form-preview"

/**
 * Formulaire création / édition produit (KAN-20 + KAN-21 — PR-05).
 *
 * Sections cohérentes avec la maquette PR-05 :
 *   1. Identité (nom, catégorie, description)
 *   2. Photos (KAN-21) — `<ProductPhotoUploader />` en mode `edit`,
 *      placeholder « Enregistrez d'abord » en mode `new`
 *   3. Prix et conditionnement (toggle « prix voisin tout compris » retiré
 *      cf. spec)
 *   4. Stock et fenêtre de disponibilité (low_stock_threshold désactivé)
 *   5. Visibilité (active / draft / disabled)
 *
 * Modes :
 *   - `new` : POST /api/v1/producer/products → redirige vers /producer/catalogue/[id]
 *   - `edit` : PATCH /api/v1/producer/products/[id] + bouton supprimer.
 *     Les photos sont écrites par les endpoints dédiés `/photos*`, pas par
 *     ce PATCH — la clé `photos` est retirée du body avant envoi.
 */

type Mode = "new" | "edit"

export type ProductFormInitial = {
  id?: string
  name: string
  description: string | null
  category: ProductCategory
  packaging: ProductPackaging
  unit_price_cents: number | null
  stock: number
  availability_from: string | null
  availability_to: string | null
  status: ProductStatus
  photos: ProductPhotoEntry[]
}

const DEFAULT_INITIAL: ProductFormInitial = {
  name: "",
  description: null,
  category: "miel_et_ruche",
  packaging: "pot_250g",
  unit_price_cents: null,
  stock: 0,
  availability_from: null,
  availability_to: null,
  status: "active",
  photos: [],
}

export function ProductForm({
  mode,
  initial,
  producerName,
  producerCity,
}: {
  mode: Mode
  initial?: ProductFormInitial
  producerName: string
  producerCity: string | null
}) {
  const router = useRouter()
  const start = initial ?? DEFAULT_INITIAL

  const [name, setName] = useState(start.name)
  const [description, setDescription] = useState(start.description ?? "")
  const [category, setCategory] = useState<ProductCategory>(start.category)
  const [packaging, setPackaging] = useState<ProductPackaging>(start.packaging)
  const [priceInput, setPriceInput] = useState<string>(
    start.unit_price_cents != null
      ? formatEurosInput(start.unit_price_cents)
      : "",
  )
  const [stock, setStock] = useState<string>(start.stock.toString())
  const [availabilityFrom, setAvailabilityFrom] = useState<string>(
    start.availability_from ?? "",
  )
  const [availabilityTo, setAvailabilityTo] = useState<string>(
    start.availability_to ?? "",
  )
  const [status, setStatus] = useState<ProductStatus>(start.status)
  const [photos, setPhotos] = useState<ProductPhotoEntry[]>(start.photos)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const parsedPriceCents = parseEurosToCents(priceInput)
  const parsedStock = (() => {
    const n = Number.parseInt(stock, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  })()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (name.trim().length === 0) {
      setError("Le nom du produit est requis.")
      return
    }
    if (parsedPriceCents == null || parsedPriceCents <= 0) {
      setError("Renseignez un prix unitaire supérieur à 0.")
      return
    }
    if (parsedStock == null) {
      setError("Le stock doit être un nombre entier ≥ 0.")
      return
    }
    if (
      availabilityFrom &&
      availabilityTo &&
      availabilityTo < availabilityFrom
    ) {
      setError("La date de fin doit être postérieure à la date de début.")
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim().length > 0 ? description.trim() : null,
        category,
        packaging,
        unit_price_cents: parsedPriceCents,
        stock: parsedStock,
        availability_from: availabilityFrom || null,
        availability_to: availabilityTo || null,
        status,
      }

      const url =
        mode === "new"
          ? "/api/v1/producer/products"
          : `/api/v1/producer/products/${initial?.id}`
      const method = mode === "new" ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
          issues?: Array<{ message: string }>
        }
        const fallback = "L'enregistrement a échoué."
        const issueMsg = payload.issues?.[0]?.message
        throw new Error(issueMsg ?? payload.error ?? fallback)
      }

      const saved = (await res.json()) as ProductSnapshot
      if (mode === "new") {
        router.push(`/producer/catalogue/${saved.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!initial?.id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/producer/products/${initial.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error ?? "La suppression a échoué.")
      }
      router.push("/producer/catalogue")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const unitShort = PRODUCT_PACKAGING_UNIT_SHORT[packaging]

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="space-y-5"
    >
      <div className="grid gap-6 desktop:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Section 1 : Identité */}
          <Section number={1} title="Identité du produit">
            <Field
              label={
                <>
                  Nom du produit <Required />
                </>
              }
              helper="Soyez précis : variété, particularité, label si pertinent."
            >
              <input
                className={INPUT_CLASS}
                type="text"
                value={name}
                maxLength={120}
                placeholder="Ex : Pommes Reine des Reinettes (bio)"
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field
              label={
                <>
                  Catégorie <Required />
                </>
              }
              className="mt-5"
            >
              <select
                className={SELECT_CLASS}
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ProductCategory)
                }
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {PRODUCT_CATEGORY_FR[c]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={
                <>
                  Description{" "}
                  <span className="text-cream-400">
                    (optionnelle mais recommandée)
                  </span>
                </>
              }
              helper="Une bonne description multiplie par 3 les chances qu'un voisin l'ajoute à ses envies."
              className="mt-5"
            >
              <textarea
                className={TEXTAREA_CLASS}
                value={description}
                maxLength={2000}
                placeholder="Comment décririez-vous votre produit à un voisin&nbsp;?"
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </Field>
          </Section>

          {/* Section 2 : Photos (KAN-21) */}
          <Section number={2} title="Photos du produit">
            {mode === "edit" && initial?.id ? (
              <ProductPhotoUploader
                productId={initial.id}
                photos={photos}
                onPhotosChange={setPhotos}
              />
            ) : (
              <p className="text-[12px] italic text-cream-500">
                Enregistrez d&apos;abord le produit pour ajouter des photos.
              </p>
            )}
          </Section>

          {/* Section 3 : Prix et conditionnement */}
          <Section number={3} title="Prix et conditionnement">
            <div className="grid gap-4 tablet:grid-cols-2">
              <Field
                label={
                  <>
                    Prix unitaire <Required />
                  </>
                }
                helper="Prix net que vous touchez : 85 % du montant (10 % rameneur, 5 % plateforme)."
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-cream-500">
                    €
                  </span>
                  <input
                    className="form-input pl-10"
                    type="text"
                    inputMode="decimal"
                    value={priceInput}
                    placeholder="0,00"
                    onChange={(e) => setPriceInput(e.target.value)}
                    required
                  />
                </div>
              </Field>
              <Field
                label={
                  <>
                    Conditionnement <Required />
                  </>
                }
              >
                <select
                  className={SELECT_CLASS}
                  value={packaging}
                  onChange={(e) =>
                    setPackaging(e.target.value as ProductPackaging)
                  }
                >
                  {PRODUCT_PACKAGINGS.map((p) => (
                    <option key={p} value={p}>
                      {PRODUCT_PACKAGING_FR[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Section 4 : Stock et disponibilité */}
          <Section number={4} title="Stock et disponibilité">
            <div className="grid gap-4 tablet:grid-cols-2">
              <Field
                label={
                  <>
                    Stock disponible <Required />
                  </>
                }
                helper="Quantité que vous pouvez fournir sans réapprovisionner."
              >
                <div className="relative">
                  <input
                    className={INPUT_CLASS}
                    type="number"
                    min={0}
                    step={1}
                    value={stock}
                    placeholder="0"
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-cream-500">
                    {unitShort}
                  </span>
                </div>
              </Field>
              <Field
                label={
                  <>
                    Seuil d&apos;alerte stock{" "}
                    <span className="text-cream-400">(Bientôt — KAN-22)</span>
                  </>
                }
                helper="Notification quand stock ≤ ce seuil."
              >
                <input
                  className="form-input opacity-50"
                  type="number"
                  disabled
                  placeholder="—"
                  readOnly
                />
              </Field>
            </div>

            <Field
              label="Fenêtre de disponibilité"
              helper="Période pendant laquelle le produit est récoltable / livrable. Hors fenêtre, il est masqué."
              className="mt-5"
            >
              <div className="flex flex-col items-stretch gap-2 tablet:flex-row tablet:items-center">
                <input
                  className={INPUT_CLASS}
                  type="date"
                  value={availabilityFrom}
                  onChange={(e) => setAvailabilityFrom(e.target.value)}
                />
                <span className="hidden font-bold text-cream-400 tablet:inline">
                  →
                </span>
                <input
                  className={INPUT_CLASS}
                  type="date"
                  value={availabilityTo}
                  onChange={(e) => setAvailabilityTo(e.target.value)}
                />
              </div>
            </Field>
          </Section>

          {/* Section 5 : Visibilité */}
          <Section number={5} title="Visibilité">
            <div className="grid gap-3 tablet:grid-cols-3">
              {PRODUCT_STATUSES.map((s) => {
                const active = s === status
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    aria-pressed={active}
                    className={`relative rounded-md border-[1.5px] px-3 py-3.5 text-center transition-colors ${
                      active
                        ? "border-green-600 bg-green-50 shadow-card"
                        : "border-cream-200 bg-cream-50 hover:border-green-300 hover:bg-green-50"
                    }`}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-green-600 text-[10px] font-bold text-white"
                      >
                        ✓
                      </span>
                    ) : null}
                    <div className="mb-1 text-2xl leading-none" aria-hidden="true">
                      {iconForStatus(s)}
                    </div>
                    <div className="text-sm font-semibold text-cream-950">
                      {PRODUCT_STATUS_FR[s]}
                    </div>
                    <div className="mt-0.5 text-[10.5px] leading-snug text-cream-500">
                      {descForStatus(s)}
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Sticky actions */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cream-200 bg-white px-5 py-3.5 shadow-elevated">
            <div className="text-xs text-cream-600">
              {mode === "new"
                ? "Votre produit sera ajouté à votre catalogue."
                : "Vos modifications seront enregistrées."}
            </div>
            <div className="flex items-center gap-2">
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting || deleting}
                  className="inline-flex h-10 items-center gap-1.5 rounded-pill border-[1.5px] border-cream-200 bg-white px-4 text-sm font-semibold text-cream-700 transition-colors hover:border-[#C75B5B] hover:text-[#C75B5B] disabled:opacity-60"
                >
                  Supprimer
                </button>
              ) : null}
              <Link
                href="/producer/catalogue"
                className="inline-flex h-10 items-center gap-1.5 rounded-pill border-[1.5px] border-cream-200 bg-white px-4 text-sm font-semibold text-cream-700 transition-colors hover:bg-cream-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-green-600 px-5 text-sm font-semibold text-white shadow-active transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement…"
                  : mode === "new"
                    ? "Créer le produit"
                    : "Enregistrer"}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              style={{
                borderColor: "#FEE2E2",
                backgroundColor: "#FEF2F2",
                color: "#B91C1C",
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <ProductFormPreview
          name={name}
          category={category}
          packaging={packaging}
          unitPriceCents={parsedPriceCents}
          producerName={producerName}
          producerCity={producerCity}
          coverPhotoUrl={photos[0]?.url ?? null}
        />
      </div>

      <ProductDeleteConfirm
        open={confirmOpen}
        productName={initial?.name ?? ""}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />

    </form>
  )
}

function Section({
  number,
  title,
  children,
  disabledBanner,
}: {
  number: number
  title: string
  children: React.ReactNode
  disabledBanner?: string
}) {
  return (
    <section className="relative rounded-lg border border-cream-200 bg-white p-6">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wider text-green-800">
          <span className="grid h-5.5 w-5.5 min-h-[22px] min-w-[22px] place-items-center rounded-full bg-green-100 text-[11px] font-bold text-green-800">
            {number}
          </span>
          {title}
        </div>
        {disabledBanner ? (
          <span className="rounded-pill border border-cream-200 bg-cream-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-500">
            {disabledBanner}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  helper,
  className,
  children,
}: {
  label: React.ReactNode
  helper?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-cream-800">
        {label}
      </label>
      {children}
      {helper ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-cream-500">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

function Required() {
  return <span className="text-earth-500">*</span>
}

function iconForStatus(s: ProductStatus): string {
  switch (s) {
    case "active":
      return "✅"
    case "draft":
      return "📝"
    case "disabled":
      return "⏸"
  }
}

function descForStatus(s: ProductStatus): string {
  switch (s) {
    case "active":
      return "Visible par les voisins"
    case "draft":
      return "Vous seul le voyez"
    case "disabled":
      return "Masqué temporairement"
  }
}
