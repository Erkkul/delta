# Delta

Plateforme de produits locaux par covoiturage. Met en relation producteurs locaux, acheteurs urbains et rameneurs (particuliers en déplacement) pour acheminer des produits locaux via des trajets déjà existants.

**Statut** : conception produit, pré-développement
**Déploiement** : national, tous axes ruraux-urbains

---

## Organisation du dépôt

```
Delta/
├── CLAUDE.md            Contexte projet pour Claude (chargé automatiquement)
├── README.md            Ce fichier
├── PRD.md               Spécification produit (source de vérité fonctionnelle)
├── ARCHITECTURE.md      Architecture technique (source de vérité technique)
├── DESIGN.md            Design system (tokens, composants, règles visuelles)
├── .claude/             Skills + commands + prompts Claude (versionnés). settings.local.json reste local.
├── .github/workflows/   CI/CD (lint+typecheck+build) + cron Supabase keepalive. Vercel auto-deploy via intégration GitHub native.
├── .mcp.json            Config MCP project-scope (Supabase read-only, secret hors fichier via $SUPABASE_ACCESS_TOKEN)
│
├── vision/              Stratégie, marché, positionnement
├── produit/             Spécifications produit (sitemap, flows, user stories, décisions)
├── design/              Identité visuelle, maquettes HTML
├── tech/                Documentation technique complémentaire (provisionnement, runbooks)
├── specs/               Cadrages techniques par ticket Jira (proposal/design/tasks)
├── legal/               CGU, CGV, RGPD (à venir)
├── business/            Modèle économique, pricing, ops (à venir)
│
├── apps/                web (Next.js 15, scaffold posé), mobile (Expo) — à venir
├── packages/            core, contracts, db, ui-web, ui-mobile, jobs, ...
└── supabase/            Config CLI, migrations versionnées, seeds, policies SQL
    ├── config.toml      Config locale Supabase CLI
    ├── migrations/      Migrations SQL horodatées (YYYYMMDDHHMMSS_*.sql)
    ├── seeds/           Données de seed pour environnements de dev
    └── policies/        Policies RLS Storage et SQL transverses
```

## Ordre de lecture recommandé

**Pour comprendre le produit (PM, designer, stakeholder) :**

1. `PRD.md` — la vision et le périmètre fonctionnel
2. `PRD.md` §10 — la carte des écrans (sitemap)
3. `PRD.md` §11 — le cycle de vie d'une mission
4. `design/maquettes/rameneur/` — ouvrir les fichiers HTML pour voir le parcours
5. `produit/decisions/decisions_produit.md` — historique des arbitrages produit

**Pour démarrer le développement (dev humain ou agent) :**

1. `CLAUDE.md` — contexte produit synthétisé + workflows obligatoires
2. `ARCHITECTURE.md` — stack, structure du monorepo, conventions
3. `ARCHITECTURE.md` §14 — playbook « comment ajouter une feature »
4. `DESIGN.md` — tokens et composants à respecter
5. `produit/jira_mapping.md` — quel ticket touche quel écran

## Pour Claude

Le fichier `CLAUDE.md` contient le contexte synthétisé. Il est chargé automatiquement à l'ouverture du projet et fournit la liste des décisions structurantes, les conventions et un glossaire. Pour les questions techniques (stack, où placer le code, machine à états mission, pipeline matching, free-tier), `ARCHITECTURE.md` prend le relais.
