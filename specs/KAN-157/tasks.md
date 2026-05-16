# Tâches techniques internes — KAN-157 Récupération de mot de passe

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [x] Extraire `passwordPolicy` (regex + hint message) de `SignupInput` vers un objet partagé dans `packages/contracts/src/auth/password-policy.ts`, importé par `SignupInput` et `ResetPasswordInput`
- [x] Ajouter `ForgotPasswordInput` et `ResetPasswordInput` dans `packages/contracts/src/auth/`
- [x] Ajouter `InvalidRecoveryTokenError` dans `packages/core/src/errors.ts` (calque de `InvalidCredentialsError`, message générique)
- [x] Ajouter use cases `requestPasswordReset` et `resetPasswordWithOtp` dans `packages/core/src/auth/`
- [x] Brancher les deux nouveaux endpoints sur le `rateLimit` Upstash existant (`packages/core/src/rate-limit/`) avec des clés et fenêtres dédiées
- [x] Refacto `LoginForm` (KAN-3) : activer le lien « Mot de passe oublié ? » → `Link` Next vers `/forgot-password`
- [x] Extraire `PasswordField` (input + strength meter + hint policy) de `SignupForm` vers `packages/ui-web/` pour le réutiliser dans `ResetPasswordForm`
- [x] Créer le composite `ResetPasswordForm` dans `packages/ui-web/` (réutilise `OtpDigits` extrait d'`OtpForm` + `PasswordField`)
- [ ] Vérifier la config Supabase Dashboard → Authentication → Email Templates → *Magic Link / Reset Password* : s'assurer que le template inclut bien le code OTP `{{ .Token }}` (et non seulement le lien) — sinon ajuster *(action ops Erkkul — pas d'accès dashboard côté Claude)*
- [x] Mettre à jour ARCHITECTURE.md §9.4 si le tableau des rate-limits doit être détaillé par sous-route auth (sinon laisser au niveau `/api/v1/auth/*`) → décision : on laisse au niveau `/api/v1/auth/*` (granularité actuelle suffisante)

## Notes d'implémentation

- **`OtpDigits` extrait d'`OtpForm`** : pour réutiliser le composant 6-cases dans `ResetPasswordForm` sans dupliquer la logique de focus/paste/keyboard nav. `OtpForm` reste inchangé pour ses consommateurs (verify-email-client.tsx) — il délègue juste à `OtpDigits` en interne. Bonus : `OtpDigits` est désormais réutilisable pour tout futur écran OTP (post-MVP).
- **Toast `?reset=ok` sur `/login`** : ajouté en complément de la spec pour donner un feedback positif après le reset (la spec mentionnait juste « toast neutre » sans en imposer la forme). Composant ajouté au `LoginClient` (testId `login-notice`).
- **Email template Supabase** : la doc Supabase confirme que la variable `{{ .Token }}` est disponible dans le template *Reset Password* — par défaut le template inclut le lien (`{{ .ConfirmationURL }}`) mais on peut ajouter le code OTP côté template. Action ops à valider côté dashboard avant test inbox réel.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
