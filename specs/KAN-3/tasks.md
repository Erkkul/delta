# Tâches techniques internes — KAN-3 Connexion

> Ces tâches ne sont pas dans Jira. Setup, refacto, helpers partagés, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
(aucune)

## Tâches

- [x] Schémas Zod dans `packages/contracts/src/auth.ts` : `LoginInput`, `LoginOutput` (+ `LOGIN_ERROR_CODES`). Anticipés par KAN-2, complétés + tests d'anti-énumération côté validation.
- [x] Helper `rateLimit(key, limit, windowMs, store)` dans `packages/core/src/rate-limit/` (interface `RateLimitStore` + adapter Upstash REST). Réutilisable au-delà de l'auth.
- [x] Composant `LoginForm` dans `packages/ui-web/` (web). `ui-mobile` n'existe pas encore — différé au scaffold mobile (post-MVP web).
- [ ] Helper test `loginAsTestUser(role)` dans `packages/db/src/test-utils.ts` — différé : les E2E Playwright mockent l'API via `page.route()`, pas besoin de seed DB pour KAN-3. À créer quand un test d'intégration aura besoin d'un user réel.

### Web only — portée

Cette session livre KAN-3 **web uniquement** (Apps mobile et `ui-mobile` non scaffoldés). La spec `design.md` coche `apps/mobile` et `ui-mobile` par anticipation : les mobiles seront repris au moment du scaffold `apps/mobile`. La logique commune utile (use case `loginWithEmail` dans `@delta/core`, contrats Zod, helper rate-limit) est déjà extraite et restera réutilisable.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
