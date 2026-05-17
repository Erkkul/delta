# Tâches techniques internes — KAN-158 Polish UX onboarding producteur — état Stripe restricted

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [ ] Créer `packages/core/src/producer/stripe-requirements-i18n.ts` : table de mapping `Record<string, string>` (clé Stripe → label FR) + helper `translateRequirements(keys: string[]): Array<{ key, label, fallback }>` avec fallback gracieux pour les keys inconnues (log + retour du brut)
- [ ] Tests unitaires `stripe-requirements-i18n.test.ts` : ~15 keys + fallback (~20 tests)
- [ ] Étendre `apps/web/lib/stripe/client.ts` : nouvelle méthode `createAccountUpdateLink(accountId)` dans `getStripeConnectAdapter`, signature symétrique à `createAccountLink` existante mais avec `type: 'account_update'` + `collection_options: { fields: 'currently_due' }`
- [ ] Étendre `packages/core/src/producer/adapters.ts` : ajouter `createAccountUpdateLink` à `StripeConnectAdapter` (types) — apps/web et tests devront s'adapter
- [ ] Refacto `packages/core/src/producer/request-stripe-link.ts` : dispatcher entre `createConnectAccount + createAccountLink` (compte absent) ou `createAccountUpdateLink` (compte présent). Garder la signature publique du use case (`requestStripeOnboardingLink`) inchangée pour éviter de toucher l'endpoint.
- [ ] Étendre les tests unitaires du use case avec les nouvelles branches
- [ ] Créer `packages/ui-web/src/stripe-account-status-card.tsx` (composant client) : rend les 5 cas (not_created / pending / restricted-with-reqs / restricted-empty / disabled). Récupère i18n via le helper core (passé en props pour rester pur côté UI)
- [ ] Mettre à jour `packages/ui-web/src/index.ts` : exporter `StripeAccountStatusCard` + types
- [ ] Refacto `apps/web/app/(auth)/onboarding/producteur/producteur-client.tsx` : remplacer la logique `phase: WizardPhase` par un dispatch direct sur l'état producer (passé du Server Component) ; la `StripeAccountStatusCard` rend l'écran approprié quand on est à l'étape 3
- [ ] Passer la fonction `initialPhase()` du client component vers le server component (`page.tsx`) ou la simplifier — la décision « quelle étape afficher » devient purement dérivée de l'état DB
- [ ] Smoke test en preview Vercel avec un compte producteur en `restricted` (réutilisable depuis le test KAN-16)
- [ ] Mettre à jour `produit/jira_mapping.md` : ajouter `[Cadrage tech](specs/KAN-158/)` à la cellule KAN-158 du catalogue KAN-4 et à la mention dans le mapping écran PR-02 (déjà en place via PR #13)

## Notes d'implémentation

- **Pas de nouvel endpoint** — on étend `/api/v1/producer/onboarding/stripe-link` qui devient polymorphe. Plus simple côté client (un seul fetch côté UI), plus simple côté core (une seule use case avec branche interne). Si plus tard on a besoin de séparer pour des raisons de rate-limit / audit, on découpera.
- **i18n des requirements** : les keys actuellement observées dans nos tests (cf. table `stripe_webhook_events`) donnent une bonne couverture initiale. Pour les futures keys, le fallback brut + log permet de découvrir et compléter sans crasher.
- **Stripe `account_update` link** : la doc Stripe (https://docs.stripe.com/api/account_links/create) précise que `collection_options.fields = 'currently_due'` cible directement les champs en attente plutôt que de refaire tout l'onboarding. Le `return_url` et `refresh_url` restent identiques.
- **Pas de décision technique structurante** : feature purement UX/UI qui s'appuie sur les patterns existants. Pas d'entrée au journal §18 d'ARCHITECTURE.md prévue.

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
