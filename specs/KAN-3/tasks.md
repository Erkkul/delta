# Tâches techniques internes — KAN-3 Connexion

> Ces tâches ne sont pas dans Jira. Setup, refacto, helpers partagés, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
(aucune)

## Tâches

- [ ] Schémas Zod dans `packages/contracts/src/auth.ts` : `LoginInput`, `LoginOutput` (en complément de `SignupInput` créé par KAN-2)
- [ ] Helper `rateLimit(key, limit, windowMs)` dans `packages/core/src/rate-limit/` (basé sur Upstash) — réutilisable au-delà de l'auth
- [ ] Composant partagé `LoginForm` (logique commune) avec déclinaisons `ui-web` / `ui-mobile`
- [ ] Helper test `loginAsTestUser(role)` dans `packages/db/src/test-utils.ts` (en complément de `createTestUser` créé par KAN-2)

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
