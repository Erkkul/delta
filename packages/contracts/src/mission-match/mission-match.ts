import { z } from "zod"

/**
 * Contrats KAN-31 (Notification & confirmation match, écran AC-07). Ticket
 * sans lien Jira actif (projet KAN supprimé le 2026-09-11) — cf.
 * specs/KAN-31/.
 *
 * Un "match" = une row `mission_buyers` (ARCHITECTURE.md §5.3) : un acheteur
 * précis, pour un produit précis, sur une mission précise. Le statut
 * `missions` global (mission-level) n'est PAS exposé ici — seule la
 * transition individuelle de l'acheteur (`pending → accepted | declined |
 * expired`) est dans le périmètre de ce ticket (cf. specs/KAN-31/design.md
 * § Impact state machine).
 */

export const MISSION_MATCH_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
] as const
export const MissionMatchStatus = z.enum(MISSION_MATCH_STATUSES)
export type MissionMatchStatus = z.infer<typeof MissionMatchStatus>

/**
 * Réponse de `GET /api/v1/buyer/mission-matches/[id]` — tout le nécessaire
 * pour rendre AC-07 (hero, produit, acteurs, timeline, breakdown financier).
 * Prix et quantité sont des snapshots figés au moment du match (décision
 * produit D4) : jamais recalculés depuis le produit courant.
 */
export const MissionMatchDetail = z.object({
  id: z.string().uuid(),
  status: MissionMatchStatus,
  confirmationDeadline: z.string(),
  respondedAt: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  pricing: z.object({
    producerShareCents: z.number().int().nonnegative(),
    rameneurShareCents: z.number().int().nonnegative(),
    platformShareCents: z.number().int().nonnegative(),
  }),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  producer: z.object({
    userId: z.string().uuid(),
    displayName: z.string(),
    zone: z.string().nullable(),
  }),
  rameneur: z.object({
    userId: z.string().uuid(),
    displayName: z.string(),
  }),
  trip: z.object({
    originLabel: z.string(),
    destinationLabel: z.string(),
    departDate: z.string(),
  }),
})
export type MissionMatchDetail = z.infer<typeof MissionMatchDetail>

/** Codes d'erreur des endpoints mission-match. Mapping HTTP côté route handler. */
export const MISSION_MATCH_ERROR_CODES = {
  ValidationFailed: "MISSION_MATCH_VALIDATION_FAILED",
  RoleForbidden: "MISSION_MATCH_ROLE_FORBIDDEN",
  NotFound: "MISSION_MATCH_NOT_FOUND",
  AlreadyResponded: "MISSION_MATCH_ALREADY_RESPONDED",
  Expired: "MISSION_MATCH_EXPIRED",
  OutOfStock: "MISSION_MATCH_OUT_OF_STOCK",
  Unknown: "MISSION_MATCH_UNKNOWN",
} as const
export type MissionMatchErrorCode =
  (typeof MISSION_MATCH_ERROR_CODES)[keyof typeof MISSION_MATCH_ERROR_CODES]
