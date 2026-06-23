# Cadrage — KAN-28 Catalogue filtré

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-28
- Epic : KAN-7 Wishlist & Matching
- Maquettes : design/maquettes/acheteur/ac-03-accueil.html,
  design/maquettes/acheteur/ac-04-catalogue.html,
  design/maquettes/acheteur/ac-05-fiche-produit.html
- PRD : §10.3 AC-03 / AC-04 / AC-05 (parcours acheteur), §12 (logique écran, H3)
- ARCHITECTURE : §3 (monorepo / API), §5 (DB / RLS), §7 (matching — différé),
  §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-28 livre la **première vue catalogue côté acheteur** sur trois écrans :
AC-03 (accueil), AC-04 (catalogue parcourable), AC-05 (fiche produit). C'est
aussi le ticket qui pose le **shell acheteur** (layout global : header desktop +
bottom-nav mobile) que KAN-25 (onboarding/zone) et KAN-27 (historique) ont
explicitement différé — leurs pages `/acheteur/*` autonomes seront rétro-wrappées
par ce layout.

Bonne nouvelle : la couche données catalogue **existe déjà**. La policy RLS
`products_select_public` (migration KAN-20) expose les produits `active` des
producteurs vérifiés (SIRET ok + payouts ON + non en pause), dans leur fenêtre de
disponibilité ; la recherche plein-texte (`search_vector` config `french` + index
GIN) et les enums catégories/labels/packaging sont en place. Les photos produit
sont un tableau jsonb public-readable sur `products`.

Le vrai blocage est ailleurs : la table `producers` n'a **que**
`producers_select_self` — aucune lecture publique. Un acheteur ne peut donc pas
lire le nom/ville du producteur pour afficher « Pierre Dupont · Évreux » sur les
cartes. KAN-28 doit introduire un **chemin de lecture publique catalogue** (vue
ou RPC) exposant une projection whitelistée produit + producteur public, qui
réutilise le prédicat de visibilité de `products_select_public`.

Tout ce qui dépend des **trajets / du matching** (badges « 3 trajets » / « Demain »,
section « Disponible cette semaine », filtres trajet/zone) n'est pas câblable :
trajets (KAN-41) et pipeline opportunités (KAN-42) n'existent pas. Même posture
qu'en KAN-19/27 : on livre l'enveloppe réelle (vrais produits, vraie recherche,
vrais filtres catégorie/producteur) et on rend l'UI dépendante du matching en état
neutre / différé.

## Périmètre technique

**In scope :**

- **Shell acheteur** `apps/web/app/acheteur/layout.tsx` (header + nav desktop,
  bottom-nav mobile), rétro-wrappe `/acheteur/profil` (KAN-25) et
  `/acheteur/historique` (KAN-27) sans régression de leur gating
- **AC-04** `/acheteur/catalogue` : grille de **vrais produits** (lecture
  publique), recherche FTS, filtres **catégorie** et **producteur** opérationnels
- **AC-03** `/acheteur` (accueil) : greeting + « Découvrir des producteurs »
  (vrais producteurs vérifiés) ; sections « Disponible cette semaine » et
  « Mes envies » rendues en état différé/empty
- **AC-05** `/acheteur/catalogue/[id]` : fiche produit réelle (lecture publique)
- **Contracts** : `CatalogueQuery` (q, category, producer, cursor, limit) +
  `CataloguePublicProduct` (projection sûre)
- **DB** : vue ou RPC de lecture publique catalogue (produit + producteur public)
  + repo `catalogueRepo`
- **API** : `GET /api/v1/catalogue` (liste filtrée + paginée, SSR initial puis
  filtrage client)

**Out of scope (cette US) :**

- Filtre de **matchabilité par trajet** (règle PRD §12 H3 : ≥ 2 trajets/30 j
  ou ≥ 1 trajet actif) — trajets KAN-41, opportunités KAN-42 inexistants
- Badges trajet/match (« 3 trajets », « Demain », « Match probable jeudi »),
  section « Disponible cette semaine » alimentée, filtres « Zone d'origine » /
  « Disponibilité » / « Trajet actif » → différés KAN-42
- Wishlist « Mes envies » + bouton cœur (ajout aux envies) → KAN-30
- Bascule état vide « zone non couverte » AC-12 → KAN-29
- Notes / avis producteur (4.9 ★) et profil public producteur → KAN-52 / KAN-53
- Version mobile native (Expo) — web d'abord, cohérent KAN-25/26/27

## Hypothèses

- Au MVP, le catalogue affiche **tous les produits publiquement visibles**
  (prédicat `products_select_public`), **sans** filtrage par trajet. Le cadre
  « Produits matchables sur votre zone » et les badges trajet deviennent différés.
  ⚠️ Écart assumé vs règle métier maquette/PRD §12 H3 — dette temporaire câblée
  par KAN-42 (à acter en décision produit si validé).
- Le filtre « Zone d'origine » est différé (la géo = couche matching, buffer
  10 km KAN-42) ; la zone acheteur (KAN-25) n'est pas encore appliquée au tri.
- La projection producteur public est limitée aux champs sûrs (nom d'affichage,
  ville) — jamais SIRET / identifiants Stripe / adresse exacte de collecte.
- Gating `/acheteur/*` = rôle `acheteur` (calqué KAN-25/27), même si la RLS
  autorise `anon` ; un catalogue public/SEO reste un sujet post-MVP.
- KAN-28 est volumineux (shell + 3 écrans + chemin de lecture publique). Si la
  charge est jugée trop forte, candidat à un découpage AC-04/05 (catalogue) /
  AC-03 (accueil) — à arbitrer, le ticket Jira restant unitaire par défaut.
