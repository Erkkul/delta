# Tâches techniques internes — KAN-24 Labels & catégories

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [x] Consigner les décisions D1 (whitelist) et D2 (multi-select, déviation maquette) dans `specs/KAN-24/notes.md`.
- [x] Migration `20260520120000_product_labels_enum.sql` : `CREATE TYPE product_label` (6 valeurs) + swap colonne `labels` (cast conditionnel idempotent) + mise à jour du `COMMENT`.
- [x] Cast conditionnel sur `udt_name = '_text'` — sûr car la colonne ne contient que `'{}'` (feature jamais exposée).
- [x] Contrats : `PRODUCT_LABELS` / `ProductLabel` / `PRODUCT_LABEL_FR` dans `shared.ts` ; resserrer `labels` dans `create.ts` / `update.ts` / `snapshot.ts`.
- [x] `packages/db/types.ts` : typer `labels` en `ProductLabel[]` (Row/Insert/Update + entrée `Enums`). `packages/core` adapters idem. Sérialiseurs des route handlers alignés sur `ProductSnapshot["labels"]`.
- [x] Mettre à jour les fixtures de test utilisant `labels: ["Bio AB"]` (chaîne libre → clé enum).
- [x] UI : sélecteur labels multi en chips dans `product-form.tsx` + chips d'affichage dans `product-card.tsx` / `product-form-preview.tsx`.
- [x] Ajouter l'entrée au journal ARCHITECTURE.md §18 (entrée 1.26 — swap enum).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
