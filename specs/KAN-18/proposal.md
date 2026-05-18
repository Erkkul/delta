# Cadrage — KAN-18 Tableau de bord producteur

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-18
- Epic : KAN-4 Profil Producteur
- Maquette : `design/maquettes/producteur/pr-03-dashboard.html`
- PRD : §10.2 PR-03 Dashboard
- ARCHITECTURE : §3 (monorepo + layouts), §5 (DB — pas d'extension propre, lecture des tables futures), §9.2 (RLS — owner-only), §14 (playbook)

## Pourquoi (côté tech)

La maquette PR-03 est riche (KPIs, pickups, ventes escrow, virement Stripe, stock, activité), mais **presque toutes les sources de données qu'elle consomme n'existent pas encore** dans le schéma : `products` (KAN-20), `missions` / `mission_events` / `mission_buyers` (KAN-10), payouts Stripe (KAN-16 a posé le compte Connect mais pas la trace des transferts), avis (KAN-53). Seules les données posées par KAN-16/17 sont disponibles aujourd'hui : `producers` (SIRET status, `paused`, profil), `users`.

Le vrai mouvement de KAN-18 est donc de livrer **l'enveloppe** :

- la **sidebar producteur globale** prévue dès PR-03 mais réutilisée par PR-04 à PR-09 (cf. note dans `apps/web/app/producer/profile/profile-client.tsx:10` qui attendait justement KAN-18) ;
- le **layout Next** `apps/web/app/producer/layout.tsx` qui factorise sidebar + topbar + responsive (burger < 880 px) pour toutes les pages producteur existantes et futures, et qui gère le **gating par rôle** (un acheteur ou un rameneur qui arrive sur `/producer/*` est redirigé vers son propre espace) ;
- la **page `/producer`** (route racine du dashboard) qui compose les sections de la maquette avec des **empty states explicites** par bloc tant que la donnée n'est pas dispo, sans inventer un schéma factice ;
- le **banner SIRET** (haut de PR-03) déjà spécifié visuellement, qui se branche sur `producers.siret_status` (déjà en DB depuis KAN-16) — première section réellement câblée.

C'est aussi la première fois qu'on pose un **layout d'espace authentifié multi-pages** côté web (le wizard onboarding ne compte pas — single-page). Les conventions posées ici (sidebar component générique, structure de slots, breakpoints, gating « rôle producteur uniquement », redirect rôle → espace correspondant) seront reprises pour l'espace acheteur (AC-*) et l'espace rameneur (RM-*) dès leurs tickets respectifs.

## Périmètre technique

**In scope :**

- Layout `apps/web/app/producer/layout.tsx` (server component) qui :
  - vérifie l'authentification (sinon redirect `/welcome`) ;
  - vérifie le rôle `producteur` sur la row `users` ; si l'utilisateur a un autre rôle, redirect vers son **espace correspondant** (`/acheteur` pour un acheteur, `/rameneur` pour un rameneur) via un helper `getRoleHomePath(roles)`. Comportement : un compte multi-rôles qui inclut `producteur` reste autorisé sur `/producer/*`. Un compte sans rôle producteur est renvoyé vers son premier rôle disponible. Au MVP, les routes `/acheteur` et `/rameneur` n'existent pas encore — le redirect aboutira à un 404 Next, acceptable et symboliquement correct (le pattern est posé, il se câblera dès l'arrivée de leurs tickets respectifs) ;
  - charge la row `producers` du caller (SIRET status, `paused`, `display_name`) une seule fois et la fournit aux pages enfants via React context client ;
  - redirige vers `/onboarding/producteur` si la row `producers` est absente ;
  - rend la sidebar + topbar mobile + slot `{children}`.
- Composant générique `<AppSidebar role="producteur" items={…} user={…} />` (client) : reçoit la liste des liens depuis le layout parent, paramétrable pour les futurs espaces. Items : Tableau de bord, Récupérations, Mes produits, Ajouter un produit, Ventes & virements, Profil public, Paramètres ; état actif basé sur `usePathname()` ; les liens vers des routes inexistantes sont visuellement présents mais `aria-disabled` + tooltip neutre (« Disponible bientôt »).
- Composant `<MobileTopbar />` : burger + logo, breakpoint < 880 px (cf. maquette ligne 132-139), ouvre la sidebar en drawer.
- Page `/producer` (`apps/web/app/producer/page.tsx`) — dashboard composé de :
  - **Header** : « Bonjour {first_name} », sous-titre statique au MVP (« Bienvenue sur votre espace producteur »), CTA « Nouveau produit » `aria-disabled` avec tooltip « Disponible bientôt ».
  - **SIRET banner** câblé sur `siret_status` (`pending` → bandeau orange « SIRET en cours de vérification », `verified` → masqué, `rejected` → bandeau rouge avec lien support, `not_submitted` → CTA « Compléter mon onboarding »).
  - **Stripe onboarding banner** (conditionnel) : si `stripe_status != 'active'`, encart « Finalisez votre compte Stripe pour publier vos produits » avec CTA vers `/onboarding/producteur`.
  - **Paused banner** (conditionnel) : si `producers.paused = true`, encart « Boutique en pause — vos produits ne sont pas visibles. Réactiver dans Paramètres ».
  - **KPI grid** (4 cards) : tous en empty state au MVP (icône grisée + libellé « Disponible bientôt »), squelette prêt à recevoir les valeurs.
  - **Sections** : « Prochaines récupérations », « Ventes en cours », « Stock à surveiller », « Prochain virement Stripe », « Activité récente » → chacune en empty state neutre, sans référence à des tickets internes.
- Refactor minimal des pages existantes `/producer/profile` et `/producer/settings` pour adopter le nouveau layout (suppression de leur `<main>` autonome dans les *-client.tsx, branchement sur le contexte producteur partagé).
- Responsive desktop + mobile obligatoire (cf. règle CLAUDE.md, breakpoints `DESIGN.md`).

**Out of scope (cette US) :**

- **Données réelles dans les KPIs / sections** : tant que les tables `missions`, `mission_events`, `products`, payouts Stripe n'existent pas, on ne câble rien. Chaque empty state est remplacé par sa source de données au fil des tickets (KAN-20 stock, KAN-10/11 missions, KAN-16+ payouts, KAN-53 avis).
- **Alertes stock producteur** : KAN-56 (feature distincte, dépend de KAN-20).
- **Notifications in-app dans la sidebar** (badge « 3 » sur Récupérations dans la maquette) : différé à KAN-55 qui exposera le compteur. Au MVP de KAN-18, pas de badge.
- **Routes `/acheteur/*` et `/rameneur/*`** : non livrées ici (leurs propres tickets). KAN-18 pose seulement le helper `getRoleHomePath` qui les référence.
- **Apps mobile** : non scaffoldé, différé global.
- **Page racine `/producer` versus `/producer/dashboard`** : on choisit `/producer` comme racine (cohérent avec `/producer/profile`, `/producer/settings`). Pas de redirect `/dashboard` → `/producer`.
- **Greeting dynamique avancé** (heure du jour, météo, etc.) : un simple « Bonjour {first_name} » suffit au MVP.
- **Personnalisation / réorganisation des sections** par l'utilisateur : non, ordre figé conforme à la maquette.

## Hypothèses

- Le `first_name` affiché provient de `users.first_name` (déjà en DB depuis KAN-2). Si null, fallback sur « Bonjour ».
- Le rôle `producteur` est lu via `users.roles` (table posée par KAN-2). Le check côté layout est une simple lecture de la session + lookup repo `users.findById(auth.uid())`.
- Pas de nouveau endpoint API : le layout serveur lit en direct via les repos `users` et `producers` déjà existants (`getProducerByUserId`).
- Pas de nouvelle migration DB. La feature est 100 % code applicatif (layout + composants + page).
- La sidebar producteur sert de **référence pour l'espace acheteur et rameneur** : on livre dès KAN-18 un composant `<AppSidebar />` générique paramétré par `{ role, items, user }` plutôt qu'un composant `<ProducerSidebar />` figé — presque le même effort, évite la refonte plus tard.
- Le contexte producteur partagé (`<ProducerContext>`) est volontairement minimaliste : `{ producer: ProducerSnapshot, user: UserSnapshot }`. Toute lecture additionnelle se fera via fetch dédié dans la page concernée, pas via extension du context.
- Les CTA / liens « Disponible bientôt » restent **visuellement présents** plutôt que masqués : un producteur en onboarding voit son futur espace, c'est cohérent avec la promesse PR-03.
- Aucun texte UI ne fait référence à un ticket interne (« KAN-XX »). Microcopy strictement orienté utilisateur final.
