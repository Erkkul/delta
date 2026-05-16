# Tâches techniques internes — KAN-157 Récupération de mot de passe

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [ ] Extraire `passwordPolicy` (regex + hint message) de `SignupInput` vers un objet partagé dans `packages/contracts/src/auth/password-policy.ts`, importé par `SignupInput` et `ResetPasswordInput`
- [ ] Ajouter `ForgotPasswordInput` et `ResetPasswordInput` dans `packages/contracts/src/auth/`
- [ ] Ajouter `InvalidRecoveryTokenError` dans `packages/core/src/errors.ts` (calque de `InvalidCredentialsError`, message générique)
- [ ] Ajouter use cases `requestPasswordReset` et `resetPasswordWithOtp` dans `packages/core/src/auth/`
- [ ] Brancher les deux nouveaux endpoints sur le `rateLimit` Upstash existant (`packages/core/src/rate-limit/`) avec des clés et fenêtres dédiées
- [ ] Refacto `LoginForm` (KAN-3) : activer le lien « Mot de passe oublié ? » → `Link` Next vers `/forgot-password`
- [ ] Extraire `PasswordField` (input + strength meter + hint policy) de `SignupForm` vers `packages/ui-web/` pour le réutiliser dans `ResetPasswordForm`
- [ ] Créer le composite `ResetPasswordForm` dans `packages/ui-web/` (réutilise `OtpForm` + `PasswordField`)
- [ ] Vérifier la config Supabase Dashboard → Authentication → Email Templates → *Magic Link / Reset Password* : s'assurer que le template inclut bien le code OTP `{{ .Token }}` (et non seulement le lien) — sinon ajuster
- [ ] Mettre à jour ARCHITECTURE.md §9.4 si le tableau des rate-limits doit être détaillé par sous-route auth (sinon laisser au niveau `/api/v1/auth/*`)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
