"use client"

import {
  type ProductPhotoEntry,
  type ProductPhotoMime,
  type ProductPhotoUploadOutput,
  type ProductSnapshot,
} from "@delta/contracts/product"
import { useRef, useState } from "react"

/**
 * `<ProductPhotoUploader />` (KAN-21 — PR-05 section 2).
 *
 * Grille 2×2 (1 col < 540 px). Slots remplis = preview + badge couverture
 * (sur photos[0]) + actions overlay (↑ ↓ 🗑). Slot suivant = zone dashed
 * « Ajouter une photo ». Slots au-delà non rendus.
 *
 * Pipeline upload côté UI :
 *   1. validate MIME + size côté client (5 MB max, jpeg/png/webp)
 *   2. POST  /api/v1/producer/products/[id]/photos             → signature
 *   3. PUT   <upload_url>  (Content-Type exact)                → Storage
 *   4. POST  /api/v1/producer/products/[id]/photos/confirm     → persiste DB
 *
 * Reorder : PATCH /photos/reorder { from, to } à chaque clic ↑ / ↓.
 * Delete : confirmation inline (Supprimer ? Annuler) puis DELETE /photos.
 */

const MAX_PHOTOS = 4
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_MIMES: ReadonlyArray<ProductPhotoMime> = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export type ProductPhotoUploaderProps = {
  productId: string
  photos: ProductPhotoEntry[]
  onPhotosChange: (photos: ProductPhotoEntry[]) => void
}

export function ProductPhotoUploader({
  productId,
  photos,
  onPhotosChange,
}: ProductPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(
    null,
  )

  async function handleFile(file: File) {
    setError(null)
    const mime = file.type as ProductPhotoMime
    if (!ACCEPTED_MIMES.includes(mime)) {
      setError("Format non supporté (JPG, PNG ou WebP uniquement).")
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image trop lourde (5 Mo max).")
      return
    }
    if (photos.length >= MAX_PHOTOS) {
      setError("Limite de 4 photos atteinte.")
      return
    }

    setBusy(true)
    try {
      // 1. signature
      const signed = await fetch(
        `/api/v1/producer/products/${productId}/photos`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content_type: mime }),
        },
      )
      if (!signed.ok) {
        const payload = (await signed.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error ?? "Signature upload refusée.")
      }
      const sig = (await signed.json()) as ProductPhotoUploadOutput

      // 2. PUT direct vers Storage
      const put = await fetch(sig.upload_url, {
        method: "PUT",
        headers: { "content-type": mime },
        body: file,
      })
      if (!put.ok) {
        throw new Error("Upload Storage échoué.")
      }

      // 3. confirm → persiste DB
      const confirmed = await fetch(
        `/api/v1/producer/products/${productId}/photos/confirm`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path: sig.path,
            public_url: sig.public_url,
          }),
        },
      )
      if (!confirmed.ok) {
        const payload = (await confirmed.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error ?? "Échec persistance.")
      }
      const updated = (await confirmed.json()) as ProductSnapshot
      onPhotosChange(updated.photos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(index: number) {
    setError(null)
    setBusy(true)
    setConfirmDeleteIndex(null)
    try {
      const res = await fetch(
        `/api/v1/producer/products/${productId}/photos`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ index }),
        },
      )
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error ?? "Suppression refusée.")
      }
      const updated = (await res.json()) as ProductSnapshot
      onPhotosChange(updated.photos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.")
    } finally {
      setBusy(false)
    }
  }

  async function handleReorder(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(
        `/api/v1/producer/products/${productId}/photos/reorder`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ from, to }),
        },
      )
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error ?? "Réordonnement refusé.")
      }
      const updated = (await res.json()) as ProductSnapshot
      onPhotosChange(updated.photos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du réordonnement.")
    } finally {
      setBusy(false)
    }
  }

  const canAdd = photos.length < MAX_PHOTOS
  // On rend `photos.length` slots remplis + 1 slot d'ajout (si pas plein).
  const slotsCount = photos.length + (canAdd ? 1 : 0)

  return (
    <div>
      <p className="mb-3 text-[11.5px] text-cream-500">
        Une à 4 photos. La première sera utilisée comme couverture. Format
        paysage de préférence.
      </p>
      <div className="grid grid-cols-1 gap-3 mobile:grid-cols-2">
        {Array.from({ length: slotsCount }, (_, i) => {
          if (i < photos.length) {
            const photo = photos[i]
            if (!photo) return null
            return (
              <FilledSlot
                key={photo.path}
                index={i}
                photo={photo}
                isCover={i === 0}
                canMoveUp={i > 0 && !busy}
                canMoveDown={i < photos.length - 1 && !busy}
                pendingDelete={confirmDeleteIndex === i}
                onMoveUp={() => {
                  void handleReorder(i, i - 1)
                }}
                onMoveDown={() => {
                  void handleReorder(i, i + 1)
                }}
                onAskDelete={() => setConfirmDeleteIndex(i)}
                onCancelDelete={() => setConfirmDeleteIndex(null)}
                onConfirmDelete={() => {
                  void handleDelete(i)
                }}
              />
            )
          }
          return (
            <button
              key="add-slot"
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-cream-300 bg-cream-50 px-2 text-center text-xs text-cream-500 transition-colors hover:border-green-400 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{busy ? "Envoi…" : "Ajouter une photo"}</span>
            </button>
          )
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />

      {error ? (
        <div
          role="alert"
          className="mt-2.5 text-[11.5px] font-medium"
          style={{ color: "#C0392B" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}

function FilledSlot({
  index,
  photo,
  isCover,
  canMoveUp,
  canMoveDown,
  pendingDelete,
  onMoveUp,
  onMoveDown,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  index: number
  photo: ProductPhotoEntry
  isCover: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  pendingDelete: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-md border border-cream-200 bg-earth-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt ?? `Photo ${index + 1}`}
        className="h-full w-full object-cover"
      />
      {isCover ? (
        <span className="absolute bottom-2 left-2 rounded-pill bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Couverture
        </span>
      ) : null}
      <div className="absolute right-2 top-2 flex gap-1">
        <SlotActionButton
          title="Monter"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          ariaLabel={`Déplacer la photo ${index + 1} vers le haut`}
        >
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </SlotActionButton>
        <SlotActionButton
          title="Descendre"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          ariaLabel={`Déplacer la photo ${index + 1} vers le bas`}
        >
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </SlotActionButton>
        <SlotActionButton
          title="Supprimer"
          onClick={onAskDelete}
          danger
          ariaLabel={`Supprimer la photo ${index + 1}`}
        >
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
            />
          </svg>
        </SlotActionButton>
      </div>

      {pendingDelete ? (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-md bg-white/95 px-2 py-1.5 text-[11px] shadow-elevated">
          <span className="font-medium text-cream-900">Supprimer ?</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCancelDelete}
              className="rounded px-2 py-0.5 text-cream-600 hover:bg-cream-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="rounded bg-[#C75B5B] px-2 py-0.5 font-semibold text-white hover:bg-[#B53D3D]"
            >
              Oui
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SlotActionButton({
  title,
  disabled,
  danger,
  ariaLabel,
  onClick,
  children,
}: {
  title: string
  disabled?: boolean
  danger?: boolean
  ariaLabel: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded-md bg-white/90 text-cream-700 backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "hover:bg-white hover:text-[#C0392B]" : "hover:bg-white hover:text-green-700"
      }`}
    >
      {children}
    </button>
  )
}
