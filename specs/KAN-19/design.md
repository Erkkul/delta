# Conception technique — KAN-19 Historique ventes

## Vue d'ensemble

Page de route Next.js sous le layout `/producer` (KAN-18). Server component qui ne lit que les données déjà accessibles via les repos existants (`users.findById`, `producers.findByUserId`) et compose une page entièrement en empty state. Aucun nouveau endpoint, aucun nouveau use case core, aucune migration. L'enjeu : finir le shell producteur web (3e et dernière page après dashboard et profil/settings) et poser une structure de composants prête à se câbler quand les tables ventes arriveront.

## Packages touchés

- [ ] `packages/contracts` — aucun
- [ ] `packages/core` — aucun
- [ ] `packages/db` — aucun (lectures via repos existants ; helper d'agrégation `getProducerSalesContext` à introduire seulement quand au moins une table de ventes existe)
- [x] `apps/web` — page `producer/sales/page.tsx`, composants `apps/web/components/producer/sales/*`, mise à jour `lib/navigation/producer-nav.ts`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun
- [ ] `supabase/migrations` — aucune
- [ ] `supabase/policies` — aucune
- [ ] `packages/ui-web` — non (les composants restent dans `apps/web/components/` comme à KAN-18)

## Modèle de données

Aucune extension. Tables lues au MVP KAN-19 : aucune (page entièrement empty state).

Sources futures (post-KAN-19, à câbler incrémentalement) :

- `missions` + `mission_buyers` + `products` (KAN-10 / KAN-11) → table ventes
- `users` + `vehicles` → résolution nom rameneur dans chaque vente
- `stripe_webhook_events` filtrés `payout.*` + appels Stripe API → section virements
- `producers.stripe_account_id` (KAN-16) → lecture IBAN via Stripe API
- KAN-36 → URLs factures PDF par vente

Référence : ARCHITECTURE.md §5.3, §8.3.

## API / Endpoints

Aucun nouveau endpoint. Le layout `/producer` (KAN-18) gère déjà la session et le gating rôle.

Quand la table ventes deviendra dynamique, deux options :
1. lecture server-side direct dans la page (pattern KAN-18)
2. endpoint `GET /api/v1/producer/sales?from=…&to=…&status=…` pour permettre filtres / pagination client

Décision déférée jusqu'à arrivée des tables.

## Impact state machine / events

Aucun. Page strictement read-only.

## Dépendances

Services externes :

- **Stripe Connect** — statut *Partiel*, cf. `tech/setup.md` § Stripe Connect Express (lignes 96-126). KAN-19 n'appelle ni l'API Stripe ni les webhook events ; la dépendance sera réelle quand la section virements sera câblée.
- **Supabase Postgres** — pour la session et la lecture `producers`/`users` (déjà câblé KAN-18), cf. `tech/setup.md` § Supabase.

Internes :

- Layout `apps/web/app/producer/layout.tsx` (KAN-18) — gating session + rôle
- Composants `<KpiCard />`, `<SectionCard />`, `<EmptyState />`, `<AppSidebar />` (KAN-18) — réutilisés tels quels
- Helper `apps/web/lib/navigation/producer-nav.ts` (KAN-18) — mise à jour pour activer l'item « Ventes & virements »
- Tokens DESIGN.md (greens, cream, earth, stripe-purple, breakpoint 880 px)
- Icônes lucide-react (déjà dépendance)

## État UI

Référence : `DESIGN.md` (tokens, breakpoints), maquette `design/maquettes/producteur/pr-07-historique-ventes.html`.

- **`/producer/sales/page.tsx`** — server component, lit `users.findById` + `producers.findByUserId` (déjà fait par le layout, on peut hisser dans un helper React `cache()` si duplication observée).
- **Header** : `<h1>Historique & virements</h1>` + sous-titre statique « Toutes vos ventes et les versements Stripe Connect ». Toolbar à droite avec deux `<button aria-disabled tabIndex={0}>` (Export CSV + sélecteur de mois) — tooltip « Disponible bientôt », style atténué cohérent avec le CTA « Nouveau produit » du dashboard KAN-18.
- **`<SalesKpis />`** : grid de 4 `<KpiCard state="coming" />` (label / icône / valeur `—` / meta « Disponible bientôt »). Première carte en variant `highlight` (dégradé vert), idem maquette.
- **`<SalesTabs />`** : 4 onglets neutres « Toutes les ventes (0) / En escrow (0) / Versées (0) / Litiges (0) ». Élément racine `<div role="tablist">`, onglets focusables (`role="tab"`, `aria-selected`) mais non-actionnables tant qu'aucune vente — aucun callback `onClick`, curseur default, tooltip « Disponible une fois vos premières ventes enregistrées ».
- **`<SalesFilters />`** : 3 chips `<button aria-disabled>` (Toutes périodes / Tous produits / Tous rameneurs) avec icône chevron — même style désactivé que la toolbar.
- **`<SalesTable />`** : `<SectionCard />` qui rend `<EmptyState icon=… text="Aucune vente pour l'instant. Vos premières ventes apparaîtront ici une fois vos premières missions livrées." />`. Aucune ligne au MVP. Quand les ventes seront câblées : header de colonnes Date / Produit·Mission / Rameneur / Acheteurs / Brut / Vous (85 %) / Statut / Action — conforme maquette.
- **`<StripePayoutsSection />`** : `<SectionCard />` avec header personnalisé (logo violet `<StripeBadge />`, titre « Virements Stripe Connect », sous-titre « Vos versements apparaîtront ici »). IBAN du header **non affiché** au MVP (la valeur réelle nécessitera un appel Stripe API). Body : `<EmptyState />`.
- **Sidebar `/producer`** : `producer-nav.ts` modifié pour que l'item « Ventes & virements » passe de `disabled` à `href="/producer/sales"`. Icône et libellé identiques à la maquette.
- **Responsive** : grid KPI `repeat(4, 1fr)` ≥ 880 px, `repeat(2, 1fr)` < 880 px. Toolbar wrap. Table : padding réduit + font 12 px en mobile, scroll horizontal si la liste arrive plus tard. Section virements : payout-row passe d'horizontal à vertical empilé < 880 px.

## Risques techniques

- **Tentation de mocker des ventes** : la maquette est riche (KPIs 348 €, M-3829, IBAN partiel). Règle KAN-18 reprise telle quelle — **aucune fixture en prod**, uniquement empty states. Les fixtures vivent dans tests, pas dans le bundle.
- **Tabs / filtres rendus mais inactifs** : risque que l'utilisateur clique et ne comprenne pas. Mitigation : `aria-disabled` + tooltip explicite « Disponible une fois vos premières ventes enregistrées ». Pas de fausse interaction.
- **IBAN inexistant côté Delta** : la maquette montre « FR76 **** 2891 ». L'IBAN n'est jamais stocké côté Delta (Stripe Connect le détient, on a juste `stripe_account_id`). Décision : ne pas afficher l'IBAN au MVP (ni vrai ni masqué). À récupérer plus tard via `stripe.accounts.retrieve(stripe_account_id).external_accounts.data[0].last4` côté serveur.
- **Bouton « PDF »** : couplé à KAN-36. Aucune ligne au MVP donc aucun bouton rendu — pas de dette. À ne pas oublier d'`aria-disable` quand les premières lignes seront câblées si KAN-36 pas encore livré.
- **Double lecture session/producer** : layout + page enfant. Tolérer comme à KAN-18 (lecture cheap, RLS owner). Introduire `getProducerDashboardContext(userId)` mutualisé si la duplication devient gênante avec d'autres pages.
- **Bundle** : 5 composants UI + tabs + filters. Vérifier qu'on reste sous la cible bundle pour `/producer/*` (ARCHITECTURE.md §11 / §13).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/core`** : aucun (pas de logique métier).
- **Unit `apps/web`** (Vitest + React Testing Library) :
  - `<SalesKpis />` rend 4 cards en empty state, première en variant `highlight`.
  - `<SalesTabs />` rend 4 onglets avec compteur `(0)`, `aria-disabled="true"` sur chaque onglet, focusable au clavier mais sans callback.
  - `<SalesFilters />` rend 3 chips `aria-disabled`.
  - `<SalesTable />` rend l'`<EmptyState />` avec la microcopy attendue.
  - `<StripePayoutsSection />` rend le header Stripe (logo + titre + sous-titre) et l'`<EmptyState />`, sans afficher d'IBAN.
  - Helper `producer-nav.ts` : item « Ventes & virements » → `href="/producer/sales"` et `disabled` retiré.
- **Intégration DB** : non nécessaire.
- **E2E web Playwright** (`apps/web/e2e/producer-sales.spec.ts`) :
  - Producteur connecté navigue depuis `/producer` (sidebar) → arrive sur `/producer/sales`, voit tous les empty states sans erreur console.
  - Acheteur connecté tente d'accéder à `/producer/sales` → redirect cohérent avec le gating layout (cf. test KAN-18, pas de duplication).
  - Non-connecté → redirect `/welcome`.
  - Responsive mobile (< 880 px) : grid KPI 2 colonnes, sidebar drawer, pas de scroll horizontal sur la zone KPI ni sur les sections.
- **Accessibilité** : axe-core check sur `/producer/sales` (cible : 0 violation critique).
