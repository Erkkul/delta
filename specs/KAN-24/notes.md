# Notes d'implémentation — KAN-24

## D1 — whitelist `product_label` (arbitrée 2026-05-20)

Enum dédié `product_label`, union pertinente de la maquette PR-05 et de
`PRODUCER_LABELS` :

```
bio_ab, demeter, nature_et_progres, label_rouge, hve_3, producteur_fermier
```

Enum **distinct** de `producer_label` (certification produit ≠ certification
ferme), non-fusion documentée en commentaire SQL et dans `shared.ts`.

## D2 — multi-select (déviation maquette assumée)

La maquette PR-05 (`design/maquettes/producteur/pr-05-edition-produit.html`,
section 1) montre un `<select>` **mono-valeur** « Bio / Label ». L'implémentation
retient un **multi-select en chips** (pattern du profil producteur) :

- La colonne DB est un `text[]` / `product_label[]` (array) — un produit peut
  légitimement cumuler plusieurs labels (ex : Bio AB + Demeter).
- Cohérence avec le sélecteur de labels du profil producteur (`producer-profile-form.tsx`).

Conflit maquette ↔ modèle de données tranché en faveur du modèle (validé par le
PO le 2026-05-20). À répercuter dans la maquette PR-05 si elle est régénérée.
