"use client"

import {
  type ProducerPhotoMime,
  type ProducerPhotoUploadOutput,
} from "@delta/contracts/producer"
import { useRef, useState } from "react"

/**
 * PhotoUploader (KAN-17) — logo (1 emplacement) ou farm photo (slot 0..2).
 *
 * Pipeline :
 *   1. <input type="file"> → blob côté client
 *   2. Validation MIME (jpeg/png/webp) + taille (≤ 5 MB)
 *   3. POST /api/v1/producer/photos → { upload_url, public_url, path }
 *   4. PUT upload_url avec Content-Type exact
 *   5. onUploaded(public_url) → le parent persiste l'URL via PATCH profile
 */

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_MIMES: ReadonlyArray<ProducerPhotoMime> = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export type PhotoUploaderProps = {
  kind: "logo" | "farm"
  slot?: 0 | 1 | 2
  currentUrl?: string | null
  onUploaded: (url: string) => void
  onDeleted: () => void
  /** Texte d'aide affiché sous le bouton (ex : "Carré, ≥ 400×400 px"). */
  hint?: string
}

export function PhotoUploader({
  kind,
  slot,
  currentUrl,
  onUploaded,
  onDeleted,
  hint,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    const mime = file.type as ProducerPhotoMime
    if (!ACCEPTED_MIMES.includes(mime)) {
      setError("Format non supporté (JPG, PNG ou WebP uniquement).")
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image trop lourde (5 Mo max).")
      return
    }

    setBusy(true)
    try {
      const signed = await fetch("/api/v1/producer/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          slot,
          content_type: mime,
        }),
      })
      if (!signed.ok) {
        throw new Error("Signature upload refusée par le serveur.")
      }
      const body = (await signed.json()) as ProducerPhotoUploadOutput

      const put = await fetch(body.upload_url, {
        method: "PUT",
        headers: { "content-type": mime },
        body: file,
      })
      if (!put.ok) {
        throw new Error("Upload Storage échoué.")
      }

      onUploaded(body.public_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/v1/producer/photos", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, slot }),
      })
      if (!res.ok) {
        throw new Error("Suppression refusée.")
      }
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-md border-[1.5px] border-dashed border-cream-300 bg-cream-50 p-3.5">
      <div
        className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full bg-earth-100 text-3xl"
        aria-hidden="true"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : kind === "logo" ? (
          "🌻"
        ) : (
          "📷"
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-cream-950">
          {kind === "logo" ? "Logo de la ferme" : `Photo ${(slot ?? 0) + 1}`}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[11px] text-cream-600">{hint}</div>
        ) : null}
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-pill border border-cream-300 bg-white px-2.5 py-1.5 text-xs font-medium text-cream-700 hover:border-green-600 hover:text-green-700 disabled:opacity-50"
          >
            {busy ? "…" : currentUrl ? "Changer" : "Ajouter"}
          </button>
          {currentUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handleDelete()
              }}
              className="rounded-pill border border-[#C75B5B] bg-white px-2.5 py-1.5 text-xs font-medium text-[#C75B5B] hover:bg-[#FDEDEC] disabled:opacity-50"
            >
              Supprimer
            </button>
          ) : null}
        </div>
        {error ? (
          <div className="mt-1.5 text-[11px] text-[#C0392B]">{error}</div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = "" // permet le re-upload du même fichier
        }}
      />
    </div>
  )
}
