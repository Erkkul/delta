# Cadrage — KAN-19 Historique ventes

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-19
- Epic : KAN-4 Profil Producteur
- Maquette : design/maquettes/producteur/pr-07-historique-ventes.html
- PRD : §10.2 PR-07
- ARCHITECTURE : §5 (DB lecture / RLS), §8 (Stripe Connect — payouts), §14 (playbook)

## Pourquoi (côté tech)

La page « Ventes & virements » est la dernière brique du shell producteur web après KAN-18 (dashboard) et KAN-17 (profil / paramètres). Côté produit elle expose ventes encaissées, escrow en cours, virements Stripe Connect et accès factures PDF. Côté tech, aucune des tables qui l'alimentent n'existe encore au MVP : pas de `missions`, pas de `mission_buyers`, pas d'événements `payout.paid` reçus (aucune mission livrée à ce jour). KAN-19 livre donc l'enveloppe (route, sections, composants, navigation) en **empty state**, qui se câblera incrémentalement quand KAN-10 / KAN-11 / KAN-33-34 et KAN-36 arriveront. Même approche qu'à KAN-18.

## Périmètre technique

**In scope :**

- Route `/producer/sales` sous le layout producteur posé en KAN-18 (réutilisation du gating session + rôle)
- Header `<h1>Historique & virements</h1>` + sous-titre + toolbar deux boutons (Export CSV, sélecteur de mois) en `aria-disabled` + tooltip neutre « Disponible bientôt »
- 4 KPI cards (`<KpiCard state="coming" />`) : Revenus du mois (highlight), Escrow, Versé IBAN, Commission Delta
- Onglets « Toutes / Escrow / Versées / Litiges » rendus avec compteur `(0)`, focusable mais non-cliquables tant qu'aucune donnée
- Filtres (3 chips : période / produits / rameneurs) rendus désactivés
- Section « Ventes » : `<SectionCard />` avec `<EmptyState />` (« Aucune vente pour l'instant. Vos premières ventes apparaîtront ici une fois vos premières missions livrées. »)
- Section « Virements Stripe Connect » : `<SectionCard />` avec en-tête (logo violet) + `<EmptyState />` (« Aucun virement pour l'instant. ») — IBAN non affiché (pas encore récupéré depuis Stripe)
- Activation de l'item sidebar « Ventes & virements » via `apps/web/lib/navigation/producer-nav.ts` (passe de `disabled` à `href="/producer/sales"`)

**Out of scope (cette US) :**

- Téléchargement de factures PDF (bouton « PDF » sur chaque ligne) → couvert par KAN-36
- Export CSV réel et sélecteur de mois opérationnel (rebranchés quand les ventes existeront)
- Versions mobile de l'espace producteur (cohérent avec KAN-18 : espace producteur web-only au MVP)
- Lecture cross-table `missions` / `mission_buyers` / `products` / `users` (les tables n'existent pas)
- Appels Stripe API pour récupérer IBAN et payouts (déférés au câblage)
- Écran rameneur RM-10 « Historique missions & revenus » — couvert par KAN-39

## Hypothèses

- Le producteur arrive sur `/producer/sales` via la sidebar (item désormais actif) ou par URL directe
- Aucune nouvelle table, aucune nouvelle policy RLS, aucune migration
- Composants partagés `<KpiCard />`, `<SectionCard />`, `<EmptyState />`, `<AppSidebar />` réutilisés tels qu'introduits en KAN-18
- Microcopy des empty states neutre, jamais de référence à un ticket interne
- IBAN du header section virements : caché au MVP plutôt qu'afficher la valeur fictive de la maquette (« FR76 **** 2891 »)
