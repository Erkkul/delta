/**
 * Sérialise une erreur pour pino/console.error de façon utile, peu importe
 * sa nature (Error JS, erreur Supabase / PostgREST, AuthError, plain object).
 *
 * Motivation : `String(supabaseError)` donne `[object Object]`, et
 * `instanceof Error` est `false` pour la plupart des erreurs Supabase →
 * sans ça on perd le code Postgres (`42703 column does not exist`,
 * `23505 unique violation`, etc.) qui est l'info la plus utile.
 *
 * Garde tout petit : pas d'inspection deep, pas de stack si non-Error,
 * pour que la ligne reste exploitable dans Vercel Logs.
 */
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // stack tronqué — utile pour pointer le fichier, pas le besoin du dump complet
      stack: err.stack?.split("\n").slice(0, 4).join("\n"),
    }
  }
  if (err !== null && typeof err === "object") {
    // Erreurs Supabase/PostgREST : { code, message, details, hint }
    // AuthError Supabase : { status, code, message }
    // On copie les clés énumérables — pas d'introspection profonde.
    return { ...err }
  }
  return { value: String(err) }
}
