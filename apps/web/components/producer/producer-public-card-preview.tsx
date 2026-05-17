"use client"

import {
  PRODUCER_LABEL_FR,
  type FarmPhoto,
  type ProducerLabel,
} from "@delta/contracts/producer"

/**
 * Preview "vue acheteur" du profil producteur (KAN-17, panel droit de PR-08).
 *
 * Rendu 100 % côté client à partir du state du formulaire — pas de fetch.
 * Volontairement compact (380 px de large environ) pour tenir dans la
 * colonne preview de PR-08. Sera réutilisé par AC-08bis quand KAN-53
 * (Profils publics & avis) livrera la page publique.
 *
 * L'adresse exacte (`pickup_address`) n'est JAMAIS rendue ici, par design.
 * Seul `pickup_public_zone` apparaît côté acheteur.
 */

export type ProducerPublicCardPreviewProps = {
  displayName: string | null
  description: string | null
  profilePhotoUrl: string | null
  farmPhotos: FarmPhoto[]
  labels: ProducerLabel[]
  pickupPublicZone: string | null
  siretVerified: boolean
}

export function ProducerPublicCardPreview({
  displayName,
  description,
  profilePhotoUrl,
  farmPhotos,
  labels,
  pickupPublicZone,
  siretVerified,
}: ProducerPublicCardPreviewProps) {
  return (
    <div className="rounded-[28px] bg-cream-950 p-2 shadow-elevated">
      <div className="overflow-hidden rounded-[22px] bg-cream-50">
        {/* Bandeau photo de couverture */}
        <div className="relative h-[100px] overflow-hidden bg-gradient-to-br from-earth-500 to-earth-800">
          {farmPhotos[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={farmPhotos[0].url}
              alt={farmPhotos[0].alt ?? ""}
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-2 text-[140px] opacity-20"
            >
              🌻
            </span>
          )}
        </div>

        {/* Carte identité */}
        <div className="relative mx-3.5 -mt-7 rounded-[14px] bg-white p-3.5 shadow-card">
          <div className="-mt-10 grid h-14 w-14 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-earth-100 text-[26px] shadow-subtle">
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePhotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "🌻"
            )}
          </div>
          <h2 className="mt-2 font-display text-base font-bold leading-tight text-green-900">
            {displayName ?? "Nom de la ferme"}
          </h2>
          {pickupPublicZone ? (
            <p className="mt-0.5 text-[11px] text-cream-600">
              📍 {pickupPublicZone}
            </p>
          ) : null}

          {/* Stats placeholder — alimenté plus tard par KAN-53 (avis) */}
          <div className="mt-2.5 flex gap-3.5 border-t border-cream-100 pt-2.5 text-[11px] text-cream-700">
            <div>
              <strong className="block font-display text-[15px] font-bold text-green-900">
                —
              </strong>
              Avis
            </div>
            <div>
              <strong className="block font-display text-[15px] font-bold text-green-900">
                —
              </strong>
              Commandes
            </div>
            <div>
              <strong className="block font-display text-[15px] font-bold text-green-900">
                —
              </strong>
              Produits
            </div>
          </div>
        </div>

        {/* Labels */}
        {labels.length > 0 || siretVerified ? (
          <div className="flex flex-wrap gap-1 px-3.5 pt-2">
            {siretVerified ? (
              <span className="rounded-pill border border-green-600 bg-green-100 px-2 py-[2px] text-[10px] font-semibold text-green-800">
                SIRET vérifié
              </span>
            ) : null}
            {labels.map((l) => (
              <span
                key={l}
                className="rounded-pill border border-green-600 bg-green-100 px-2 py-[2px] text-[10px] font-semibold text-green-800"
              >
                {PRODUCER_LABEL_FR[l]}
              </span>
            ))}
          </div>
        ) : null}

        {/* Description */}
        {description ? (
          <p className="px-3.5 pt-2 text-[11px] leading-relaxed text-cream-700">
            {description}
          </p>
        ) : null}

        {/* Section produits — placeholder */}
        <div className="px-3.5 pb-3.5 pt-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-cream-500">
            Produits
          </div>
          <p className="mt-1 text-[11px] text-cream-500">
            Visibles une fois le SIRET vérifié et le compte Stripe actif.
          </p>
        </div>
      </div>
    </div>
  )
}
