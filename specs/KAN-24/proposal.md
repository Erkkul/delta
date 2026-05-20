# Cadrage — KAN-24 Labels & catégories

## Liens

- Jira : https://erkulaws.atlassian.net/browse/KAN-24
- Epic : KAN-5 Catalogue
- Maquette : design/maquettes/producteur/pr-05-edition-produit.html (section 1 « Identité », champs Catégorie + Bio/Label)
- PRD : §10.3 (sitemap producteur, écran PR-05)
- ARCHITECTURE : §5 (DB — swap enum), §3 (contrats Zod), §10 (tests), §14 (playbook), §18 (journal — entrée à ajouter)

## Pourquoi (côté tech)

KAN-20 a livré la table `products` avec toutes les colonnes de l'épic pré-créées. La **catégorie** est déjà entièrement câblée (enum `product_category`, select requis, libellés FR + emoji). KAN-24 finit le câblage des **labels / certifications** : la colonne `labels` est aujourd'hui un `text[] DEFAULT '{}'` non exposé dans l'UI. La décision documentée (ARCHITECTURE §18 entrée 1.22, commentaires de migration) prévoit que KAN-24 fige la whitelist en enum `product_label`, swap la colonne `text[]` → `product_label[]`, propage le type dans les contrats / use cases / repo, et ajoute le sélecteur de labels manquant au formulaire PR-05.

## Périmètre technique

**In scope :**

- Définir l'enum `product_label` (whitelist figée — voir Décisions D1) côté DB + contrats.
- Migration : swap `products.labels` de `text[]` → `product_label[]` (cast des valeurs existantes, `NOT NULL DEFAULT '{}'`).
- Contrats Zod : remplacer `labels: z.array(z.string()…)` par `z.array(ProductLabel)` dans `create.ts` / `update.ts` / `snapshot.ts`, ajouter `PRODUCT_LABEL_FR`.
- UI PR-05 : ajouter le sélecteur de labels (section 1) absent du formulaire actuel — multi-select en chips (voir Décisions D2).
- Affichage des labels en chips sur la card produit (PR-04) et la preview voisin (PR-05).
- Tests : unit contracts (whitelist acceptée / refusée), unit core (propagation), unit display.

**Out of scope (cette US) :**

- **Catégorie** : déjà livrée par KAN-20 (rien à refaire).
- Filtre par catégorie / label dans le catalogue acheteur (KAN-28) ou producteur.
- Gestion d'une table `categories` dynamique (post-MVP, mentionnée dans le commentaire SQL de KAN-20).
- Mobile (cohérent KAN-20/21/22/23).

## Décisions (arbitrées 2026-05-20)

- **D1 — whitelist `product_label`** : enum dédié = union pertinente de la maquette PR-05 (`Bio AB / Demeter / Nature & Progrès / Label Rouge`) et de `PRODUCER_LABELS` (`bio_ab / demeter / nature_et_progres / hve_3 / producteur_fermier`) → `bio_ab, demeter, nature_et_progres, label_rouge, hve_3, producteur_fermier` (6 valeurs). Enum **distinct** de `ProducerLabel` (label produit ≠ certification ferme, même si recouvrement) — à documenter en commentaire pour éviter une fausse duplication.
- **D2 — multi-select** : un produit peut cumuler plusieurs labels (ex : Bio AB + Demeter), conforme à la colonne `text[]`/array. Rendu chips multi-select (pattern du profil producteur). La maquette PR-05 montre un `select` mono-valeur — déviation assumée, à consigner dans `specs/KAN-24/notes.md` au moment de l'implémentation.

## Hypothèses

- Pas d'event Inngest, pas d'impact state machine, pas de nouveau service externe.
- La colonne `labels` ne contient que `'{}'` en base (feature jamais exposée) — cast de migration sans risque.
