"use client"

import zxcvbn from "zxcvbn"
import { useMemo } from "react"

/**
 * Indicateur de force du mot de passe basé sur zxcvbn (score 0-4).
 * Affiché sous le champ password (AU-02 Signup). 5 paliers visuels :
 *  - 0 : très faible
 *  - 1 : faible
 *  - 2 : moyen
 *  - 3 : bon
 *  - 4 : fort
 *
 * Note : zxcvbn pèse ~400 KB, on l'utilise uniquement côté client. La
 * politique de mot de passe (10 + maj/min/digit) est appliquée par Zod
 * côté serveur — zxcvbn est purement informatif pour l'utilisateur.
 */
const LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Fort"] as const
const COLORS = [
  "#C0392B", // red
  "#E67E22", // orange
  "#F1C40F", // amber
  "#357F43", // green-600
  "#1E4D26", // green-800
] as const

export type PasswordStrengthProps = {
  value: string
  userInputs?: string[]
}

export function PasswordStrength({
  value,
  userInputs = [],
}: PasswordStrengthProps) {
  const score = useMemo(() => {
    if (!value) return -1
    return zxcvbn(value, userInputs).score
  }, [value, userInputs])

  if (score < 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-pill bg-cream-200"
            />
          ))}
        </div>
      </div>
    )
  }

  const clampedScore = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4
  const label = LABELS[clampedScore]
  const color = COLORS[clampedScore]

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-pill"
            style={{
              backgroundColor: i <= clampedScore ? color : "#E7E5E4",
              transition: "background-color 150ms ease",
            }}
          />
        ))}
      </div>
      <span
        className="font-body text-xs font-medium"
        style={{ color, minWidth: 64, textAlign: "right" }}
      >
        {label}
      </span>
    </div>
  )
}
