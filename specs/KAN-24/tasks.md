# Tâches techniques internes — KAN-24 Labels & catégories

> Ces tâches ne sont pas dans Jira. Setup, migrations, refacto, helpers partagés, seeds, configuration — tout ce qui n'a pas vocation à être tracké comme livrable produit.
>
> Subtasks Jira existantes (rappel — ne pas dupliquer ici) :
> (aucune)

## Tâches

- [ ] Consigner les décisions D1 (whitelist) et D2 (multi-select, déviation maquette) dans `specs/KAN-24/notes.md`.
- [ ] Migration `<ts>_product_labels_enum.sql` : `CREATE TYPE product_label` (6 valeurs) + swap colonne `labels` + mise à jour du `COMMENT`.
- [ ] Vérifier l'absence de valeurs hors whitelist en base avant le cast.
- [ ] Contrats : `PRODUCT_LABELS` / `ProductLabel` / `PRODUCT_LABEL_FR` dans `shared.ts` ; resserrer `labels` dans `create.ts` / `update.ts` / `snapshot.ts`.
- [ ] `packages/db/types.ts` : typer `labels` en `ProductLabel[]`.
- [ ] Mettre à jour les fixtures de test utilisant `labels: ["Bio AB"]` (chaîne libre → clé enum).
- [ ] UI : sélecteur labels multi en chips dans `product-form.tsx` + chips d'affichage dans `product-card.tsx` / `product-form-preview.tsx`.
- [ ] Ajouter l'entrée au journal ARCHITECTURE.md §18 (swap enum — décision structurante).

## Checklist pre-merge

Voir ARCHITECTURE.md §14.3 — ne pas dupliquer ici.
