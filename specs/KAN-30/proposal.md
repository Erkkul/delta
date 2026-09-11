# Cadrage — KAN-30 Wishlist privée

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-30
- Epic : KAN-7 Wishlist & Matching
- Maquettes : design/maquettes/acheteur/ac-06-mes-envies.html,
  design/maquettes/acheteur/ac-05-fiche-produit.html
- PRD : §10.3 AC-05 / AC-06 (parcours acheteur), §12 (statuts d'envie)
- ARCHITECTURE : §3 (monorepo / API), §5 (DB / RLS), §7 (matching — consommateur,
  différé), §10 (tests), §14 (playbook)

## Pourquoi (côté tech)

KAN-30 pose la **première table de demande acheteur** : la wishlist privée
(« Mes envies »). C'est le pendant écrivable du catalogue lecture-seule livré par
KAN-28 : l'acheteur ajoute un produit précis d'un producteur précis à ses envies
depuis la fiche AC-05 (bouton « Ajouter à mes envies »), les retrouve et les
gère sur AC-06, sans paiement ni engagement. La wishlist est **privée** (décision
2026-05-01) : aucune exposition publique, elle alimentera plus tard le matching
côté serveur (KAN-42) qui n'existe pas encore.

Le mouvement principal est un CRUD minimal sur une nouvelle table
`public.wishlist_items` (miroir du pattern `buyer_profiles` de KAN-25 : RLS
forcée, accès strictement `auth.uid() = user_id`), + le câblage du bouton toggle
sur AC-05 et de l'écran de gestion AC-06. La projection d'affichage des cartes
AC-06 (nom produit, producteur, zone, photo) **réutilise la vue
`public.catalogue_products`** livrée par KAN-28 — pas de nouvelle lecture
publique à créer.

Comme en KAN-28, la maquette est en avance sur les couches disponibles : les
statuts d'envie `matchable` (« Match probable cette semaine »), `matched`
(« Confirmation requise ») et `confirmed` dépendent des trajets (KAN-41), du
pipeline opportunités (KAN-42) et de la confirmation de match (KAN-31), tous
inexistants. KAN-30 livre donc l'enveloppe réelle (ajout / retrait / liste,
plafond, compteur) et rend toute envie en état `pending` (« En attente d'un
rameneur ») ; les sections `matchable`/`matched` et les onglets de filtrage par
statut sont rendus en état différé/inerte.

## Périmètre technique

**In scope :**

- **Table** `public.wishlist_items` (user_id, product_id, created_at, deleted_at)
  + RLS forcée self-only + contrainte d'unicité (user_id, product_id) sur les
  envies actives
- **Plafond 20 envies actives** appliqué côté serveur (règle métier, pas
  seulement UI) — refus explicite au-delà
- **AC-05** : bouton « Ajouter à mes envies » → **toggle** (ajout / retrait),
  état plein/vide reflétant la présence en wishlist (icône cœur header + CTA)
- **AC-06** `/acheteur/envies` : liste des envies réelles de l'acheteur
  (projection via `catalogue_products`), compteur « N envies sur 20 max »,
  retrait d'une envie, empty state + CTA « Parcourir le catalogue »
- **Contracts** : `WishlistAddInput` (productId), `WishlistItem` (projection
  carte), `WishlistPage` + codes d'erreur
- **DB** : repo `wishlistRepo` (list / add / remove / count) dans `packages/db`
- **API** : `GET /api/v1/wishlist`, `POST /api/v1/wishlist`,
  `DELETE /api/v1/wishlist/{productId}`
- **Câblage nav** : badge « Envies » et lien « Mes envies » du shell acheteur
  (rendus inertes en KAN-28) pointent désormais vers AC-06

**Out of scope (cette US) :**

- Statuts `matchable` / `matched` / `confirmed` et sections associées de AC-06
  (« Match probable », « Confirmation requise ») → dépendent de KAN-42 / KAN-31
- Onglets de filtrage par statut (« À confirmer », « Probable », « En attente »)
  autres que la vue « Toutes » → différés KAN-42
- Notification « un rameneur peut vous le ramener » → KAN-31 / KAN-54 / KAN-55
- Confirmation + paiement du match (AC-07 / AC-07b) → KAN-31 / KAN-33
- Prix figé : rappel décision D4, le prix appliqué est celui du match (KAN-31),
  pas celui de l'ajout — aucun montant n'est stocké dans `wishlist_items`
- Version mobile native (Expo) — web d'abord, cohérent KAN-25 → KAN-28

## Hypothèses

- Une envie = **un produit précis d'un producteur précis** (décision D1
  2026-05-01), donc `wishlist_items.product_id` FK vers `products.id`. Pas
  d'envie générique (« je veux du miel ») au MVP.
- Toute envie créée par KAN-30 est en état logique `pending`. L'état affiché
  n'est pas persisté dans `wishlist_items` : il sera **dérivé** par le matching
  (KAN-42) à la lecture. KAN-30 ne stocke donc pas de colonne `status`.
- Le plafond de 20 envies actives est une **règle métier serveur** (compté sur
  `deleted_at IS NULL`), l'UI n'étant qu'un miroir.
- L'affichage AC-06 réutilise `catalogue_products` : une envie dont le produit
  n'est plus publiquement visible (producteur en pause, produit `disabled`,
  hors fenêtre dispo) **n'apparaît pas** dans la jointure. Comportement à acter
  (masquer vs. afficher grisé « indisponible ») — proposition : masquer au MVP,
  l'envie restant en base (voir Risques).
- Gating `/acheteur/envies` = rôle `acheteur` via le shell (layout KAN-28).
- Suppression = **soft delete** (`deleted_at`), cohérent avec le reste du repo
  (RGPD, corbeille). Le retrait puis ré-ajout d'un même produit réutilise ou
  recrée une row selon la contrainte d'unicité (à trancher à l'implémentation).
