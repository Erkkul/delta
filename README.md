# Delta

Plateforme de produits locaux par covoiturage. Met en relation producteurs locaux, acheteurs urbains et rameneurs (particuliers en déplacement) pour acheminer des produits locaux via des trajets déjà existants.

**Statut** : conception produit, pré-développement
**Pilote envisagé** : axe Normandie ↔ Paris

---

## Organisation du dépôt

```
Delta/
├── CLAUDE.md            Contexte projet pour Claude (chargé automatiquement)
├── README.md            Ce fichier
├── .claude/             Skills, agents, settings Claude (partagés)
│
├── vision/              Stratégie, marché, positionnement
├── produit/             Spécifications produit (sitemap, flows, user stories, décisions)
├── design/              Identité visuelle, design system, maquettes HTML
├── tech/                Documentation technique (à venir)
├── legal/               CGU, CGV, RGPD (à venir)
├── business/            Modèle économique, pricing, ops (à venir)
└── code/                Code source (à venir)
    ├── backend/
    ├── mobile/
    └── web/
```

## Ordre de lecture recommandé

Pour un nouvel arrivant qui veut comprendre le projet :

1. `vision/PRD.md` — la vision et le périmètre
2. `produit/sitemap.md` — la carte des écrans
3. `produit/flow_mission.md` — le cœur fonctionnel (cycle de vie d'une mission)
4. `design/maquettes/rameneur/` — ouvrir les fichiers HTML pour voir le parcours
5. `produit/decisions/decisions_produit.md` — pour saisir l'historique des arbitrages

## Pour Claude

Le fichier `CLAUDE.md` contient le contexte synthétisé. Il est chargé automatiquement à l'ouverture du projet et fournit la liste des décisions structurantes, les conventions et un glossaire.
