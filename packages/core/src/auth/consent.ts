/**
 * Version courante des CGU/CGV et de la politique de confidentialité.
 * Le client doit acquitter ces deux versions à la création de compte
 * (US-01.09, US-01.10). La version acquittée est tracée dans
 * `users.metadata.consents` et auditable pour conformité RGPD.
 *
 * Quand le contenu CGU/RGPD change, incrémenter ces constantes et prévoir
 * un flux de re-acceptation côté UI.
 */
export const CURRENT_TERMS_VERSION = "2026-05-12"
export const CURRENT_PRIVACY_VERSION = "2026-05-12"

export type ConsentRecord = {
  termsVersion: string
  privacyVersion: string
  acceptedAt: string
}

export function buildConsentRecord(opts: {
  termsVersion: string
  privacyVersion: string
  now?: Date
}): ConsentRecord {
  const acceptedAt = (opts.now ?? new Date()).toISOString()
  return {
    termsVersion: opts.termsVersion,
    privacyVersion: opts.privacyVersion,
    acceptedAt,
  }
}
