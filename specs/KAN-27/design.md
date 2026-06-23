# Conception technique — KAN-27 Historique commandes

## Vue d'ensemble

Page de route Next.js autonome `/acheteur/historique`, Server Component qui ne
lit que la session + le rôle (via `supabase.auth.getUser()` + `usersRepo`),
comme `/acheteur/profil` (KAN-25). Aucune table de commandes n'existant, la page
est entièrement en empty state : header, 3 stat cards désactivées, rangée de
filtres désactivée, et une section liste avec `<EmptyState />`. Aucun nouveau
endpoint, aucun use case core, aucune migration. L'enjeu : poser l'enveloppe
acheteur AC-09 et une structure de composants prête à se câbler quand
`missions` / `mission_buyers` / paiements / KAN-36 arriveront. Même posture que
KAN-19 côté producteur.

## Packages touchés

- [ ] `packages/contracts` — aucun
- [ ] `packages/core` — aucun
- [ ] `packages/db` — aucun (lecture session/rôle via `usersRepo` existant ;
      helper d'agrégation `getBuyerOrderHistory` introduit seulement quand au
      moins une table de commandes existera)
- [x] `apps/web` — page `acheteur/historique/page.tsx`, composants
      `apps/web/components/buyer/history/*`
- [ ] `apps/mobile` — hors scope
- [ ] `packages/jobs` — aucun
- [ ] `supabase/migrations` — aucune
- [ ] `supabase/policies` — aucune
- [ ] `packages/ui-web` — non (composants locaux `components/buyer/`, comme KAN-25/26)

## Modèle de données

Référence : ARCHITECTURE.md §5.

Aucune extension. Tables lues au MVP KAN-27 : `users` (rôle/gating, déjà câblé).
La page n'affiche aucune commande.

Sources futures (post-KAN-27, à câbler incrémentalement) :

- `missions` + `mission_buyers` + `products` (KAN-10 / KAN-11) → lignes de commande
- `users` + `vehicles` → résolution nom rameneur par commande
- paiements / escrow (KAN-33 / KAN-34) → montants, total dépensé
- `trips` (KAN-10) → calcul « km évités »
- KAN-36 → URL facture PDF par commande
- KAN-52 → note attribuée affichée sur chaque ligne

## API / Endpoints

Référence : ARCHITECTURE.md §3.

Aucun nouveau endpoint. Le gating session + rôle est fait en Server Component.

Quand les commandes deviendront dynamiques, deux options (décision déférée) :
1. lecture server-side directe dans la page (pattern KAN-25)
2. endpoint `GET /api/v1/me/orders?from=…&to=…&producer=…&category=…` pour
   filtres / pagination client

## Impact state machine / events

Référence : ARCHITECTURE.md §6 et §8.

Aucun. Page strictement read-only, aucune transition mission, aucun event Inngest.

## Dépendances

Référence : ARCHITECTURE.md §2. Provisionnement : `tech/setup.md`.

- **Supabase Postgres** — session + lecture `users` (déjà câblé KAN-25), cf.
  `tech/setup.md` § Supabase. Aucun nouveau service.
- **Stripe** — statut *Partiel* (`tech/setup.md` § Stripe Connect Express) ;
  KAN-27 n'appelle ni l'API Stripe ni les webhooks. Dépendance réelle quand les
  montants / factures seront câblés (KAN-33/34/36).
- Internes : gating `/acheteur/profil` (KAN-25), primitives empty state / cards
  producteur (KAN-18/19) si mutualisables, tokens DESIGN.md, icônes lucide-react.

## État UI

Référence : DESIGN.md (tokens, breakpoints), maquette
`design/maquettes/acheteur/ac-09-historique.html`.

- **`/acheteur/historique/page.tsx`** — Server Component : `getUser()` → si pas
  de session `redirect("/login")` ; charge `usersRepo.findById`, si rôle
  `acheteur` absent `redirect("/onboarding/role")` (calqué KAN-25).
- **Header** : `<h1>Historique</h1>` (Lora) + sous-titre « Toutes vos commandes
  livrées · factures téléchargeables ».
- **`<HistoryStats />`** : 3 stat cards (Commandes / Total dépensé / Km évités)
  en variant empty (valeur `—`, meta « Disponible bientôt »). Aucun chiffre
  mocké (la maquette montre 14 / 421 € / 186 — non repris).
- **`<HistoryFilters />`** : chips période / producteur / catégorie + bouton
  « Exporter CSV », tous `aria-disabled` + tooltip « Disponible une fois vos
  premières commandes enregistrées ». Pas de callback `onClick`.
- **`<HistoryList />`** : `<EmptyState />` (« Aucune commande pour l'instant.
  Vos commandes livrées apparaîtront ici. »). Pas de month-divider ni d'order-card
  au MVP. Quand câblé : regroupement par mois (divider + total), order-card
  (image produit, nom, date, producteur, rameneur, note, montant, actions
  facture PDF / recommander) — conforme maquette.
- **Responsive** : stats `repeat(3, 1fr)` desktop → empilées / 1 colonne en
  mobile (< 600 px, breakpoint maquette) ; filtres scroll horizontal sans
  scrollbar visible ; bottom-nav mobile / header desktop selon la maquette
  (la nav globale réelle viendra avec KAN-28). Mobile + desktop obligatoires.

## Risques techniques

Références : ARCHITECTURE.md §9, §11, §13.

- **Tentation de mocker des commandes** : la maquette est riche (stats chiffrées,
  5 order-cards, notes, factures). Règle KAN-18/19 reprise telle quelle —
  **aucune fixture en prod**, uniquement empty states. Les fixtures vivent dans
  les tests, pas dans le bundle.
- **Filtres / stats rendus mais inactifs** : `aria-disabled` + tooltip explicite,
  pas de fausse interaction.
- **Bouton « Facture » couplé à KAN-36** : aucune ligne au MVP → aucun bouton
  rendu, pas de dette. Penser à l'`aria-disable` au câblage si KAN-36 pas encore
  livré.
- **Action « Recommander »** : dépend du parcours d'achat (KAN-28/30/33), non
  rendue au MVP.
- **Pas de shell acheteur** : `/acheteur/historique` est autonome (URL directe),
  comme `/acheteur/profil`. La nav globale (lien vers l'historique) est branchée
  par KAN-28 — ne pas dupliquer un layout acheteur ici.
- **Bundle** : page légère (3-4 composants en empty state), cible bundle
  `/acheteur/*` respectée (ARCHITECTURE.md §11 / §13).

## Tests envisagés

Référence : ARCHITECTURE.md §10.

- **Unit `packages/core`** : aucun (pas de logique métier).
- **Unit `apps/web`** (Vitest + RTL) :
  - `<HistoryStats />` rend 3 cards en empty state (valeur `—`).
  - `<HistoryFilters />` rend les chips + « Exporter CSV » en `aria-disabled`.
  - `<HistoryList />` rend l'`<EmptyState />` avec la microcopy attendue.
- **E2E web Playwright** (`apps/web/e2e/buyer-history.spec.ts`) :
  - Acheteur connecté → `/acheteur/historique` : voit header + stats + filtres +
    empty state, sans erreur console.
  - Non-connecté → redirect `/login`.
  - Connecté sans rôle acheteur → redirect `/onboarding/role` (cohérent KAN-25,
    pas de duplication).
  - Responsive mobile (< 600 px) : stats empilées, filtres scrollables, pas de
    débordement horizontal.
- **Accessibilité** : axe-core sur `/acheteur/historique` (0 violation critique).
