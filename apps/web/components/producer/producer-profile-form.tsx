"use client"

import {
  PRODUCER_LABELS,
  PRODUCER_LABEL_FR,
  WEEKDAYS,
  WEEKDAY_FR,
  type FarmPhoto,
  type ProducerLabel,
  type ProducerProfileSnapshot,
  type ProducerProfileUpdateInput,
  type Weekday,
} from "@delta/contracts/producer"
import { useMemo, useState, type FormEvent } from "react"

import { AddressAutocomplete } from "./address-autocomplete"
import { PhotoUploader } from "./photo-uploader"
import { ProducerPublicCardPreview } from "./producer-public-card-preview"

/**
 * ProducerProfileForm (KAN-17) — formulaire d'édition des champs publics
 * et de l'adresse de récupération.
 *
 * Source : maquette `design/maquettes/producteur/pr-08-profil-public.html`.
 *
 * Deux modes :
 *   - `mode = "wizard"` : étape 1 du wizard `/onboarding/producteur`,
 *     bouton « Enregistrer & continuer » qui appelle `onSaved()` après PATCH.
 *   - `mode = "edit"` : édition libre depuis `/producer/profile`, bouton
 *     « Enregistrer » + preview à droite. L'autosave est désactivé au MVP
 *     (le bouton submit suffit ; on revisitera après tests UX).
 *
 * Le parent fournit le snapshot initial (`initial`) et reçoit en retour
 * le snapshot mis à jour via `onSaved(updated)`. La preview se met à jour
 * en temps réel à partir du state interne.
 */

export type ProducerProfileFormProps = {
  initial: ProducerProfileSnapshot
  mode?: "wizard" | "edit"
  onSaved?: (updated: ProducerProfileSnapshot) => void
}

type FormState = {
  display_name: string
  public_description: string
  profile_photo_url: string | null
  farm_photos: FarmPhoto[]
  labels: ProducerLabel[]
  pickup_public_zone: string
  pickup_address: string
  pickup_longitude: number | null
  pickup_latitude: number | null
  pickup_days: Weekday[]
  pickup_hours_start: string
  pickup_hours_end: string
}

const SLOTS = [0, 1, 2] as const

export function ProducerProfileForm({
  initial,
  mode = "edit",
  onSaved,
}: ProducerProfileFormProps) {
  const [state, setState] = useState<FormState>(() => toFormState(initial))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const descriptionLength = state.public_description.length

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const patch = toPatch(state, initial)
      const response = await fetch("/api/v1/producer/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const data = (await response
          .json()
          .catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Échec de l'enregistrement.")
      }
      const updated = (await response.json()) as ProducerProfileSnapshot
      setState(toFormState(updated))
      setSuccess("Profil enregistré.")
      if (onSaved) onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    } finally {
      setSubmitting(false)
    }
  }

  function toggleLabel(l: ProducerLabel) {
    setState((s) =>
      s.labels.includes(l)
        ? { ...s, labels: s.labels.filter((x) => x !== l) }
        : { ...s, labels: [...s.labels, l] },
    )
  }

  function toggleDay(d: Weekday) {
    setState((s) =>
      s.pickup_days.includes(d)
        ? { ...s, pickup_days: s.pickup_days.filter((x) => x !== d) }
        : { ...s, pickup_days: [...s.pickup_days, d] },
    )
  }

  function setFarmPhoto(index: number, url: string | null) {
    setState((s) => {
      const next = [...s.farm_photos]
      if (url === null) {
        // Suppression : on retire le slot et compacte
        next.splice(index, 1)
      } else if (next[index]) {
        next[index] = { url }
      } else {
        next.push({ url })
      }
      return { ...s, farm_photos: next }
    })
  }

  const previewCard = useMemo(
    () => (
      <ProducerPublicCardPreview
        displayName={state.display_name || null}
        description={state.public_description || null}
        profilePhotoUrl={state.profile_photo_url}
        farmPhotos={state.farm_photos}
        labels={state.labels}
        pickupPublicZone={state.pickup_public_zone || null}
        siretVerified={initial.siret_status === "verified"}
      />
    ),
    [
      state.display_name,
      state.public_description,
      state.profile_photo_url,
      state.farm_photos,
      state.labels,
      state.pickup_public_zone,
      initial.siret_status,
    ],
  )

  const isWizard = mode === "wizard"

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="grid gap-5 desktop:grid-cols-[1fr_380px]"
    >
      <div className="flex flex-col gap-4">
        {isWizard ? (
          <header>
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              Étape 1 sur 3
            </span>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight text-green-900">
              Profil de la ferme
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cream-600">
              Ces informations apparaissent côté acheteur dès que votre SIRET
              est vérifié. Vous pourrez les modifier à tout moment depuis votre
              espace producteur.
            </p>
          </header>
        ) : null}

        {/* Identité de la ferme */}
        <Section title="Identité de la ferme">
          <Field label="Photo / logo">
            <PhotoUploader
              kind="logo"
              currentUrl={state.profile_photo_url}
              onUploaded={(url) =>
                setState((s) => ({ ...s, profile_photo_url: url }))
              }
              onDeleted={() =>
                setState((s) => ({ ...s, profile_photo_url: null }))
              }
              hint="Carré, ≥ 400×400 px. JPG, PNG ou WebP."
            />
          </Field>
          <Field label="Nom de la ferme" required help="Apparaît partout sur Delta.">
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={state.display_name}
              onChange={(e) =>
                setState((s) => ({ ...s, display_name: e.target.value }))
              }
              className="w-full rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-3.5 py-3 text-sm text-cream-950 focus:border-green-600 focus:shadow-focus focus:outline-none"
            />
          </Field>
          <Field
            label="Description publique"
            help={`${descriptionLength} / 500 caractères`}
          >
            <textarea
              maxLength={500}
              value={state.public_description}
              onChange={(e) =>
                setState((s) => ({ ...s, public_description: e.target.value }))
              }
              className="min-h-[120px] w-full resize-y rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-3.5 py-3 text-sm leading-relaxed text-cream-950 focus:border-green-600 focus:shadow-focus focus:outline-none"
            />
          </Field>
          <Field label="Labels & certifications">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCER_LABELS.map((l) => {
                const active = state.labels.includes(l)
                return (
                  <button
                    type="button"
                    key={l}
                    onClick={() => toggleLabel(l)}
                    className={`rounded-pill border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? "border-green-600 bg-green-100 text-green-800"
                        : "border-cream-300 bg-cream-50 text-cream-700 hover:border-green-600 hover:text-green-700"
                    }`}
                  >
                    {PRODUCER_LABEL_FR[l]}
                  </button>
                )
              })}
            </div>
          </Field>
        </Section>

        {/* Photos de la ferme */}
        {!isWizard ? (
          <Section
            title="Photos de la ferme"
            description="3 photos max. Donne envie d'acheter."
          >
            <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
              {SLOTS.map((slot) => (
                <PhotoUploader
                  key={slot}
                  kind="farm"
                  slot={slot}
                  currentUrl={state.farm_photos[slot]?.url ?? null}
                  onUploaded={(url) => setFarmPhoto(slot, url)}
                  onDeleted={() => setFarmPhoto(slot, null)}
                />
              ))}
            </div>
          </Section>
        ) : null}

        {/* Zone & adresse */}
        <Section
          title="Zone & adresse de récupération"
          description="L'adresse exacte reste privée — elle n'est révélée qu'aux rameneurs ayant réservé une mission validée."
        >
          <Field
            label="Zone publique (commune)"
            help="Affiché sur le profil acheteur."
          >
            <input
              type="text"
              maxLength={120}
              value={state.pickup_public_zone}
              onChange={(e) =>
                setState((s) => ({ ...s, pickup_public_zone: e.target.value }))
              }
              placeholder="Bocage normand · Évreux (27)"
              className="w-full rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-3.5 py-3 text-sm text-cream-950 focus:border-green-600 focus:shadow-focus focus:outline-none"
            />
          </Field>
          <Field
            label="Adresse exacte du point de récupération"
            required={!isWizard}
            help="🔒 Privée — révélée uniquement aux rameneurs en mission validée."
          >
            <AddressAutocomplete
              value={state.pickup_address}
              onChange={(v) =>
                setState((s) => ({
                  ...s,
                  pickup_address: v,
                  // Reset coords si l'utilisateur retape — il devra resélectionner.
                  pickup_longitude: null,
                  pickup_latitude: null,
                }))
              }
              onSelect={(sug) =>
                setState((s) => ({
                  ...s,
                  pickup_address: sug.label,
                  pickup_longitude: sug.longitude,
                  pickup_latitude: sug.latitude,
                }))
              }
              required={!isWizard}
              placeholder="234 Route du Bocage, 27000 Évreux"
            />
          </Field>
          {!isWizard ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Créneaux (jours)">
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const active = state.pickup_days.includes(d)
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`rounded-pill border px-2.5 py-1 text-[11px] font-medium ${
                          active
                            ? "border-green-600 bg-green-100 text-green-800"
                            : "border-cream-300 bg-cream-50 text-cream-700"
                        }`}
                      >
                        {WEEKDAY_FR[d]}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Horaires">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={state.pickup_hours_start}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        pickup_hours_start: e.target.value,
                      }))
                    }
                    className="w-1/2 rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-2.5 py-2 text-sm text-cream-950 focus:border-green-600 focus:outline-none"
                  />
                  <span aria-hidden="true" className="text-cream-500">
                    —
                  </span>
                  <input
                    type="time"
                    value={state.pickup_hours_end}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        pickup_hours_end: e.target.value,
                      }))
                    }
                    className="w-1/2 rounded-md border-[1.5px] border-cream-300 bg-cream-50 px-2.5 py-2 text-sm text-cream-950 focus:border-green-600 focus:outline-none"
                  />
                </div>
              </Field>
            </div>
          ) : null}
        </Section>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-[#C75B5B] bg-[#FDEDEC] px-4 py-3 text-sm text-[#C0392B]"
          >
            {error}
          </div>
        ) : null}
        {success ? (
          <div
            role="status"
            className="rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {success}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-pill bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-active hover:bg-green-700 disabled:opacity-60"
          >
            {submitting
              ? "Enregistrement…"
              : isWizard
                ? "Enregistrer & continuer"
                : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Preview — masqué en mode wizard car le SIRET n'est pas encore vérifié */}
      {!isWizard ? (
        <aside className="hidden self-start desktop:sticky desktop:top-6 desktop:block">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cream-500">
            Aperçu vue acheteur
          </div>
          {previewCard}
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-cream-600">
            L&apos;adresse exacte de la ferme n&apos;apparaît jamais ici.
          </p>
        </aside>
      ) : null}
    </form>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-cream-200 bg-white p-5 shadow-card">
      <div className="mb-3.5 font-display text-base font-bold text-green-900">
        {title}
      </div>
      {description ? (
        <p className="mb-3.5 text-[11px] leading-relaxed text-cream-600">
          {description}
        </p>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cream-700">
        {label}
        {required ? <span className="text-[#C75B5B]">*</span> : null}
      </label>
      {children}
      {help ? <p className="text-[11px] text-cream-600">{help}</p> : null}
    </div>
  )
}

function toFormState(snapshot: ProducerProfileSnapshot): FormState {
  return {
    display_name: snapshot.display_name ?? "",
    public_description: snapshot.public_description ?? "",
    profile_photo_url: snapshot.profile_photo_url,
    farm_photos: snapshot.farm_photos,
    labels: snapshot.labels,
    pickup_public_zone: snapshot.pickup_public_zone ?? "",
    pickup_address: snapshot.pickup_address ?? "",
    pickup_longitude: null,
    pickup_latitude: null,
    pickup_days: snapshot.pickup_days,
    pickup_hours_start: (snapshot.pickup_hours_start ?? "").slice(0, 5),
    pickup_hours_end: (snapshot.pickup_hours_end ?? "").slice(0, 5),
  }
}

/**
 * Diff naïf : on envoie toutes les valeurs susceptibles d'avoir changé.
 * `pickup_address` est traité spécialement — si l'utilisateur a effacé le
 * champ on envoie `null` explicite ; si la valeur est inchangée, on omet.
 */
function toPatch(
  s: FormState,
  initial: ProducerProfileSnapshot,
): ProducerProfileUpdateInput {
  const patch: ProducerProfileUpdateInput = {}

  const dn = s.display_name.trim()
  if (dn !== (initial.display_name ?? "")) {
    patch.display_name = dn.length > 0 ? dn : null
  }
  const desc = s.public_description.trim()
  if (desc !== (initial.public_description ?? "")) {
    patch.public_description = desc.length > 0 ? desc : null
  }
  if (s.profile_photo_url !== (initial.profile_photo_url ?? null)) {
    patch.profile_photo_url = s.profile_photo_url
  }
  if (!arrayEqualBy(s.farm_photos, initial.farm_photos, (p) => p.url)) {
    patch.farm_photos = s.farm_photos
  }
  if (!arrayEqual(s.labels, initial.labels)) {
    patch.labels = s.labels
  }
  const pz = s.pickup_public_zone.trim()
  if (pz !== (initial.pickup_public_zone ?? "")) {
    patch.pickup_public_zone = pz.length > 0 ? pz : null
  }
  const pa = s.pickup_address.trim()
  if (pa !== (initial.pickup_address ?? "")) {
    patch.pickup_address = pa.length > 0 ? pa : null
    if (
      pa.length > 0 &&
      s.pickup_longitude !== null &&
      s.pickup_latitude !== null
    ) {
      patch.pickup_longitude = s.pickup_longitude
      patch.pickup_latitude = s.pickup_latitude
    }
  }
  if (!arrayEqual(s.pickup_days, initial.pickup_days)) {
    patch.pickup_days = s.pickup_days
  }
  const hs = s.pickup_hours_start
  if (hs !== (initial.pickup_hours_start?.slice(0, 5) ?? "")) {
    patch.pickup_hours_start = hs.length > 0 ? hs : null
  }
  const he = s.pickup_hours_end
  if (he !== (initial.pickup_hours_end?.slice(0, 5) ?? "")) {
    patch.pickup_hours_end = he.length > 0 ? he : null
  }
  return patch
}

function arrayEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function arrayEqualBy<T, K>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  key: (item: T) => K,
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (key(a[i] as T) !== key(b[i] as T)) return false
  }
  return true
}
