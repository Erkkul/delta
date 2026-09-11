import { MISSION_MATCH_ERROR_CODES } from "@delta/contracts/mission-match"
import {
  MissionMatchAlreadyRespondedError,
  MissionMatchExpiredError,
  MissionMatchNotFoundError,
  MissionMatchOutOfStockError,
} from "@delta/core/mission-match"
import { NextResponse } from "next/server"

/**
 * Mappe une erreur typée `core/mission-match` vers une réponse HTTP (KAN-31).
 * `null` si l'erreur n'est pas reconnue — le caller retombe alors sur un 500
 * générique.
 */
export function mapMissionMatchError(err: unknown): NextResponse | null {
  if (err instanceof MissionMatchNotFoundError) {
    return NextResponse.json(
      { error: err.message, code: MISSION_MATCH_ERROR_CODES.NotFound },
      { status: 404 },
    )
  }
  if (err instanceof MissionMatchAlreadyRespondedError) {
    return NextResponse.json(
      { error: err.message, code: MISSION_MATCH_ERROR_CODES.AlreadyResponded },
      { status: 409 },
    )
  }
  if (err instanceof MissionMatchExpiredError) {
    return NextResponse.json(
      { error: err.message, code: MISSION_MATCH_ERROR_CODES.Expired },
      { status: 409 },
    )
  }
  if (err instanceof MissionMatchOutOfStockError) {
    return NextResponse.json(
      { error: err.message, code: MISSION_MATCH_ERROR_CODES.OutOfStock },
      { status: 409 },
    )
  }
  return null
}
